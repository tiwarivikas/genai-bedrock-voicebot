const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function generateOTP(phoneNumber) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expirationTime = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

  const command = new PutCommand({
    TableName: process.env.otpTableName,
    Item: {
      phoneNumber: phoneNumber,
      otp: otp,
      expirationTime: expirationTime,
    },
  });

  await docClient.send(command);
  return otp;
}

async function validateOTP(phoneNumber, userProvidedOTP) {
  const command = new GetCommand({
    TableName: process.env.otpTableName,
    Key: {
      phoneNumber: phoneNumber,
    },
  });

  const response = await docClient.send(command);
  const item = response.Item;

  if (!item) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime > item.expirationTime) {
    return false;
  }

  return item.otp === userProvidedOTP;
}

module.exports = {
  name: "OTP Validation",
  description:
    "Generate and validate One-Time Passwords (OTP) for mobile number verification",
  execute: async function (params) {
    if (params.action === "generate") {
      const otp = await generateOTP(params.phoneNumber);
      return { success: true, message: `OTP sent to ${params.phoneNumber}` };
    } else if (params.action === "validate") {
      const isValid = await validateOTP(params.phoneNumber, params.otp);
      return {
        success: isValid,
        message: isValid ? "OTP validated successfully" : "Invalid OTP",
      };
    } else {
      return { success: false, message: "Invalid action" };
    }
  },
  InputParams: [
    {
      name: "action",
      type: "string",
      description: "Action to perform: 'generate' or 'validate'",
      required: true,
      inputPrompt: "Do you want to generate or validate an OTP?",
    },
    {
      name: "phoneNumber",
      type: "string",
      description: "Phone number for OTP generation or validation",
      required: true,
      inputPrompt: "Please provide the phone number",
    },
    {
      name: "otp",
      type: "string",
      description: "OTP provided by the user for validation",
      required: false,
      inputPrompt: "Please enter the OTP you received",
    },
  ],
};
