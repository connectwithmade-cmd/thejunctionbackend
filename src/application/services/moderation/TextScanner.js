import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class TextScanner {

    
  /**
   * Scan text content in a single request
   * Returns a risk score between 0 and 1
   */
  async scan(text) {
    if (!text) return 0;

    try {
      console.log("API KEY:", process.env.OPENAI_API_KEY);
      const response = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: text
      });

      const result = response.results?.[0];
      if (!result) return 0;

      let risk = 0;

      // Assign risk scores based on category flags
      if (result.categories.hate) risk = Math.max(risk, 0.9);
      if (result.categories.violence) risk = Math.max(risk, 0.85);
      if (result.categories.sexual) risk = Math.max(risk, 0.8);
      if (result.categories.harassment) risk = Math.max(risk, 0.75);

      return risk;
    } catch (err) {
      console.error("TextScanner error:", err.message || err);
      // Fail open — allow event if moderation service fails, but log
      return 0;
    }
  }
}

export default new TextScanner();