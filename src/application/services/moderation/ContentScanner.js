// moderation/ContentScanner.js
import TextScanner from "./TextScanner.js";

class ContentScanner {
  async scan({ title, description }) {
    const text = `${title || ""} ${description || ""}`.trim();
    return await TextScanner.scan(text);
  }
}

export default new ContentScanner();