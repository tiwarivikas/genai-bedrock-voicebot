const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();
const lambda = new AWS.Lambda();
const bedrock = new AWS.Bedrock();

async function retrievePreviousState() {
  return dynamodb
    .getItem({
      TableName: "MyDynamoDBTable",
      Key: {
        Column: { S: "MyEntry" },
      },
    })
    .promise();
}

async function retrieveAvailableTools() {
  return dynamodb
    .query({
      TableName: "MyData",
    })
    .promise();
}

async function invokeBedrockModel(prompt) {
  return bedrock
    .invokeModel({
      ModelId:
        "arn:aws:bedrock:ap-south-1::foundation-model/mistral.mixtral-8x7b-instruct-v0:1",
      Body: {
        prompt: prompt,
        max_tokens: 4096,
        stop: [],
        temperature: 0,
        top_p: 1,
        top_k: 1,
      },
    })
    .promise();
}

async function invokeLambdaFunction(functionName, payload) {
  return lambda
    .invoke({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    })
    .promise();
}

async function persistCurrentState(state) {
  return dynamodb
    .putItem({
      TableName: "MyDynamoDBTable",
      Item: {
        Column: { S: "MyEntry" },
        State: { S: JSON.stringify(state) },
      },
    })
    .promise();
}

module.exports = {
  retrievePreviousState,
  retrieveAvailableTools,
  invokeBedrockModel,
  invokeLambdaFunction,
  persistCurrentState,
};
