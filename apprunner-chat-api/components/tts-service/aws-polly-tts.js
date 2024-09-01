const {
  PollyClient,
  SynthesizeSpeechCommand,
} = require("@aws-sdk/client-polly");

async function pollyTTS(text, translationLanguage, res) {
  try {
    const client = new PollyClient({});
    const input = {
      Engine: "neural",
      LanguageCode: translationLanguage + "-IN",
      OutputFormat: "mp3",
      Text: text,
      TextType: "text",
      VoiceId: "Kajal",
    };

    const command = new SynthesizeSpeechCommand(input);
    const response = await client.send(command);

    if (response.AudioStream) {
      response.AudioStream.on("data", (chunk) => {
        res.write(`data: ${chunk.toString("base64")}\n\n`);
      });

      response.AudioStream.on("end", () => {
        res.write("event: end\n");
        res.write("data: End of stream\n\n");
        res.write("data: [END]\n\n");
        res.end();
      });

      response.AudioStream.on("error", (err) => {
        console.error("Error streaming audio:", err);
        res.status(500).end();
      });
    } else {
      res.status(500).send("No audio stream received from Polly.");
    }
  } catch (err) {
    console.error("Error:", err);
    throw err;
  }
}

module.exports = { pollyTTS };
