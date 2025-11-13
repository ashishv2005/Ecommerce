import { createClient } from "redis";
import { config } from "../config/config";

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis Client Connected"));

const connectRedis = async () => {
  await redisClient.connect();
};

export { redisClient, connectRedis };
export default redisClient;
