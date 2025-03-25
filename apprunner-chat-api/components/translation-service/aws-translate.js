const {
  TranslateClient,
  TranslateTextCommand,
} = require("@aws-sdk/client-translate");

const translateClient = new TranslateClient({});

async function awsTranslate(text, sourceLanguageCode, targetLanguageCode) {
  const command = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: sourceLanguageCode,
    TargetLanguageCode: targetLanguageCode,
  });

  try {
    const response = await translateClient.send(command);
    return response.TranslatedText;
  } catch (error) {
    console.error("Error translating text:", error);
    throw error;
  }
}

module.exports = { awsTranslate };
