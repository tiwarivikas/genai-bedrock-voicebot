const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const { textToSpeechStream } = require("./tts-service/tts-service");
const { translateText } = require("./translation-service/translation-service");
const crypto = require('crypto');
const { createMcpServer } = require('./mcp-server');
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

function generateUniqueId() {
  return crypto.randomUUID();
}

async function agentChat(userMsg, decodedToken, res, isSpeakerEnabled, translationLanguage) {
  let conversationId = "";
  
  try {
    const parsedMsg = JSON.parse(userMsg);
    const originalQuery = parsedMsg.userMessage;
    const query = await translateText(originalQuery, translationLanguage, "en");
    
    conversationId = parsedMsg.conversationId || `conv-${generateUniqueId()}`; 

    res.write("data: [STARTED]\n\n");

    // Check if we have an mcpAgentId from the token
    if (!decodedToken.mcpAgentId || !decodedToken.openApiSchema) {
      throw new Error("MCP Agent ID or schema not provided");
    }

    // Parse the OpenAPI schema if it's a string
    const openApiSchema = typeof decodedToken.openApiSchema === 'string' 
      ? JSON.parse(decodedToken.openApiSchema) 
      : decodedToken.openApiSchema;
    
    // Get or create MCP server for this agent
    createMcpServer(
      decodedToken.mcpAgentId,
      decodedToken.agentDescription || "AI Assistant",
      openApiSchema
    );
    
    // Create MCP client to connect to our MCP server
    const baseUrl = new URL('/mcp-server', 
      process.env.MCP_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`);
    
    const transport = new SSEClientTransport(
      new URL(`/mcp-server/sse?mcpAgentId=${decodedToken.mcpAgentId}`, baseUrl),
      new URL('/mcp-server/messages', baseUrl)
    );
    
    const client = new Client(
      { name: "agent-chat-client", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    // Connect to the MCP server
    await client.connect(transport);
    
    // Get available tools
    const toolsList = await client.listTools();
    console.log(`Available tools: ${toolsList.tools.map(t => t.name).join(', ')}`);
    
    // Initialize Bedrock client
    const bedrockClient = new BedrockRuntimeClient({ 
      region: decodedToken.regionQ || process.env.BEDROCK_REGION || "us-west-2" 
    });
    const modelId = process.env.BEDROCK_MODEL || "anthropic.claude-3-5-sonnet-20241022-v2:0";

    // Convert MCP tools to Claude tool format
    const claudeTools = toolsList.tools.map(tool => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.inputSchema
    }));

    // Call Claude with the user query and tools using ConverseCommand
    const initialResponse = await bedrockClient.send(new ConverseCommand({
      modelId: modelId,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: query }]
        }
      ],
      system: decodedToken.agentInstructions || decodedToken.agentDescription || "You are a helpful AI assistant that can use tools to help users.",
      tools: claudeTools,
      max_tokens: 1000
    }));
    
    let textResponse = '';
    const citations = [];
    
    // Process Claude's response
    for (const content of initialResponse.messages[0].content) {
      if (content.type === 'text') {
        textResponse += content.text;
        res.write(`data: ${JSON.stringify({ chunk: content.text })}\n\n`);
      } 
      else if (content.type === 'tool_use') {
        // Log the tool request
        console.log(`Tool use: ${content.name} with args:`, content.input);
        
        // Call the tool via MCP
        const toolResult = await client.callTool({
          name: content.name,
          arguments: content.input
        });
        
        // Process the tool result
        if (toolResult && toolResult.content) {
          for (const item of toolResult.content) {
            if (item.type === 'text') {
              try {
                // Parse the JSON response which includes result and citations
                const parsedResult = JSON.parse(item.text);
                
                // If there are citations in the result, add them to our collection
                if (parsedResult.citations) {
                  parsedResult.citations.forEach(citation => {
                    citations.push(citation);
                  });
                }
                
                // Get the tool result to send back to Claude
                const toolResponseText = JSON.stringify(parsedResult.result);
                
                // Send the tool result back to Claude using ConverseCommand
                const toolResponse = await bedrockClient.send(new ConverseCommand({
                  modelId: modelId,
                  messages: [
                    {
                      role: "user",
                      content: [{ type: "text", text: query }]
                    },
                    {
                      role: "assistant",
                      content: [
                        { 
                          type: "tool_use", 
                          name: content.name, 
                          input: content.input, 
                          id: content.id 
                        }
                      ]
                    },
                    {
                      role: "user",
                      content: [
                        { 
                          type: "tool_result", 
                          tool_use_id: content.id,
                          content: toolResponseText
                        }
                      ]
                    }
                  ],
                  system: decodedToken.agentInstructions || decodedToken.agentDescription || "You are a helpful AI assistant that can use tools to help users.",
                  max_tokens: 1000
                }));
                
                // Add Claude's response to the accumulated text
                if (toolResponse.messages && toolResponse.messages.length > 0) {
                  // Get the last assistant message
                  const assistantMessage = toolResponse.messages[0];
                  if (assistantMessage.content && assistantMessage.content.length > 0) {
                    for (const contentPart of assistantMessage.content) {
                      if (contentPart.type === 'text') {
                        textResponse += contentPart.text;
                        res.write(`data: ${JSON.stringify({ chunk: contentPart.text })}\n\n`);
                      }
                    }
                  }
                }
              } catch (error) {
                console.error("Error processing tool result:", error);
                textResponse += `\nError processing tool result: ${error.message}`;
                res.write(`data: ${JSON.stringify({ chunk: `\nError processing tool result: ${error.message}` })}\n\n`);
              }
            }
          }
        }
      }
    }

    const translatedResponse = await translateText(
      textResponse,
      "en",
      translationLanguage
    );
    
    const outputResponse = {
      conversationId, 
      failedAttachments: [],
      sourceAttributions: citations,
      systemMessage: translatedResponse,
      systemMessageId: Date.now().toString(),
      userMessageId: parsedMsg.clientToken || "",
    };

    res.write("data: [COMPLETE]\n\n");
    res.write(`data: ${JSON.stringify(outputResponse)}\n\n`);

    if (isSpeakerEnabled === "true") {
      res.write("data: [AUDIO]\n\n");
      await textToSpeechStream(
        translatedResponse.replace(/>/g, ' '), // Replace > with space only for TTS
        res,
        translationLanguage
      );
    } else {
      res.write("data: [END]\n\n");
      res.end();
    }
  } catch (error) {
    console.error("Error in agentChat:", error);
    
    const errorMessage = error.name === 'ValidationException' ? 'Invalid input provided.' :
                       error.name === 'ThrottlingException' ? 'Service is busy. Please try again in a moment.' :
                       'An error has occurred, please try again.';

    // Translate error message if needed
    const translatedError = await translateText(
      `Exception: ${errorMessage}`,
      "en",
      translationLanguage
    ).catch(() => `Exception: ${errorMessage}`); // Fallback to original on translation error

    const errorResponse = {
      conversationId, 
      failedAttachments: [],
      sourceAttributions: [],
      systemMessage: translatedError,
      systemMessageId: "",
      userMessageId: "",
    };

    res.write("data: [COMPLETE]\n\n");
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);

    // Handle text-to-speech for error if enabled
    if (isSpeakerEnabled === "true") {
      res.write("data: [AUDIO]\n\n");
      await textToSpeechStream(
        translatedError.replace(/>/g, ' '), // Replace > with space only for TTS
        res,
        translationLanguage
      ).catch(() => {}); // Ignore TTS errors for error messages
    }

    res.write("data: [END]\n\n");
    res.end();
  }
}

module.exports = { agentChat };