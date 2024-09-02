const jwt = require("jsonwebtoken");

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"; // ES Modules import
import { KendraClient, QueryCommand, QueryResultType, RetrieveCommand } from "@aws-sdk/client-kendra"; // ES Modules import

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient, QueryCommand as DDBQueryCommand } from "@aws-sdk/lib-dynamodb";

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

  // Get the Authorization header from the event
  const authHeader = event.headers["authorization"];
  const chatMsg = event.queryStringParameters
    ? event.queryStringParameters["chat"]
    : "";

  try {
    // Check if Authorization header exists
    if (!authHeader) {
      errorMessage =
        "Exception: Authorization header is missing. Please contact admin";
    } else {
      // Extract the JWT token from the Authorization header.
      const token = authHeader.split(" ")[1];

      // Decode and validate the JWT token
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      // Validate expiry
      const expiryTimestamp = decodedToken.exp * 1000;
      if (expiryTimestamp < Date.now()) {
        errorMessage =
          "Exception: JWT token has expired. Please contact admin ";
      } else {
        if (!chatMsg) {
          errorMessage =
            "Exception: Chat message not found. Please contact admin";
        } else {
          //Call the Amazon Q API
          result = await chat(chatMsg, decodedToken);
        }
      }
      if (errorMessage) {
        responseText = errorMessage;
      } else {
        responseText = result;
      }
    }
  } catch (error) {
    console.log(error)
    responseText = "Exception: Invalid JWT token. Please contact admin.";
  }

  if (typeof responseText === "string" || responseText instanceof String) {
    const msg = JSON.parse(chatMsg);
    responseText = {
      ...msg,
      systemMessage: responseText,
    };
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

type ChatInput = {
  applicationId: string;
  userId: string;
  conversationId: string | undefined;
  parentMessageId: string | undefined;
  userMessage: string | undefined;
  clientToken: string | undefined;
};

type ChatResponse = {
  conversationId: string | undefined;
  failedAttachments: string[] | undefined;
  sourceAttributions:
  | { title: string | undefined; url: string | undefined }[]
  | undefined;
  systemMessage: string | undefined;
  systemMessageId: string | undefined;
  userMessageId: string | undefined;
};
async function chat(userMsg: string, decodedToken: any) {
  let region;
  let textResponse;
  let attributions: any[] = [];
  let outputBR: { response: string, sourceAttributions: any[] } = { response: '', sourceAttributions: [] };
  let conversationId = '';
  let messageId = '';
  let qnaHistory = '';
  let nextQuery = '';

  try {
    region = "ap-south-1";
    const msg = JSON.parse(userMsg);
    const query = msg.userMessage;
    conversationId = msg.conversationId;

    if (conversationId) {
      const conversationHistory = await queryConversastion(conversationId);
      qnaHistory = conversationHistory?.map((item) => {
        return (
          `Query: ${item.question} 
Response: ${item.response}`)
      }).join('\n') || '';

    }

    const handleGreetingsPrompt = llmPrompt("FIRST_PROMPT", decodedToken.customer, decodedToken.chatbotName, qnaHistory, query, "", "")

    const respLLM = await executeBedrockAPI(handleGreetingsPrompt)

    const firstLLMResponse = extractFirstJSON(respLLM);

    if (firstLLMResponse?.context == "greeting") {
      textResponse = firstLLMResponse.response
    } else if (firstLLMResponse?.context == "new-query") {
      nextQuery = ""
    } else if (firstLLMResponse?.context == "follow-up") {
      nextQuery = firstLLMResponse.response
    }

    if (firstLLMResponse?.context == "new-query" ||
      firstLLMResponse?.context == "follow-up") {
      //const kendraResponse = await queryKendraFAQs(query)
      const kendraRetrieveResponse = await retrieveKendraSearch(nextQuery ? nextQuery : query, decodedToken.applicationIdQ)

      if (/* !kendraResponse &&  */!kendraRetrieveResponse) {
        var outputResponse: ChatResponse = {
          conversationId: conversationId,
          failedAttachments: [],
          sourceAttributions: [],
          systemMessage: "Sorry, I couldn't find any relevant information.",
          systemMessageId: '',
          userMessageId: '',
        };
        return outputResponse;
      }

      const fullPrompt = llmPrompt("SECOND_PROMPT", decodedToken.customer, decodedToken.chatbotName, qnaHistory, query, nextQuery, kendraRetrieveResponse)

      const outputStr = await executeBedrockAPI(fullPrompt)

      const start = outputStr.indexOf('{')
      if (start >= 0) {
        const end = outputStr.lastIndexOf('}')
        const finalOutput = outputStr.substring(start, end + 1)
        outputBR = JSON.parse(finalOutput)
      } else {
        outputBR.response = outputStr
        attributions = []
      }


      textResponse = outputBR.response?.trim();
      attributions = outputBR.sourceAttributions?.
        filter(function (v: any, i: number, self: any) {

          // It returns the index of the first
          // instance of each value
          return i == self.indexOf(v);
        })
    }

    if (textResponse == null || textResponse == "") {
      textResponse = "Sorry, I couldn't find any relevant information."
      attributions = []
    }

    const resultConvMutation = await mutateConversation(conversationId, query, nextQuery || "", textResponse, decodedToken)
    messageId = resultConvMutation.messageId
    conversationId = resultConvMutation.conversationId

    var outputResponse: ChatResponse = {
      conversationId: conversationId,
      failedAttachments: [],
      sourceAttributions: attributions,
      systemMessage: textResponse,
      systemMessageId: messageId,
      userMessageId: '',
    };
    return outputResponse;
  } catch (error) {
    console.log(error);
    var outputResponse: ChatResponse = {
      conversationId: conversationId,
      failedAttachments: [],
      sourceAttributions: [],
      systemMessage: "Exception: An error has occurred, please try again.",
      systemMessageId: '',
      userMessageId: '',
    };
    return outputResponse;
    //return "Exception: Assistant is not available. Please try after some time.";
  }
}

async function queryKendraFAQs(query: string) {
  try {
    const client = new KendraClient({ region: "ap-south-1" });
    const inputKendra = {
      AttributeFilter:
      {
        AndAllFilters: [{
          EqualsTo: {
            Key: "_language_code",
            Value: { StringValue: "en" }
          }
        }]
      },
      IndexId: process.env.KENDRA_INDEXID,
      QueryResultTypeFilter: QueryResultType.QUESTION_ANSWER,
      PageNumber: 1,
      PageSize: 3,
      QueryText: query,
      SpellCorrectionConfiguration: { IncludeQuerySpellCheckSuggestions: true }
    }
    const command = new QueryCommand(inputKendra);
    const response = await client.send(command);
    const queries = response.ResultItems?.map((item) => {
      let question = ""
      let answer = ""
      const attributes = item.AdditionalAttributes
      attributes?.forEach((attribute) => {
        if (attribute && attribute.Key === "QuestionText") {
          question = attribute.Value?.TextWithHighlightsValue?.Text || ''
        } else if (attribute && attribute.Key === "AnswerText") {
          answer = attribute.Value?.TextWithHighlightsValue?.Text || ''
        }
      })
      return "Question: " + question + "\n Answer: " + answer
    })
    return queries?.join('\n')
  } catch (error) {
    console.log(error);
    return "Exception: Assistant is not available. Please try after some time.";
  }
}

async function retrieveKendraSearch(query: string, dsId: string) {
  try {
    const client = new KendraClient({ region: "ap-south-1" });
    const inputKendra = {
      AttributeFilter:
      {
        OrAllFilters: [{
          EqualsTo: {
            Key: "_data_source_id",
            Value: { StringValue: `${dsId}` }
          }
        }]
      },
      IndexId: process.env.KENDRA_INDEXID,
      PageNumber: 1,
      PageSize: 10,
      QueryText: query,
      SpellCorrectionConfiguration: { IncludeQuerySpellCheckSuggestions: true },
    }

    const command = new RetrieveCommand(inputKendra);
    const response = await client.send(command);
    const queries = response.ResultItems?.map((item) => {
      return "\n Title: " + item.DocumentTitle + "\n URI: " + item.DocumentURI + "\n Confidence level: " + item.ScoreAttributes?.ScoreConfidence + "\n Content: " + item.Content
    })
    return queries?.join('\n')
  } catch (error) {
    console.log(error);
    return "Exception: Assistant is not available. Please try after some time.";
  }
}

async function executeBedrockAPI(query: string) {
  try {

    const configBR = { region: "ap-south-1" }
    const clientBR = new BedrockRuntimeClient(configBR);
    const inputBR = {
      modelId: "mistral.mixtral-8x7b-instruct-v0:1", //"mistral.mistral-7b-instruct-v0:2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: query,
        max_tokens: 2000,
        temperature: 0.5,
        top_k: 200,
        top_p: 1,
        stop: ["Human"]
      }),
    };
    const commandBR = new InvokeModelCommand(inputBR);
    const response = await clientBR.send(commandBR);

    let decoder = new TextDecoder();
    let responseObject = decoder.decode(response.body);
    const textObj = JSON.parse(responseObject).outputs;
    console.log(textObj[0].text.replace(/^\s+|\s+$/g, ''));
    return textObj[0].text.replace(/^\s+|\s+$/g, '');
  } catch (err) {
    console.log(err);
    return "Exception: Error fetching results from LLM. Please try after some time.";
  }
}

