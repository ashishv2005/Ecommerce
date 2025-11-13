import { Dialect } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

export interface Config {
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    dialect: Dialect;
    timezone: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    publicKey: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  app: {
    name: string;
    url: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || ""),
  database: {
    host: process.env.DB_HOST || "",
    port: parseInt(process.env.DB_PORT || ""),
    username: process.env.DB_USER || "",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "",
    dialect: "mysql" as Dialect,
    timezone: "+05:30",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: process.env.JWT_EXPIRES_IN || "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  },
  email: {
    host: process.env.EMAIL_HOST || "",
    port: parseInt(process.env.EMAIL_PORT || ""),
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
    from: process.env.EMAIL_FROM || "",
  },
  app: {
    name: process.env.APP_NAME || "",
    url: process.env.APP_URL || "http://localhost:3000",
  },
};
