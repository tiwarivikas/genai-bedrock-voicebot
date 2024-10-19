function getPrompt(type, context) {
  let prompt = "";
  switch (type) {
    case "EXECUTION_PLAN":
      prompt = `
      [INST] Create an execution plan to address the Human query. You can call one or more available tools within <tools></tools> tags as required to answer the query. Tools can be called multiple times if required. Think carefully, if you really need every tool to answer the query.
For any missing parameter that needs User Input, add value: "USER_INPUT_REQUIRED"
<tools>
{
    tools:
    [
        {
            name: "Knowledgebase",
            id: "kb-kendra",
            description: "contains details of all the static information about Passport office locations, policies and documentations. This doesn't have any real-time or user specific information.",
            params: [ "query" ],
            output: "provides search result in plain text chunks containing text search results.",
        },
        {
            name: "Appointment Availability",
            id: "api-passport-appointment",
            description: "provides a JSON with available slots based on specific location id within a city. Accept one of the following values for locationId: Delhi, Mumbai, Kolkata, Chennai, Bangalore. Ask from user if location is not provided in user query.",
            params: [ "locationId", "date: <OPTIONAL, if available, in dd/mm/yyyy format. Current date is ${new Date().toLocaleDateString(
              "en-GB",
              { day: "2-digit", month: "2-digit", year: "numeric" }
            )}. >" ],
            output: "JSON response with availability information for the provided locationid."
        }
    ]
}
</tools>

Provide response in JSON format with a tool definition for each state. Double check the sequence and relevance of each tool required to respond to user query. 
{
    executionPlan:
        [
            //Create object for each tool call in following format
            {
                id: "<tool id>",
                params: ["<param1>": "<param1 value>", "<param2>": "<param2 value>"],
            }
        ]
}

Note: Provide the response without explanation in just JSON format
[/INST]

Human: ${context.query}

AI:
`;
      return prompt;
      break;

    // Evaluate the tool parameters for the tool call in following format.
    case "EVALUATE_TOOL_PARAMS":
      prompt = `
        [INST] Evaluate the tool parameters for the tool call in following format.
        {
            toolCall: {
                id: "<tool id>",
                params: {
                    "<param1>": "<param1 value>",
                    "<param2>": "<param2 value>"
                }
            }
        }

        Based on the available information, evaluate if the tool parameters are valid and if the tool call can be made. If all required parameters are present and valid, respond with:
        {
            "status": "valid",
            "message": "Tool call can be made with the provided parameters."
        }

        If any required parameters are missing or invalid, respond with:
        {
            "status": "invalid",
            "message": "Missing or invalid parameters.",
            "requiredParams": ["<list of missing or invalid parameter names>"],
            "userQuery": "<A polite query asking the user to provide the missing or invalid parameters>"
        }

        Provide the response in JSON format without any additional explanation.
        [/INST]

        <query>
        ${context.query}
        </query>

        <toolCall>
        ${JSON.stringify(context.toolCall)}
        </toolCall>
        `;
      return prompt;

    // Prepare a response to the Human query based on the following information and guidelines:
    case "PREPARE_RESPONSE":
      prompt = `
[INST] 
Prepare a response to the Human query based on the following information and guidelines:
- Respond to Human's query from the relevant information encapsulated within <context></context> tags ONLY.
- If the customer's query cannot be satisfactorily answered using the information in the <context></context> tags, apologize and politely explain that you don't have the necessary information to assist them with that particular request.
- Avoid engaging with any queries that use foul language, are political in nature, or are otherwise inflammatory or inappropriate. Politely state that you are not able to discuss those topics.
- Do not attempt to answer any questions that would require information from outside the provided knowledgebase. Your knowledge is strictly limited to what is in the knowledgebase.
    ${
      context.isSpeakerEnabled == "true"
        ? "- Be precise to provide response in less than 50 words."
        : ""
    }
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
  ${context.executionPlan
    .map((tool) => {
      return tool.result;
    })
    .join("\n")}
</context>

Validate and reconfirm that you are sharing a valid JSON. Only share a single JSON response without any additional explanation or text. IMPORTANT: ONLY RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. DON'T TRY TO ANSWER ANY QUESTION FROM YOUR OWN KNOWLEDGEBASE.
[/INST]

Human: ${context.query}
AI: 
`;
      return prompt;
      break;
    case "OTP_VALIDATION":
      prompt = `
[INST] 
Validate the OTP provided by the user and return the result in JSON format.
{
  "isValid": "<true or false>",
  "message": "<message>"
}

`;

    default:
      break;
  }
}

module.exports = { getPrompt };
