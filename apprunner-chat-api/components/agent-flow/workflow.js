const { queryAvailableTools } = require("./utils/store-tools");
const {
  retrieveAgentContext,
  storeAgentContext,
} = require("./utils/store-agent-context");
const { executeBedrockAPI } = require("./utils/bedrock-services");
const { getPrompt } = require("./utils/prompts");
const { executeTools } = require("./utils/execute-tools");
//Define structure of context
/* const context = {
  query: "",
  executionId: "",
  appId: "",
  conversationId: "",
  resumeWorkflow: "",
  availableTools: [],
  previousState: {},
}; */

//Define structure of a tool
const tool = {
  name: "",
  description: "",
  InputParams: [
    {
      name: "",
      type: "",
      description: "",
      required: "",
      inputPrompt: "",
    },
  ],
};

async function executeWorkflow(userMsg, decodedToken, isSpeakerEnabled) {
  const {
    userMessage: originalQuery,
    conversationId: convId,
    resumeWorkflow,
  } = JSON.parse(userMsg);

  let currentState = "Is New Request?";
  let context = {
    query: originalQuery,
    conversationId: convId,
    appId: decodedToken.applicationIdQ,
    resumeWorkflow: resumeWorkflow,
    isSpeakerEnabled: isSpeakerEnabled,
  };

  while (currentState) {
    console.log("******  currentState  *******");
    console.log(currentState);
    switch (currentState) {
      case "Is New Request?":
        if (context.contextId != null) {
          currentState = "Retrieve Previous State";
          context.toolResponse = context.query;
        } else {
          currentState = "Retrieve available Tools";
        }
        break;

      case "Retrieve Previous State":
        const previousState = await retrieveAgentContext(context.contextId);
        context = { ...context, ...previousState };
        currentState = "Execute Tools";
        break;

      case "Retrieve available Tools":
        const tools = await queryAvailableTools(context.appId);
        context.availableTools = tools;
        currentState = "Understand Context & Tool Selection";
        break;

      case "Understand Context & Tool Selection":
        await evaluateAvailableInformation(context);
        currentState = "Execute Tools";
        break;

      case "User Input Required":
        const outputMsg = await sendUserInputRequiredMessage(context);
        currentState = null; // End the state machine here
        return outputMsg;
        break;

      case "Execute Tools":
        currentState = await executeTools(context);
        break;

      case "Prepare Response":
        const response = await prepareResponse(context);
        currentState = null; // End the state machine here
        return response;
        break;
      case "OTP_VALIDATION":
        const otpValidation = await executeTools(context);
        currentState = null; // End the state machine here
        return otpValidation;
        break;

      default:
        currentState = null; // End the state machine if no matching state
        break;
    }
  }
}

async function evaluateAvailableInformation(context) {
  console.log("******  evaluateAvailableInformation  *******");
  const modelResponse = await executeBedrockAPI(
    getPrompt("EXECUTION_PLAN", context)
  );
  if (modelResponse.executionPlan) {
    context.executionPlan = modelResponse.executionPlan;
    console.log("******  executionPlan  *******");
    console.log(context.executionPlan);
  }
  return "";
}

async function sendUserInputRequiredMessage(context) {
  console.log("******  sendUserInputRequiredMessage  *******");
  // Save the context to DynamoDB
  const contextId = await storeAgentContext(context);

  // Write to Response stream
  const response = {
    type: "USER_INPUT_REQUIRED",
    message: `Please provide details for ${context.userInputRequiredParams}`,
    contextId: contextId,
  };

  // Assuming there's a function to write to the response stream
  //await writeToResponseStream(response);
  return response;
}

async function prepareResponse(context) {
  console.log("******  prepareResponse  *******");
  const modelResponse = await executeBedrockAPI(
    getPrompt("PREPARE_RESPONSE", context)
  );
  return modelResponse;
}

module.exports = {
  executeWorkflow,
};
