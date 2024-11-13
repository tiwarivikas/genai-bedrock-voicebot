// tools/user-profile-manager.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

// Tool definition object following the structure from workflow.js
const userProfileTool = {
  name: "manageUserProfile",
  description:
    "Set or retrieve user profile information using mobile number as identifier",
  InputParams: [
    {
      name: "mobileNumber",
      type: "string",
      description:
        "User's mobile number (required for both set and get operations)",
      required: true,
      inputPrompt: "Please provide the user's mobile number",
    },
    {
      name: "profileData",
      type: "object",
      description: "User profile information (required for set operation)",
      required: false,
      inputPrompt: "Please provide the user profile data as an object",
    },
  ],
};

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function setUserProfile(mobileNumber, profileData) {
  try {
    const command = new PutCommand({
      TableName: process.env.userProfileTableName,
      Item: {
        mobileNumber: mobileNumber,
        ...profileData,
        updatedAt: new Date().toISOString(),
      },
    });

    await docClient.send(command);
    return {
      success: true,
      message: "User profile updated successfully",
    };
  } catch (error) {
    console.error("Error setting user profile:", error);
    throw new Error(`Failed to set user profile: ${error.message}`);
  }
}

async function getUserProfile(mobileNumber) {
  try {
    const command = new GetCommand({
      TableName: process.env.userProfileTableName,
      Key: {
        mobileNumber: mobileNumber,
      },
    });

    const response = await docClient.send(command);
    return response.Item || null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw new Error(`Failed to get user profile: ${error.message}`);
  }
}

async function executeUserProfileTool(params, context) {
  const { mobileNumber, profileData } = params;

  if (!mobileNumber) {
    throw new Error("Mobile number is required");
  }

  // If profileData is provided, set the profile, otherwise get the profile
  if (profileData) {
    return await setUserProfile(mobileNumber, profileData);
  } else {
    return await getUserProfile(mobileNumber);
  }
}

module.exports = {
  userProfileTool,
  executeUserProfileTool,
};
