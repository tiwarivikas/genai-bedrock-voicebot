const { awsTranslate } = require("./aws-translate");
const { bhashiniTranslation } = require("./bhashini-translation");

async function translateText(text, sourceLanguageCode, targetLanguageCode) {
  if (sourceLanguageCode === targetLanguageCode) return text;

  if (
    (sourceLanguageCode === "hi" && targetLanguageCode === "en") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "hi") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "te") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "ta") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "kn") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "hi") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "pa") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "gu") 
  ) {
    return await awsTranslate(text, sourceLanguageCode, targetLanguageCode);
  } else {
    return await bhashiniTranslation(
      text,
      sourceLanguageCode,
      targetLanguageCode
    );
  }
}

module.exports = { translateText };


/*const { awsTranslate } = require("./aws-translate");
const { bhashiniTranslation } = require("./bhashini-translation");

async function translateText(text, sourceLanguageCode, targetLanguageCode) {
  if (sourceLanguageCode === targetLanguageCode) return text;

  if (
    (sourceLanguageCode === "hi" && targetLanguageCode === "en") ||
    (sourceLanguageCode === "en" && targetLanguageCode === "hi")
  ) {
    return await awsTranslate(text, sourceLanguageCode, targetLanguageCode);
  } else {
    return await bhashiniTranslation(
      text,
      sourceLanguageCode,
      targetLanguageCode
    );
  }
}

module.exports = { translateText }; */


