import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: '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'
});

class TextScanner {

  /**
   * Scan text content in a single request
   * Returns a risk score between 0 and 1
   */
  async scan(text) {
    if (!text) return 0;

    try {
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