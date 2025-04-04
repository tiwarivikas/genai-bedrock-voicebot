require('dotenv').config();
const cors = require('cors');
const express = require('express');

const {chat} = require('./components/chat-service');
const { authenticateJWT } = require("./components/auth-service");
const { agentChat } = require('./components/agent-chat-service');
const { createMcpRouter } = require('./components/mcp-server');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount MCP server on /mcp-server endpoint
app.use('/mcp-server', createMcpRouter());

// Single unified stream endpoint that handles both flows
app.get("/stream", authenticateJWT, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chatMsg = req.query.chat;
  const translationLanguage = req.query.translationLanguage;
  const isSpeakerEnabled = req.query.isSpeakerEnabled;
  
  if (!chatMsg) {
    res.status(401).send("Exception: Chat Param is missing.");
    return;
  }

  try {
    // Check if the token contains agent information
    const useAgent = res.locals.decodedToken.agendId && res.locals.decodedToken.agentAliasId;

    if (useAgent) {
      // Use agent chat flow
      await agentChat(
        chatMsg,
        res.locals.decodedToken,
        res,
        isSpeakerEnabled,
        translationLanguage
      );
    } else {
      // Use regular Bedrock+Kendra flow
      await chat(
        chatMsg,
        res.locals.decodedToken,
        res,
        isSpeakerEnabled,
        translationLanguage
      );
    }
  } catch (error) {
    console.error("Error in stream:", error);
    res.write(`data: ${JSON.stringify({
      error: "An error occurred processing your request"
    })}\n\n`);
    res.write("data: [END]\n\n");
    res.end();
  }

  // Clean up when client closes connection
  req.on("close", () => {
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});