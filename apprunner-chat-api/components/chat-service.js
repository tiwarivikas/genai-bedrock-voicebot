async function chat(
  userMsg,
  decodedToken,
  res,
  isSpeakerEnabled,
  translationLanguage
) {
  let textResponse;
  let attributions = [];
  let qnaHistory = "";
  let nextQuery = "";
  var messageId = "";
  var conversationId = "";

  try {
    const {
      userMessage: originalQuery,
      conversationId: convId,
      useAgent,
    } = JSON.parse(userMsg);
    conversationId = convId;

    if (useAgent) {
      // Execute workflow logic
      const workflow = require("./agent-flow/workflow");
      const workflowResponse = await workflow.executeWorkflow(
        originalQuery,
        decodedToken,
        isSpeakerEnabled
      );

      var outputResponse = {
        conversationId: conversationId,
        failedAttachments: [],
        sourceAttributions: [],
        systemMessage: workflowResponse,
        systemMessageId: "",
        userMessageId: "",
      };

      res.write("data: [COMPLETE]\n\n");
      const txtResponse = await translateText(
        outputResponse.systemMessage,
        "en",
        translationLanguage
      );
      outputResponse.systemMessage = txtResponse;
      res.write(`data: ${JSON.stringify(outputResponse)}\n\n`);

      if (isSpeakerEnabled == "true") {
        res.write("data: [AUDIO]\n\n");
        await textToSpeechStream(
          outputResponse.systemMessage,
          res,
          translationLanguage
        );
      } else {
        res.write("data: [END]\n\n");
        res.end();
      }

      return;
    }

    const query = await translateText(originalQuery, translationLanguage, "en");

    if (conversationId) {
      const conversationHistory = await queryConversastion(conversationId);
      qnaHistory =
        conversationHistory
          ?.map(
            (item) => `Query: ${item.question} \nResponse: ${item.response}`
          )
          .join("\n") || "";
    }

    const handleGreetingsPrompt = llmPrompt(
      "FIRST_PROMPT",
      decodedToken.customer,
      decodedToken.chatbotName,
      qnaHistory,
      query,
      "",
      "",
      isSpeakerEnabled
    );
    const respLLM = await executeBedrockAPI(handleGreetingsPrompt);
    const firstLLMResponse = extractFirstJSON(respLLM);

    if (firstLLMResponse?.context == "greeting") {
      textResponse = firstLLMResponse.response;
      const resultFirstConvMutation = await mutateConversation(
        conversationId,
        query,
        "",
        textResponse,
        decodedToken
      );
      messageId = resultFirstConvMutation.messageId;
      conversationId = resultFirstConvMutation.conversationId;
    } else if (firstLLMResponse?.context == "new-query") {
      nextQuery = "";
    } else if (firstLLMResponse?.context == "follow-up") {
      nextQuery = firstLLMResponse.response;
    }

    if (
      firstLLMResponse?.context == "new-query" ||
      firstLLMResponse?.context == "follow-up"
    ) {
      const kendraRetrieveResponse = await retrieveKendraSearch(
        nextQuery ? nextQuery : query,
        decodedToken.applicationIdQ
      );

      if (!kendraRetrieveResponse) {
        var outputResponse = {
          conversationId,
          failedAttachments: [],
          sourceAttributions: [],
          systemMessage: "Sorry, I couldn't find any relevant information.",
          systemMessageId: "",
          userMessageId: "",
        };
      } else {
        const fullPrompt = llmPrompt(
          "SECOND_PROMPT",
          decodedToken.customer,
          decodedToken.chatbotName,
          qnaHistory,
          query,
          nextQuery,
          kendraRetrieveResponse,
          isSpeakerEnabled
        );
        const response = await executeBedrockStreamingAPI(fullPrompt);

        const outputBR = await responseStreaming(response, res);

        textResponse = outputBR.response?.trim();
        attributions = outputBR.sourceAttributions?.filter(function (
          v,
          i,
          self
        ) {
          return i == self.indexOf(v);
        });

        const resultConvMutation = await mutateConversation(
          conversationId,
          query,
          nextQuery || "",
          textResponse,
          decodedToken
        );
        messageId = resultConvMutation.messageId;
        conversationId = resultConvMutation.conversationId;

        var outputResponse = {
          conversationId: conversationId,
          failedAttachments: [],
          sourceAttributions: attributions,
          systemMessage: textResponse,
          systemMessageId: messageId,
          userMessageId: "",
        };
      }
    } else {
      var outputResponse = {
        conversationId: conversationId,
        failedAttachments: [],
        sourceAttributions: attributions,
        systemMessage: textResponse,
        systemMessageId: messageId,
        userMessageId: "",
      };
    }

    res.write("data: [COMPLETE]\n\n");
    const txtResponse = await translateText(
      outputResponse.systemMessage,
      "en",
      translationLanguage
    );
    outputResponse.systemMessage = txtResponse;
    res.write(`data: ${JSON.stringify(outputResponse)}\n\n`);

    if (isSpeakerEnabled == "true") {
      res.write("data: [AUDIO]\n\n");
      await textToSpeechStream(
        outputResponse.systemMessage,
        res,
        translationLanguage
      );
    } else {
      res.write("data: [END]\n\n");
      res.end();
    }

    return;
  } catch (error) {
    console.log(error);
    var outputResponse = {
      conversationId: conversationId,
      failedAttachments: [],
      sourceAttributions: [],
      systemMessage: "Exception: An error has occurred, please try again.",
      systemMessageId: "",
      userMessageId: "",
    };
    res.write("data: [COMPLETE]\n\n");
    res.write(`data: ${JSON.stringify(outputResponse)}\n\n`);
    res.write("data: [END]\n\n");
    res.end();
    return;
  }
}

module.exports = { chat };
