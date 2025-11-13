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
  port: parseInt(process.env.PORT || "3001"),
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "@Ashishv007",
    database: process.env.DB_NAME || "ecommerce",
    dialect: "mysql" as Dialect,
    timezone: "+05:30",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "AK47afifwef",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
  stripe: {
    secretKey:
      process.env.STRIPE_SECRET_KEY ||
      "sk_test_51SBZbID8KLspf4d76yPRjL9HabEjQe7oXrWTKuSxiLA9b9J3S8yB8uwfSltWS0wznLlV2iI0WYSE685V89MSfGvk0090iWCQ6w",
    webhookSecret:
      process.env.STRIPE_WEBHOOK_SECRET ||
      "whsec_8b26e6d574691924df65ea548f0021a3e5341d8f5ba7c3f9291ab55e79eefd1f",
    publicKey:
      process.env.STRIPE_PUBLISHABLE_KEY ||
      "pk_test_51SBZbID8KLspf4d7t9PJXnV8pvpsNboh2r6kmyLG2KHyTE0VEwQbw89PqYPm3kbhrauGOQIIwUqBHG6VzEHakqHy00as0Gaq9R",
  },
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    user: process.env.EMAIL_USER || "infos.webwizard@gmail.com",
    pass: process.env.EMAIL_PASS || "WebWizard@123",
    from: process.env.EMAIL_FROM || "noreply@ecommerce.com",
  },
  app: {
    name: process.env.APP_NAME || "E-Commerce App",
    url: process.env.APP_URL || "http://localhost:3000",
  },
};
