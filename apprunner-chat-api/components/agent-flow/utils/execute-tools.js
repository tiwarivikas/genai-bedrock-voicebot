async function executeTools(context) {
  console.log("******  executeTools  *******");
  const tools = context.executionPlan;
  let nextStep = "";
  for (const tool of tools) {
    console.log("******  tool  *******");
    console.log(tool);
    if (tool.status != "completed") {
      const result = await executeTool(tool.id, tool.params, context);
      tool.status = "completed";
      tool.result = result;
      if (context.userInputRequired) {
        nextStep = "User Input Required";
        break;
      }
      nextStep = "Prepare Response";
    }
  }
  return nextStep;
}

async function executeTool(toolId, params, context) {
  console.log("******  executeTool  *******");
  // Check if any param requires user input
  for (const [key, value] of Object.entries(params)) {
    if (value === "USER_INPUT_REQUIRED") {
      console.log("******  USER_INPUT_REQUIRED  *******");
      console.log(
        `User input required for parameter: ${key} in tool: ${toolId}`
      );
      context.userInputRequired = true;
      context.userInputRequiredParams = key;
      return "User Input Required";
    }
  }
  if (!params || Object.keys(params).length === 0) {
    console.log("******  Missing parameters for tool  *******");
    console.log(`Missing parameters for tool: ${toolId}`);
    return { error: "Missing parameters" };
  }
  console.log("******  tool  *******");
  console.log(toolId);
  try {
    const { tool } = require(`../tools/${toolId}.js`);
    const result = await tool(params);
    console.log("******  result  *******");
    console.log(result);
    return result;
  } catch (error) {
    console.error(`Error loading or executing tool ${toolId}:`, error.message);
    context.error = `Failed to execute tool ${toolId}: ${error.message}`;
    return { error: `Failed to execute tool ${toolId}` };
  }
}

module.exports = { executeTools };
