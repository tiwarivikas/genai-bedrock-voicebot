const BhashiniPipeline = require("../bhashini/bhashini-pipeline");
const axios = require("axios");

let bhashiniInstance = null;

async function initialize(sourceLanguageCode, targetLanguageCode) {
  if (!bhashiniInstance) {
    bhashiniInstance = new BhashiniPipeline();
    bhashiniInstance.initialize(
      process.env.BHASHINI_USER_ID,
      process.env.BHASHINI_API_KEY
    );
  }

  // Configure Bhashini Pipeline if not already configured or if languages have changed
  if (
    bhashiniInstance.getCurrentBhashiniResp() === undefined ||
    bhashiniInstance.sourceLanguage !== sourceLanguageCode ||
    bhashiniInstance.targetLanguage !== targetLanguageCode
  ) {
    await bhashiniInstance.configureBhashiniPipelineForTranslation(
      sourceLanguageCode,
      targetLanguageCode
    );
  }
}

async function getTranslation(inputParams, bhashiniResp) {
  try {
    const response = await axios({
      method: "POST",
      url: bhashiniResp.apiEndPoint,
      headers: {
        Authorization: bhashiniResp.apiValue,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: inputParams,
      timeout: 60000,
    });

    return response.data.pipelineResponse[0].output[0].target;
  } catch (err) {
    console.log("Error in translation", err);
    bhashiniInstance.resetBhashiniResp();
    throw new Error("Some error in translation");
  }
}

async function bhashiniTranslation(
  text,
  sourceLanguageCode,
  targetLanguageCode
) {
  await initialize(sourceLanguageCode, targetLanguageCode);

  const bhashiniResp = bhashiniInstance.getCurrentBhashiniResp();

  const inputParams = {
    pipelineTasks: [
      {
        taskType: "translation",
        config: {
          language: {
            sourceLanguage: sourceLanguageCode,
            targetLanguage: targetLanguageCode,
          },
          serviceId: bhashiniResp.serviceId,
        },
      },
    ],
    inputData: {
      input: [
        {
          source: text,
        },
      ],
    },
  };

  return await getTranslation(inputParams, bhashiniResp);
}

module.exports = { bhashiniTranslation };