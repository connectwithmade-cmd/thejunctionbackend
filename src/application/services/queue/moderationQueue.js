// queue/moderationQueue.js
import { Queue } from "bullmq";
import redis from "../utils/redisClient.js";

export const moderationQueue = new Queue("moderation", {
  connection: redis,
});