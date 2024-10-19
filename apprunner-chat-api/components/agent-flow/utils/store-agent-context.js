const uuid = require("uuid");

async function storeAgentContext(context) {
  //ToDo: Store stateInfo in DynamoDB
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const {
    DynamoDBDocumentClient,
    PutCommand,
  } = require("@aws-sdk/lib-dynamodb");

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  // Add TTL of 1 hour for DynamoDB record
  const ttlInSeconds = Math.floor(Date.now() / 1000) + 3600; // Current time + 1 hour
  context.ttl = ttlInSeconds;
  if (context.contextId == null) {
    context.contextId = uuid.v4();
  }

  const command = new PutCommand({
    TableName: process.env.agentContextDDBTableName,
    Item: context,
  });

  const response = await docClient.send(command);
  return response;
}

async function retrieveAgentContext(contextId) {
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const {
    DynamoDBDocumentClient,
    GetCommand,
  } = require("@aws-sdk/lib-dynamodb");

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  const command = new GetCommand({
    TableName: process.env.agentContextDDBTableName,
    Key: { contextId: contextId },
  });

  const response = await docClient.send(command);
  return response.Item;
}

module.exports = {
  storeAgentContext,
  retrieveAgentContext,
};
