async function queryAvailableTools(appId) {
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const {
    DynamoDBDocumentClient,
    QueryCommand,
  } = require("@aws-sdk/lib-dynamodb");

  async function queryAvailableTools(appId) {
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);

    const command = new QueryCommand({
      TableName: process.env.toolsDDBTableName,
      IndexName: "byAppId",
      KeyConditionExpression: "appId = :appId",
      ExpressionAttributeValues: {
        ":appId": appId,
      },
      ConsistentRead: false,
    });

    const response = await docClient.send(command);
    return response.Items;
  }
}

async function storeTools(appId, tools) {
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const {
    DynamoDBDocumentClient,
    PutCommand,
  } = require("@aws-sdk/lib-dynamodb");

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  const command = new PutCommand({
    TableName: process.env.toolsDDBTableName,
    Item: {
      appId: appId,
      tools: tools,
    },
  });

  const response = await docClient.send(command);
  return response;
}

module.exports = {
  queryAvailableTools,
  storeTools,
};
