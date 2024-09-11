import * as jwt from "jsonwebtoken";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand as DDBQueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DeleteDataSourceCommand, DescribeIndexCommand, KendraClient, ListDataSourceSyncJobsCommand } from "@aws-sdk/client-kendra";

export const handler = async function (
  event: any,
  context: any,
  callback: any,
) {
  var res: any = {
    statusCode: 200,
    headers: {
      "Content-Type": "*/*",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };

  // Check if the request method is OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ message: "OPTIONS request received" }),
    };
  }
  //console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const inputVars: any = JSON.parse(event.body);

    if (!inputVars || !inputVars.type) {
      throw Error("Input parameters not received.");
    }

    const content: any = inputVars.content;

    switch (inputVars.type) {
      case "refreshToken":

        //Create JWT Token
        const secretKey: string = process.env.JWT_SECRET || '';
        delete content.token
        const token = jwt.sign(content, secretKey, {
          expiresIn: "7" + "d", // Token expiration time
        });

        //Write to URL Shortener
        let urlShortenerResult = ""
        const redirectURL = process.env.CHAT_PROD_API + token
        if (content.applicationIdQ) {
          urlShortenerResult = await urlShortenerDDB(content.applicationIdQ, redirectURL)
        }
        const { status: updatedStatus, indexedDocs: updatedIndexedDocs } = await getIndexedDocumentCount(content.applicationIdQ)

        //Send final response with Q Application ID
        res.body = JSON.stringify({
          token: token,
          indexedPages: updatedIndexedDocs,
          status: updatedStatus
        });
        callback(null, res);
        break;
      case "deleteQApplication":
        const respDelete = deleteKendraDataSource(content.applicationIdQ)
        console.log(respDelete);
        callback(null, res);
        break;
      case "getIndexingStatus":
        const { status, indexedDocs } = await getIndexedDocumentCount(content.applicationIdQ)
        res.body = JSON.stringify({
          indexedPages: indexedDocs,
          status: status
        });
        callback(null, res);
        break;
      case "getTotalKendraIndexedDocs":
        const indexId = process.env.KENDRA_INDEXID
        const kendraClient = new KendraClient({  });
        const input = {
          Id: indexId,
        };
        const command = new DescribeIndexCommand(input);
        const response = await kendraClient.send(command);
        const totalKendraIndexedDocs = response?.IndexStatistics?.TextDocumentStatistics?.IndexedTextDocumentsCount
        res.body = JSON.stringify({
          totalKendraIndexedDocs: totalKendraIndexedDocs,
        });
        callback(null, res);
        break;
      case "listConversations":
        //List conversations by Application ID
        const result_conversations = await queryConversastionsByAppId(inputVars.content)
        res.body = JSON.stringify({
          items: result_conversations
        });

        callback(null, res);
        break;
      case "loadConversation":
        //List conversations by Application ID
        const result_conversationId = await queryMessagesByConversastionId(inputVars.content)
        res.body = JSON.stringify({
          items: result_conversationId
        });

        callback(null, res);
        break;
    }
  } catch (error) {
    console.log(error);
    res.statusCode = 500;
    res.body = JSON.stringify({
      error: error,
    });
    callback(null, res);
    return; // exit early, no need to continue.
  }
};

async function queryConversastionsByAppId(appId: string) {
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  const command = new DDBQueryCommand({
    TableName: process.env.DDBTable_ConversationsList,
    KeyConditionExpression:
      "appId = :appId",
    ExpressionAttributeValues: {
      ":appId": appId
    },
    ConsistentRead: false,
  });

  const response = await docClient.send(command);
  console.log(response);
  return response.Items;
}

async function queryMessagesByConversastionId(conversationId: string) {
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  const command = new DDBQueryCommand({
    TableName: process.env.conversationDDBTableName,
    IndexName: "byConversationId",
    KeyConditionExpression:
      "conversationId = :conversationId",
    ExpressionAttributeValues: {
      ":conversationId": conversationId
    },
    ConsistentRead: false,
  });

  const response = await docClient.send(command);
  console.log(response);
  return response.Items;
}

//Write async function to delete Kendra data source based on provided id as parameter
async function deleteKendraDataSource(id: string) {
  const indexId = process.env.KENDRA_INDEXID
  const kendraClient = new KendraClient({  });

  const deleteCommand = new DeleteDataSourceCommand({
    Id: id,
    IndexId: indexId,
  });

  try {
    const response = await kendraClient.send(deleteCommand);
  } catch (err) {
    console.error(err);
  }
}

//write async function to retrieve indexed document count for a Data Source in Kendra Index from ListDataSourceSyncJobsCommand 
//and return the count as a number.
async function getIndexedDocumentCount(id: string) {
  let indexedDocs = 0;
  const indexId = process.env.KENDRA_INDEXID
  const kendraClient = new KendraClient({  });

  const listCommand = new ListDataSourceSyncJobsCommand({
    Id: id,
    IndexId: indexId,
    MaxResults: 1
  });
  const response = await kendraClient.send(listCommand);
  console.log(response)

  if (response && response.History && response.History.length > 0) {
    const metrics = response.History[0].Metrics
    indexedDocs = parseInt(metrics?.DocumentsAdded || "0") + parseInt(metrics?.DocumentsModified || "0")
    return ({ status: response.History[0].Status, indexedDocs: indexedDocs })
  }
  else {
    return ({ status: null, indexedDocs: 0 })
  }
}

async function urlShortenerDDB(id: string, redirectURL: string) {
  try {
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);

    const command = new UpdateCommand({
      TableName: process.env.DDBTable_URLShortener,
      Key: { id: id },
      UpdateExpression: "set redirectURL = :redirectURL",
      ExpressionAttributeValues: {
        ":redirectURL": redirectURL,
      },
      ReturnValues: "ALL_NEW",
    });
    const response = await docClient.send(command);
    return id
  } catch (err) {
    console.log(err)
    return ""
  }
}