async function mutateConversation(conversationId: string, query: string, nextQuery: string, textResponse: string, decodedToken: any) {
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const { v4: uuidv4 } = require('uuid');

  if (conversationId == "") {
    conversationId = uuidv4()
    // Write Conversation details to Summary Table
    const commandNewConv = new PutCommand({
      TableName: process.env.DDBTable_ConversationSummary,
      Item: {
        id: conversationId,
        appId: decodedToken.applicationIdQ,
        conversationDate: new Date().toISOString()
      },
    });
    //test

    const responseNewConv = await docClient.send(commandNewConv);
  }

  const messageId = uuidv4();

  const command = new PutCommand({
    TableName: process.env.conversationDDBTableName,
    Item: {
      conversationId: conversationId,
      messageId: messageId,
      conversationDate: new Date().toISOString(),
      question: query,
      modifiedQuestion: nextQuery,
      response: textResponse
    },
  });

  const response = await docClient.send(command);
  console.log(response);
  return { conversationId, messageId };

}

async function queryConversastion(conversationId: string) {
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

function extractFirstJSON(outputStr: string) {
  console.log("Extracting JSON from: " + outputStr)
  const start = outputStr.indexOf('{')
  if (start >= 0) {
    const end = outputStr.indexOf('}')
    const finalOutput = outputStr.substring(start, end + 1)
    return JSON.parse(finalOutput)
  } else {
    return {}
  }
}

function llmPrompt(type: string, company: string, chatbotName: string, qnaHistory: string, query: string, nextQuery: string, kendraRetrieveResponse: string,) {
  let prompt = "";
  switch (type) {
    case "FIRST_PROMPT":
      prompt =
        `
[INST]
You will be acting as a customer care chatbot for a ${company}. ${chatbotName ? "Your name is '" + chatbotName + "'. " : ""}Your goal is to assist customers by answering their questions and addressing their needs to the best of your ability, using information from the company's website.

This is a first step of 2-step chain of thoughts. In this step, you'll respond to only Greeting or Compliment messages. For any Human query, don't answer any question from your own knowledge. Read the following query from Human and determine:
- If human query is a Greeting message (Hi, Hello, How are you, etc.) or a Compliment (Thank you, great, awesome, you can do better etc.), then respond to it in a polite and humble way as a Customer care executive for a Government department in following JSON format:  {"context": "greeting", "response": "<humble response to the query>" }. 
- If human query is a follow up question to the previous conversation history shared below inside <ConversationHistory></ConversationHistory> tags, then update the human query with relevant context from <ConversationHistory></ConversationHistory> to prepare a better search query for knowledgebase. Don't try to answer the query yet, instead send response in JSON format: {"context": "follow-up", "response": "<Updated human query with relevant context>" }.
- If human query is a new query with no dependency on previous history, respond as follows: {"context": "new-query", "response": "<Return user query without modification>" }.

    <ConversationHistory>
      ${qnaHistory}
    </ConversationHistory>

Validate and reconfirm whether you have selected the right option. Double check that "context" in response JSON has one of the following values: "greeting", "new-query" or "follow-up". Validate that you are sharing a valid JSON. Only share a single JSON response without any additional explanation or text. IMPORTANT: ONLY RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. DON'T TRY TO ANSWER ANY QUESTION FROM YOUR OWN KNOWLEDGEBASE.
[/INST] 

Human: ${query} 
AI: `
      break;
    case "SECOND_PROMPT":
      prompt = `
[INST] 
You will be acting as a customer care chatbot for a ${company}. ${chatbotName ? "Your name is '" + chatbotName + "'. " : ""}Your goal is to assist customers by answering their questions and addressing their needs to the best of your ability, using information from the company's website.

This is the second step of 2-step chain of thoughts. Here are some important guidelines to follow during the conversation:
- Respond to Human's query from the relevant information encapsulated within <context></context> tags ONLY.
- If the customer's query cannot be satisfactorily answered using the information in the <context></context> tags, apologize and politely explain that you don't have the necessary information to assist them with that particular request.
- Avoid engaging with any queries that use foul language, are political in nature, or are otherwise inflammatory or inappropriate. Politely state that you are not able to discuss those topics.
- Do not attempt to answer any questions that would require information from outside the provided knowledgebase. Your knowledge is strictly limited to what is in the knowledgebase.
- Prioritize recent information for generating response. Include the relevant date from context for old messages: 'Note: The information is based on data from <DATE>, and may be outdated today. For the latest information, refer to the ${company} website.' In case of no date found in context, add a disclaimer: 'Note: No date has been mentioned in the source, please validate the latest information on ${company} portal.'
- Response must strictly adhere to this JSON format, ensuring no non-JSON elements are included:
{ 
  "response": "<user-friendly answer>", 
  "sourceAttributions": [
    { "title": "<source document title>", 
      "url": "<source URL>"
    }
  ] 
}

<context>
  ${kendraRetrieveResponse}
</context>

Validate and reconfirm that you are sharing a valid JSON. Only share a single JSON response without any additional explanation or text. IMPORTANT: ONLY RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. DON'T TRY TO ANSWER ANY QUESTION FROM YOUR OWN KNOWLEDGEBASE.
[/INST]

Human: ${nextQuery ? nextQuery : query}
AI: 
`
      break;
  }
  console.log(prompt);
  return prompt
}