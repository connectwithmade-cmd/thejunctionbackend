// moderation/TextScanner.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class TextScanner {
  async scan(text) {
    if (!text) return 0;

    const res = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const result = res.results?.[0];
    if (!result) return 0;

    let risk = 0;

    if (result.categories.hate) risk = Math.max(risk, 0.9);
    if (result.categories.violence) risk = Math.max(risk, 0.85);
    if (result.categories.sexual) risk = Math.max(risk, 0.8);
    if (result.categories.harassment) risk = Math.max(risk, 0.75);

    return risk;
  }
}

export default new TextScanner();