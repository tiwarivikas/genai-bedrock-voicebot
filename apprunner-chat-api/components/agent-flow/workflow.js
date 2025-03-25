const { queryAvailableTools } = require("./store-tools");
const { retrieveStateInfo, storeStateInfo } = require("./store-stateInfo");
const { executeBedrockAPI } = require("../llm-service/bedrock-services");

async function executeStepFunction(stateInput) {
  let currentState = "Is New Request?";
  let context = { stateInput };

  while (currentState) {
    switch (currentState) {
      case "Is New Request?":
        if (context.stateInput.ResumeWorkflow === "No") {
          currentState = "Retrieve Previous State";
        } else {
          currentState = "Retrieve available Tools";
        }
        break;

      case "Retrieve Previous State":
        context.previousState = await retrieveStateInfo(
          stateInput.conversationId
        );
        currentState = "Collect Input Parameters";
        break;

      case "Retrieve available Tools":
        const tools = await queryAvailableTools(stateInput.appId);
        context.stateInput.AvailableTools = tools;
        currentState = "Understand Context & Tool Selection";
        break;

      case "Understand Context & Tool Selection":
        const modelResponse = await evaluateAvailableInformation(context);
        currentState = "Collect Input Parameters";
        break;

      case "Collect Input Parameters":
        currentState = await collectInputParameters(context);
        break;

      case "Inputs Required?":
        if (context.stateInput.LambdaFn === "Yes") {
          currentState = "Send Response asking for user input";
        } else {
          currentState = "Execute Tools";
        }
        break;

      case "Send Response asking for user input":
        await invokeLambdaFunction(context.stateInput.LambdaFn, context);
        currentState = null; // End the state machine here
        break;

      case "Execute Tools":
        await executeTools(context.stateInput);
        currentState = "Prepare Response";
        break;

      case "Prepare Response":
        await prepareResponse(context.stateInput);
        currentState = null; // End the state machine here
        break;

      default:
        currentState = null; // End the state machine if no matching state
        break;
    }
  }
}

async function collectInputParameters(context) {
  const lambdaResponse = await invokeLambdaFunction(
    context.stateInput.LambdaFn,
    context
  );

  if (context.stateInput.LambdaFn === "Yes") {
    await evaluateAvailableInformation(context);
    return "Ask for User Input";
  }
  return "No Inputs Required";
}

async function invokeLambdaFunction(lambdaFn, payload) {
  return lambda
    .invoke({
      FunctionName: lambdaFn,
      Payload: JSON.stringify(payload),
    })
    .promise();
}

async function evaluateAvailableInformation(context) {
  const modelResponse = await executeBedrockAPI(context.stateInput.Prompt);
  return modelResponse;
}

async function executeTools(stateInput) {
  // Example of executing multiple Lambda functions
  await Promise.all(
    stateInput.AvailableTools.map(async (tool) => {
      await invokeLambdaFunction(tool.LambdaFn, stateInput);
    })
  );
}

async function prepareResponse(stateInput) {
  const modelResponse = await executeBedrockAPI(stateInput.Prompt);
  return modelResponse;
}

// Sample input to execute the state machine
const stateInput = {
  ResumeWorkflow: "Yes",
  LambdaFn: "my-lambda-function",
  AvailableTools: [
    { LambdaFn: "tool-lambda-1" },
    { LambdaFn: "tool-lambda-2" },
  ],
};

executeStepFunction(stateInput)
  .then(() => console.log("Step Function executed successfully"))
  .catch((error) => console.error("Error executing Step Function:", error));
