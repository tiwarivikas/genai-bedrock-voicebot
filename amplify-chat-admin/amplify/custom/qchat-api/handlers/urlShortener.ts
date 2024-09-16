import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

exports.handler = async (event: any) => {
    let errorMessage = "";
    let redirectUrl = "";

    // Check if the request method is OPTIONS
    if (event.requestContext.http.method === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
            body: JSON.stringify({ message: "OPTIONS request received" }),
        };
    }

    const id = event.queryStringParameters
        ? event.queryStringParameters["id"]
        : "";

    const retrieveRedirectUrl = event.queryStringParameters
        ? event.queryStringParameters["redirectUrl"]
        : "";

    try {
        if (!id) {
            errorMessage =
                "Exception: Id not found.";
        } else {
            //Call the Amazon Q API
            //result = await chat(chatMsg, decodedToken);
            redirectUrl = await fetchURLfromDDB(id)
        }
    } catch (error) {
        return {
            statusCode: 401,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
            body: JSON.stringify({ message: "The URL is not valid" }),
        };
    }

    if(retrieveRedirectUrl) {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
            body: {redirectUrl}
        };
    }

    return {
        statusCode: 301,
        headers: {
            'Location': redirectUrl,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': 0
        },
        body: ''
    };
};

async function fetchURLfromDDB(id: string) {
    try {
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        const command = new GetCommand({
            TableName: process.env.DDBTable_URLShortener,
            Key: {
                id: id
            },
        });

        const response = await docClient.send(command);
        console.log(response);
        return response.Item?.redirectURL || response.Item?.url;

    } catch (err) {
        console.log("Error:" + err)
        return ""
    }
}
