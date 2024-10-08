const {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} = require("@aws-sdk/client-bedrock-runtime");

async function executeBedrockAPI(query) {
  try {
    const configBR = {};
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
        stop: ["Human"],
      }),
    };
    const commandBR = new InvokeModelCommand(inputBR);
    const response = await clientBR.send(commandBR);

    let decoder = new TextDecoder();
    let responseObject = decoder.decode(response.body);
    const textObj = JSON.parse(responseObject).outputs;
    return extractFirstJSON(textObj[0].text.replace(/^\s+|\s+$/g, ""));
  } catch (err) {
    console.log(err);
    return "Exception: Error fetching results from LLM. Please try after some time.";
  }
}

async function executeBedrockStreamingAPI(query) {
  try {
    const configBR = {};
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
        stop: ["Human"],
      }),
    };

    const command = new InvokeModelWithResponseStreamCommand(inputBR);

    const response = await clientBR.send(command);

    return response;
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An error occurred while processing the request",
      }),
    };
  }
}

function extractFirstJSON(outputStr) {
  try {
    console.log("Extracting JSON from: " + outputStr);
    const start = outputStr.indexOf("{");
    if (start >= 0) {
      const end = outputStr.lastIndexOf("}");
      const finalOutput = outputStr.substring(start, end + 1);
      return JSON.parse(finalOutput);
    } else {
      return {};
    }
  } catch (err) {
    console.log(err);
    return {};
  }
}

module.exports = { executeBedrockAPI, executeBedrockStreamingAPI };
