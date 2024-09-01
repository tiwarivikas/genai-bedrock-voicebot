const BhashiniPipeline = require("../bhashini/bhashini-pipeline");
const axios = require("axios");

class BhashiniTranslation {
  constructor() {
    this.bhashini = null;
  }

  async initialize(sourceLanguageCode, targetLanguageCode) {
    if (!this.bhashini) {
      this.bhashini = new BhashiniPipeline();
      this.bhashini.initialize(
        process.env.BHASHINI_USER_ID,
        process.env.BHASHINI_API_KEY
      );
    }

    // Configure Bhashini Pipeline if not already configured or if languages have changed
    if (
      this.bhashini.getCurrentBhashiniResp() === undefined ||
      this.bhashini.sourceLanguage !== sourceLanguageCode ||
      this.bhashini.targetLanguage !== targetLanguageCode
    ) {
      await this.bhashini.configureBhashiniPipelineForTranslation(
        sourceLanguageCode,
        targetLanguageCode
      );
    }
  }

  async translate(text, sourceLanguageCode, targetLanguageCode) {
    await this.initialize(sourceLanguageCode, targetLanguageCode);

    const bhashiniResp = this.bhashini.getCurrentBhashiniResp();

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

    return await this.getTranslation(inputParams, bhashiniResp);
  }

  async getTranslation(inputParams, bhashiniResp) {
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
      this.bhashini.resetBhashiniResp();
      throw new Error("Some error in translation");
    }
  }
}

const bhashiniTranslation = new BhashiniTranslation().translate;

module.exports = { bhashiniTranslation };
