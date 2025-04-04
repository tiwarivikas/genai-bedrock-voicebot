const express = require('express');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { KendraClient, RetrieveCommand } = require("@aws-sdk/client-kendra");
const { BedrockRuntimeClient, ConverseCommand } = require("@aws-sdk/client-bedrock-runtime");

// Store active SSE transports for each session
const transports = {};

// Store created tools by agent ID
const agentTools = {};

// Create MCP server function
function createMcpServer(mcpAgentId, agentDescription, openApiSchema) {
    // If we already have tools for this agent, return them
    if (agentTools[mcpAgentId]) {
        return agentTools[mcpAgentId];
    }

    // Create a new MCP server instance
    const server = new McpServer({
        name: mcpAgentId || "mcp-server",
        version: "1.0.0",
        capabilities: {
            tools: {}
        }
    });

    // Add Kendra retrieval tool - this will be available for all agents
    server.tool(
        "kendra-search",
        "Search for information in the knowledge base",
        { 
            type: "object", 
            properties: { 
                query: { 
                    type: "string",
                    description: "The search query to find information in the knowledge base"
                }
            },
            required: ["query"]
        },
        async (args) => {
            try {
                const query = args.query;
                if (!query) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: JSON.stringify({
                                result: "Error: Search query is required",
                                citations: []
                            })
                        }],
                        isError: true
                    };
                }

                const kendraClient = new KendraClient({});
                const inputKendra = {
                    AttributeFilter: mcpAgentId ? {
                        OrAllFilters: [{
                            EqualsTo: {
                                Key: "_data_source_id",
                                Value: { StringValue: `${mcpAgentId}` }
                            }
                        }]
                    } : undefined,
                    IndexId: process.env.KENDRA_INDEXID,
                    PageNumber: 1,
                    PageSize: 10,
                    QueryText: query,
                    SpellCorrectionConfiguration: { IncludeQuerySpellCheckSuggestions: true },
                };

                const command = new RetrieveCommand(inputKendra);
                const response = await kendraClient.send(command);
                
                // Format the search results
                const searchResults = response.ResultItems?.map((item) => ({
                    title: item.DocumentTitle || "No title",
                    uri: item.DocumentURI || "",
                    confidence: item.ScoreAttributes?.ScoreConfidence || "MEDIUM",
                    content: item.Content || "No content"
                })) || [];

                // Create citations for the search results
                const citations = searchResults.map((result, index) => ({
                    type: "DOCUMENT",
                    title: result.title,
                    url: result.uri || `kendra-result-${index}`,
                    generation: result.content
                }));

                return {
                    content: [{ 
                        type: "text",
                        text: JSON.stringify({
                            result: searchResults,
                            citations
                        }, null, 2)
                    }]
                };
            } catch (error) {
                console.error("Error executing Kendra search:", error);
                return {
                    content: [{ type: "text", text: `Error: ${error.message}` }],
                    isError: true
                };
            }
        }
    );

    // Parse OpenAPI schema to create tools
    try {
        if (openApiSchema && openApiSchema.paths) {
            for (const [path, methods] of Object.entries(openApiSchema.paths)) {
                for (const [method, operation] of Object.entries(methods)) {
                    if (method === 'get' || method === 'post') {
                        const toolName = operation.operationId || `${method}-${path.replace(/\//g, '-').replace(/[{}]/g, '')}`;
                        const toolDescription = operation.summary || operation.description || `${method.toUpperCase()} ${path}`;
                        
                        // Create parameter schema
                        const paramSchema = {};

                        // Handle path parameters
                        const pathParams = path.match(/{([^}]+)}/g) || [];
                        pathParams.forEach(param => {
                            const paramName = param.slice(1, -1);
                            paramSchema[paramName] = { type: "string" };
                        });

                        // Handle query parameters for GET
                        if (method === 'get' && operation.parameters) {
                            operation.parameters.forEach(param => {
                                paramSchema[param.name] = { 
                                    type: param.schema?.type || "string",
                                    description: param.description || ""
                                };
                            });
                        }

                        // Handle body parameters for POST
                        if (method === 'post' && operation.requestBody) {
                            const content = operation.requestBody.content;
                            if (content && content['application/json'] && content['application/json'].schema) {
                                const bodySchema = content['application/json'].schema;
                                if (bodySchema.properties) {
                                    Object.entries(bodySchema.properties).forEach(([propName, propSchema]) => {
                                        paramSchema[propName] = {
                                            type: propSchema.type || "string",
                                            description: propSchema.description || ""
                                        };
                                    });
                                }
                            }
                        }

                        // Register the tool with dynamic handler using Bedrock
                        server.tool(
                            toolName,
                            toolDescription,
                            { type: "object", properties: paramSchema },
                            async (args) => {
                                try {
                                    // Initialize Bedrock client for generating responses
                                    const bedrockClient = new BedrockRuntimeClient({ 
                                        region: process.env.BEDROCK_REGION || "us-west-2" 
                                    });
                                    const modelId = process.env.BEDROCK_MODEL || "anthropic.claude-3-5-sonnet-20241022-v2:0";

                                    // Construct a prompt for Bedrock to generate a response
                                    const prompt = `
                                    You're a helpful assistant that generates sample JSON responses for API endpoints.
                                    
                                    API ENDPOINT: ${method.toUpperCase()} ${path}
                                    DESCRIPTION: ${toolDescription}
                                    PARAMETERS RECEIVED: ${JSON.stringify(args)}
                                    
                                    Based on this information, generate a realistic sample JSON response that this API might return.
                                    Make sure the response is well-structured and includes appropriate fields that would be expected
                                    from this kind of endpoint. Be creative but realistic.
                                    
                                    Return ONLY the JSON response, nothing else.
                                    `;

                                    // Call Bedrock to generate a response
                                    const bedrockResponse = await bedrockClient.send(new ConverseCommand({
                                        modelId: modelId,
                                        messages: [
                                            { role: "user", content: [{ type: "text", text: prompt }] }
                                        ],
                                        max_tokens: 1000
                                    }));
                                    
                                    // Extract the generated text
                                    let generatedText = "";
                                    if (bedrockResponse.messages && bedrockResponse.messages.length > 0) {
                                        for (const content of bedrockResponse.messages[0].content) {
                                            if (content.type === 'text') {
                                                generatedText += content.text;
                                            }
                                        }
                                    }

                                    // Clean up the text to make sure it's valid JSON
                                    let cleanedText = generatedText;
                                    // Remove any Markdown code blocks
                                    if (cleanedText.includes('```json')) {
                                        cleanedText = cleanedText.split('```json')[1].split('```')[0].trim();
                                    } else if (cleanedText.includes('```')) {
                                        cleanedText = cleanedText.split('```')[1].split('```')[0].trim();
                                    }
                                    
                                    // Parse the JSON response
                                    const result = JSON.parse(cleanedText);

                                    // Add citations information for client to use
                                    const citations = [{
                                        type: "TOOL",
                                        title: `${toolName} Result`,
                                        url: `tool://${toolName}`,
                                        generation: JSON.stringify(result)
                                    }];

                                    return {
                                        content: [{ 
                                            type: "text",
                                            text: JSON.stringify({
                                                result,
                                                citations
                                            }, null, 2)
                                        }]
                                    };
                                } catch (error) {
                                    console.error(`Error executing tool ${toolName}:`, error);
                                    return {
                                        content: [{ type: "text", text: `Error: ${error.message}` }],
                                        isError: true
                                    };
                                }
                            }
                        );
                    }
                }
            }
        }
        
        // Store tools for this agent ID
        agentTools[mcpAgentId] = server;
        return server;
    } catch (error) {
        console.error("Failed to create MCP server with tools:", error);
        throw error;
    }
}

// Create Express router for MCP server
function createMcpRouter() {
    const router = express.Router();
    
    // SSE endpoint for the MCP server
    router.get('/sse', async (req, res) => {
        const mcpAgentId = req.query.mcpAgentId;
        
        if (!mcpAgentId || !agentTools[mcpAgentId]) {
            return res.status(404).send("Agent not found");
        }
        
        const transport = new SSEServerTransport('/mcp-server/messages', res);
        const sessionId = transport.sessionId;
        
        // Store the transport for this session
        transports[sessionId] = { transport, mcpAgentId };
        
        // Set up cleanup on connection close
        res.on('close', () => {
            delete transports[sessionId];
        });
        
        // Connect the transport to the server
        await agentTools[mcpAgentId].connect(transport);
    });
    
    // Message endpoint for client-to-server messages
    router.post('/messages', async (req, res) => {
        const sessionId = req.query.sessionId;
        if (!sessionId || !transports[sessionId]) {
            return res.status(404).send('No session found');
        }
        
        const { transport } = transports[sessionId];
        await transport.handlePostMessage(req, res);
    });

    return router;
}

module.exports = {
    createMcpServer,
    createMcpRouter
};