// utils/redisClient.js
import Redis from "ioredis";
// utils/redisClient.js

class FakeRedis {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value) {
    this.store.set(key, value);
  }
}

export default new FakeRedis();