const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require("@aws-sdk/client-bedrock-agent-runtime");
const { textToSpeechStream } = require("./tts-service/tts-service");
const { translateText } = require("./translation-service/translation-service");
const crypto = require('crypto');

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

    const client = new BedrockAgentRuntimeClient({ 
      region: decodedToken.regionQ || "ap-south-1"
    });
    console.log("change invoking agent with filter")
    const input = {
      agentId: decodedToken.agentId,
      agentAliasId: decodedToken.agentAliasId,
      sessionId: conversationId,
      inputText: query,
      enableTrace: true
    };

    const command = new InvokeAgentCommand(input);
    const agentResponse = await client.send(command);

    if (!agentResponse.completion) {
      throw new Error("No response from agent");
    }

    // Process the stream and collect citations
    const { textResponse, citations } = await processAgentStream(agentResponse.completion, res);
    console.log("final citations",citations)
    if (textResponse) {
      const translatedResponse = await translateText(
        textResponse,
        "en",
        translationLanguage
      );

      // // Format citations into source attributions
      // const sourceAttributions = citations.map(citation => {
      //   return {
      //     type: "URL",
      //     url: citation.uri || "",
      //     title: citation.title || "",
      //     generation: citation.generation || ""
      //   };
      // }).filter(attr => attr.url); // Only include citations with URLs
      
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

async function processAgentStream(stream, res) {
  let accumulatedText = '';
  let citations = new Map();
  
  try {
    console.log("Starting to process agent stream");

    for await (const chunk of stream) {
      console.log("Received chunk:", JSON.stringify(chunk, null, 2));

      // Handle text chunks
      if (chunk.chunk?.bytes) {
        const decoder = new TextDecoder();
        const text = decoder.decode(chunk.chunk.bytes);
        accumulatedText += text;
        
        // Stream each chunk to the client
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      }

      // Handle trace information containing Lambda response
      if (chunk.trace) {
        console.log("Processing trace information");
        
        try {
          const traceInfo = typeof chunk.trace === 'string' ? 
            JSON.parse(chunk.trace) : chunk.trace;
          console.log("traceinfo",traceInfo)
          console.log("orchout",traceInfo?.trace?.orchestrationTrace.observation)
          // Look for Lambda function response in trace
          const lambdaResponse = traceInfo?.trace?.orchestrationTrace?.observation?.actionGroupInvocationOutput?.text;
          console.log("lambda response",lambdaResponse)
          if (lambdaResponse) {
            try {
              // Parse the Lambda response directly since citations are at top level
              const responseBody = JSON.parse(lambdaResponse);
              console.log("responseBody", responseBody)
              
              if (responseBody && responseBody.citations) {
                console.log("Found citations in Lambda response:", responseBody.citations);
                
                // Process citations from Lambda response
                responseBody.citations.forEach(citation => {
                  if (citation.url) {
                    citations.set(citation.url, {
                      type: citation.type || "URL",
                      url: citation.url,
                      title: citation.title || citation.url.split('/').pop(),
                      generation: citation.generation || ""
                    });
                    console.log(`Added citation for URL: ${citation.url}`);
                  }
                });
              }
            } catch (err) {
              console.error("Error processing Lambda response:", err);
            }
          }
        } catch (err) {
          console.error("Error processing trace:", err);
          console.error("Trace content:", chunk.trace);
        }
      }
    }

    const citationsArray = Array.from(citations.values());
    console.log("Final citations:", JSON.stringify(citationsArray, null, 2));
    
    return {
      textResponse: accumulatedText,
      citations: citationsArray
    };
  } catch (error) {
    console.error("Error processing agent stream:", error);
    throw error;
  }
}

module.exports = { agentChat };
