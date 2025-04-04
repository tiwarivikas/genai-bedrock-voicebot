const { pollyTTS } = require("./aws-polly-tts");
const { ttsBhashini } = require("./bhashini-tts");

async function textToSpeechStream(text, res, translationLanguage) {
  if (translationLanguage === "hi" || translationLanguage === "en") {
    await pollyTTS(text, translationLanguage, res);
  } else {
    try {
      const respAudio = await ttsBhashini(text, translationLanguage, "Female");
      const firstAudioByte = respAudio[0].audioContent;
      res.write(`data: ${firstAudioByte}\n\n`);
      res.write("event: end\n");
      res.write("data: End of stream\n\n");
      res.write("data: [END]\n\n");
      res.end();
    } catch (err) {
      console.error("Error:", err);
      res.status(500).end();
    }
  }
}

module.exports = { textToSpeechStream };
