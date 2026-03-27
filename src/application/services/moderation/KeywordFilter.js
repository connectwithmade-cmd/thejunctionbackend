// moderation/KeywordFilter.js
class KeywordFilter {
  constructor() {
    this.banned = ["kill", "rape", "bomb", "terrorist"];
  }

  scan(text) {
    const lower = text.toLowerCase();

    for (const word of this.banned) {
      if (lower.includes(word)) {
        return 0.9;
      }
    }

    return 0;
  }
}

export default new KeywordFilter();