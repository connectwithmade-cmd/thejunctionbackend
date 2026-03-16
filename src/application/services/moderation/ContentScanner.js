import TextScanner from "./TextScanner.js";

class ContentScanner {

  /**
   * Combine all event content for a single scan
   */
  async scan({ title, description, images }) {
    // Combine title + description into one text
    const combinedText = `${title || ""} ${description || ""}`.trim();

    // Only scan once
    const textRisk = await TextScanner.scan(combinedText);

    // If you want image analysis, do it **after or optional**, but avoid multiple OpenAI calls per event
    // const imageRisk = await ImageScanner.scan(images);

    return textRisk; // max(textRisk, imageRisk) if you add ImageScanner
  }
}

export default new ContentScanner();