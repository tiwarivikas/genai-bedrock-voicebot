import * as jwt from "jsonwebtoken";
import { KendraClient, CreateDataSourceCommand, CreateDataSourceCommandInput } from "@aws-sdk/client-kendra"; // ES Modules import

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

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

    try {
        const inputVars = JSON.parse(event.body);
        console.log(inputVars);

        if (!inputVars || !inputVars.customer) {
            throw Error("Input parameters not received.");
        }

        //Ensure Form is in Submitted State
        if (inputVars.qchatform_status !== "Submitted") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Form already submitted",
                }),
            };
        }

        const customerName = inputVars.customer;
        let region;

        //Get current date
        const today = new Date();
        const adjustedtime = new Date(today.getTime() + 5 * 60000);
        const hours = adjustedtime.getUTCHours();
        const minutes = adjustedtime.getUTCMinutes();
        const day = new Date()
            .toLocaleString("en-us", { weekday: "short" })
            .toUpperCase();

        region = "ap-south-1"
        const indexId = process.env.KENDRA_INDEXID
        const inputDS: CreateDataSourceCommandInput =
        {
            "Configuration": {
                "TemplateConfiguration": {
                    "Template": {
                        "connectionConfiguration": {
                            "repositoryEndpointMetadata": {
                                "siteMapUrls": null,
                                "s3SeedUrl": null,
                                "s3SiteMapUrl": null,
                                "seedUrlConnections": [
                                    {
                                        "seedUrl": inputVars.website
                                    }
                                ],
                                "authentication": "NoAuthentication"
                            }
                        },
                        "additionalProperties": {
                            "crawlSubDomain": true,
                            "crawlAllDomain": false,
                            "crawlDomainsOnly": false,
                            "honorRobots": true,
                            "crawlAttachments": true,
                            "inclusionURLCrawlPatterns": [],
                            "exclusionURLCrawlPatterns": [],
                            "inclusionURLIndexPatterns": [],
                            "exclusionURLIndexPatterns": [],
                            "inclusionFileIndexPatterns": [],
                            "exclusionFileIndexPatterns": [],
                            "rateLimit": "300",
                            "maxFileSize": "50",
                            "crawlDepth": "3",
                            "maxLinksPerUrl": "100",
                            "proxy": {}
                        },
                        "enableIdentityCrawler": false,
                        "version": "1.0.0",
                        "syncMode": "FORCED_FULL_CRAWL",
                        "type": "WEBCRAWLERV2",
                        "repositoryConfigurations": {
                            "webPage": {
                                "fieldMappings": [
                                    {
                                        "indexFieldName": "_category",
                                        "indexFieldType": "STRING",
                                        "dataSourceFieldName": "category"
                                    },
                                    {
                                        "indexFieldName": "_source_uri",
                                        "indexFieldType": "STRING",
                                        "dataSourceFieldName": "sourceUrl"
                                    },
                                    {
                                        "indexFieldName": "wc_title",
                                        "indexFieldType": "STRING",
                                        "dataSourceFieldName": "title"
                                    }
                                ]
                            },
                            "attachment": {
                                "fieldMappings": [
                                    {
                                        "indexFieldName": "_category",
                                        "indexFieldType": "STRING",
                                        "dataSourceFieldName": "category"
                                    },
                                    {
                                        "indexFieldName": "_source_uri",
                                        "indexFieldType": "STRING",
                                        "dataSourceFieldName": "sourceUrl"
                                    },
                                    {
                                        "indexFieldName": "wc_file_name",
                                        "indexFieldType": "STRING",
                                        "dataSourceFieldName": "fileName"
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            "Description": "Datasource for customer: " + inputVars.customer,
            "IndexId": indexId,
            "Name": "ds-" + inputVars.customer,
            "LanguageCode": "en",
            "RoleArn": "arn:aws:iam::717937492408:role/service-role/AmazonKendra-qchat-ds",
            "Schedule": `cron(${minutes} ${hours} ? * ${day} *)`,
            "Type": "TEMPLATE",
            /* "ClientToken": "57ae8abf-0345-447c-a27f-761ad36a92f2" */
        }

        const client = new KendraClient({ "region": region });
        const command = new CreateDataSourceCommand(inputDS);
        const response = await client.send(command);
        const dsId = response.Id


        //Create JWT Token
        const secretKey = process.env.JWT_SECRET || '';
        inputVars.applicationIdQ = dsId;
        const token = jwt.sign(inputVars, secretKey, {
            expiresIn: "7" + "d", // Token expiration time
        });

        //Write to URL Shortener
        let urlShortenerResult = ""
        let publicURL = ""
        const redirectURL = process.env.CHAT_PROD_API + token
        if (dsId) {
            urlShortenerResult = await urlShortenerDDB(dsId, redirectURL)
        }

        if (urlShortenerResult) {
            //https://o5sib7u8b8.execute-api.ap-south-1.amazonaws.com/v2/tiny?id=4bcbe3a7-c45b-4811-8db5-1b739f2f271d
            publicURL = process.env.API_Endpoint + "/v2/tiny?id=" + dsId
        }

        //Send final response with Q Application ID
        res.body = JSON.stringify({
            applicationIdQ: dsId,
            token: token,
            publicURL: publicURL
        });
        callback(null, res);
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

async function urlShortenerDDB(id: string, redirectURL: string) {
    try {
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        const command = new PutCommand({
            TableName: process.env.DDBTable_URLShortener,
            Item: {
                id: id,
                redirectURL: redirectURL
            },
        });
        const response = await docClient.send(command);
        return id
    } catch (err) {
        console.log(err)
        return ""
    }
}