import ContentScanner from "./ContentScanner.js";
import BehaviorAnalyzer from "./BehaviorAnalyzer.js";
import TrustScoreManager from "./TrustScoreManager.js";

class ModerationEngine {

  async moderate({ user, contentType, content }) {

    const contentRisk = await ContentScanner.scan(content);

    const behaviorRisk = await BehaviorAnalyzer.analyze(user);

    const trustRisk = TrustScoreManager.calculateRisk(user);

    const finalRisk = Math.max(contentRisk, behaviorRisk, trustRisk);

    if (finalRisk > 0.9) {
      return { action: "block", risk: finalRisk };
    }

    if (finalRisk > 0.75) {
      return { action: "review", risk: finalRisk };
    }

    if (finalRisk > 0.6) {
      return { action: "shadow", risk: finalRisk };
    }

    return { action: "allow", risk: finalRisk };
  }
}

export default new ModerationEngine();