const express = require("express");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const gTTS = require("gtts");
const fs = require("fs");
const path = require("path");
const os = require("os");

dotenv.config();

const app = express();
const port = 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log('openai: ', openai);

app.use(express.json());    

app.post("/tts", async (req, res) => {
  console.log('res: ', res);
  const { text } = req.body;
  console.log("text: ", text);

  if (!text) {
    return res.status(400).send({ error: "No text provided" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Generate or enhance the following text.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const generatedText = response.choices[0].message.content.trim();
    console.log("generatedText: ", generatedText);

    if (!generatedText) {
      return res
        .status(400)
        .send({ error: "Generated text is empty or invalid" });
    }

    console.log("Generated Text:", generatedText);

    const downloadsPath = path.join(os.homedir(), "Downloads");
    const outputFile = path.join(downloadsPath, "output.mp3");

    const gtts = new gTTS(generatedText, "en");
    gtts.save(outputFile, function (err) {
      if (err) {
        console.error("Error saving the audio:", err);
        return res
          .status(500)
          .send({ error: "Error converting text to speech" });
      }

      fs.stat(outputFile, (err, stats) => {
        if (err || stats.size === 0) {
          console.error("Error: File is empty or does not exist.");
          return res
            .status(500)
            .send({ error: "Error with the generated audio file" });
        }

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${path.basename(outputFile)}"`
        );
        console.log("outputFile: ", outputFile);

        res.download(outputFile, (err) => {
          if (err) { 
            console.error("Error sending file:", err);
            res.status(500).send({ error: "Error sending audio file" });
          } else {
            console.log("Audio file downloaded successfully");
          }
        });
      });
    });
  } catch (error) {
    console.error("Error processing text:", error);
    res.status(500).send({ error: "Error processing the text" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
