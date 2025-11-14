import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { config } from "../config/config";
import redis from "../utils/redis";
import { AuthRequest } from "../middleware/auth";
import { hashPassword, comparePassword } from "../utils/helpers";
import { validate as isUUID } from "uuid";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, password, email, role } = req.body;

    const userRole = role === "admin" ? "user" : "user";

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      res.status(400).json({ message: "Username already exists" });
      return;
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      username,
      password: hashedPassword,
      email,
      role: userRole,
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded: any = jwt.verify(token, config.jwt.secret);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      if (expiresIn > 0) {
        await redis.setEx(`blacklist:${token}`, expiresIn, "true");
      }
    }

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId: string = req.user.id;

    // UUID validation added
    if (!isUUID(userId)) {
      res.status(400).json({ message: "Invalid user ID format" });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, username, password, email } = req.body;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      res.status(400).json({ message: "Username already exists" });
      return;
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      username,
      password: hashedPassword,
      email,
      role: "admin",
    });

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
