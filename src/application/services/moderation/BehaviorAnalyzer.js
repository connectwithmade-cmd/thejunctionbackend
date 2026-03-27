// moderation/BehaviorAnalyzer.js
import Event from "../../domain/models/Event.js";

class BehaviorAnalyzer {
  async analyze(user) {
    let risk = 0;

    const accountAgeHours =
      (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60);

    if (accountAgeHours < 24) risk += 0.2;

    const eventsLastHour = await Event.countDocuments({
      organizerId: user._id,
      createdAt: { $gt: new Date(Date.now() - 3600000) },
    });

    if (eventsLastHour > 3) risk += 0.4;

    if (user.violations > 3) risk += 0.3;

    return Math.min(risk, 1);
  }
}

export default new BehaviorAnalyzer();