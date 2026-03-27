// queue/moderationWorker.js
import { Worker } from "bullmq";
import redis from "../utils/redisClient.js";
import ModerationEngine from "../moderation/ModerationEngine.js";
import Event from "../domain/models/Event.js";
import User from "../domain/models/User.js";

new Worker(
  "moderation",
  async (job) => {
    const { userId, eventId, content } = job.data;

    const user = await User.findById(userId);
    if (!user) return;

    const result = await ModerationEngine.moderate({
      user,
      content,
    });

    const update = {
      "moderation.status": result.action,
      "moderation.riskScore": result.risk,
    };

    await Event.findByIdAndUpdate(eventId, update);
  },
  { connection: redis }
);