const axios = require("axios");
const BhashiniPipeline = require("../bhashini/bhashini-pipeline");
let bhashini = null;

async function ttsBhashini(content, lang, voiceType) {
  if (!bhashini) {
    // Initialize and configure BhashiniPipeline
    bhashini = new BhashiniPipeline();
    bhashini.initialize(
      process.env.BHASHINI_USER_ID,
      process.env.BHASHINI_API_KEY
    );
  }

  lang = lang.trim().slice(0, 2).toLowerCase();
  voiceType = voiceType.toLowerCase();

  // Configure Bhashini Pipeline if not already configured or if language has changed
  if (
    bhashini.getCurrentBhashiniResp() === undefined ||
    bhashini.lang !== lang
  ) {
    await bhashini.configureBhashiniPipelineForTTS(lang);
  }

  const bhashiniResp = bhashini.getCurrentBhashiniResp();

  const inputParams = {
    pipelineTasks: [
      {
        taskType: "tts",
        config: {
          language: {
            sourceLanguage: lang,
          },
          serviceId: bhashiniResp.serviceId,
          gender: voiceType,
          samplingRate: 8000,
        },
      },
    ],
    inputData: {
      input: [
        {
          source: content,
        },
      ],
    },
  };

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

    //console.log(response.data);
    const audioBase64Wav = response.data["pipelineResponse"][0].audio;

    //console.log("getSpeechTTSRecord", audioBase64Wav);
    return audioBase64Wav;
  } catch (err) {
    console.log("Error in speech synthesis", err);
    bhashini.resetBhashiniResp();
    throw new Error("Some error in speech synthesis");
  }
}

module.exports = { ttsBhashini };
