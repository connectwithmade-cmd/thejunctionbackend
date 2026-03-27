// moderation/ModerationEngine.js
import redis from "../utils/redisClient.js";
import ContentScanner from "./ContentScanner.js";
import BehaviorAnalyzer from "./BehaviorAnalyzer.js";
import TrustScoreManager from "./TrustScoreManager.js";
import KeywordFilter from "./KeywordFilter.js";

class ModerationEngine {

  async moderate({ user, content }) {
    const text = `${content.title || ""} ${content.description || ""}`.trim();

    const cacheKey = `mod:${text}`;

    // ✅ Cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // ✅ Trust bypass
    if (user.trustScore > 85) {
      return { action: "allow", risk: 0 };
    }

    // ✅ Parallel non-AI
    const [behaviorRisk, trustRisk] = await Promise.all([
      BehaviorAnalyzer.analyze(user),
      Promise.resolve(TrustScoreManager.calculateRisk(user)),
    ]);

    let baseRisk = Math.max(behaviorRisk, trustRisk);

    if (baseRisk > 0.9) {
      return { action: "block", risk: baseRisk };
    }

    // ✅ Keyword layer
    const keywordRisk = KeywordFilter.scan(text);
    if (keywordRisk > 0.8) {
      return { action: "block", risk: keywordRisk };
    }

    // ✅ AI fallback
    let contentRisk = 0;

    try {
      contentRisk = await ContentScanner.scan(content);
    } catch (err) {
      if (err.status === 429) contentRisk = 0.3;
      else throw err;
    }

    const finalRisk = Math.max(baseRisk, contentRisk);

    const result = this.decide(finalRisk);

    // cache 1 hour
    await redis.set(cacheKey, JSON.stringify(result), "EX", 3600);

    return result;
  }

  decide(risk) {
    if (risk > 0.9) return { action: "block", risk };
    if (risk > 0.75) return { action: "review", risk };
    if (risk > 0.6) return { action: "shadow", risk };
    return { action: "allow", risk };
  }
}

export default new ModerationEngine();