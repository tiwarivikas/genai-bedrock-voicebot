const jwt = require("jsonwebtoken");

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

exports.handler = async (event: any) => {
    let errorMessage = "";
    let result;
    let responseText;

    // Check if the request method is OPTIONS
    if (event.requestContext.http.method === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
            body: JSON.stringify({ message: "OPTIONS request received" }),
        };
    }

    //"body": "{\"request_id\":\"90f9e642-db04-46bf-8523-d9ea53bcd43a\",\"like_status\":\"wrong_answer\"}",

    // Get the Authorization header from the event
    const authHeader = event.headers["authorization"];

    try {
        // Check if Authorization header exists
        if (!authHeader) {
            errorMessage =
                "Exception: Authorization header is missing. Please contact admin";
        } else {
            // Extract the JWT token from the Authorization header
            const token = authHeader.split(" ")[1];

            // Decode and validate the JWT token
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

            // Validate expiry
            const expiryTimestamp = decodedToken.exp * 1000;
            if (expiryTimestamp < Date.now()) {
                errorMessage =
                    "Exception: JWT token has expired. Please contact admin ";
            } else {
                const inputJSON = JSON.parse(event.body);
                const messageId = inputJSON.request_id
                const reaction = inputJSON.like_status

                if (!messageId) {
                    errorMessage =
                        "Exception: Chat message not found. Please contact admin";
                } else {
                    //Call the Amazon Q API
                    result = await mutateReaction(messageId, reaction);
                    return {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                            "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        },
                        ContentType: "application/json",
                        body: JSON.stringify(result),
                    };
                }
                /*  if (!chatMsg) {
                     errorMessage =
                         "Exception: Chat message not found. Please contact admin";
                 } else {
                     //Call the Amazon Q API
                     result = await chat(chatMsg, decodedToken);
                 } */
            }
            if (errorMessage) {
                responseText = errorMessage;
            } else {
                responseText = result;
            }
        }
    } catch (error) {
        responseText = "Exception: Invalid JWT token. Please contact admin.";
    }

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        ContentType: "application/json",
        body: JSON.stringify(responseText),
    };
};


async function mutateReaction(messageId: string, reaction: string) {
    try {
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        const command = new UpdateCommand({
            TableName: process.env.conversationDDBTableName,
            Key: {
                messageId: messageId,
            },
            UpdateExpression: "set reaction = :reaction",
            ExpressionAttributeValues: {
                ":reaction": reaction,
            },
            ReturnValues: "ALL_NEW",
        });
        const response = await docClient.send(command);
        return response;
    } catch (err) {
        return "Exception: MutateReaction function: " + err;
    }

}
