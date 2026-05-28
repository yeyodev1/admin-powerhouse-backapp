import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/user.model";
import { CustomError } from "../errors/customError.error";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export interface AuthTokens {
  access_token: string;
  user: { id: string; name: string; email: string; role: string };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { userId: string; email: string; accountType: string; isInternal: boolean }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; email: string; accountType: string; isInternal: boolean } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; accountType: string; isInternal: boolean };
}

export async function registerUser(data: { name: string; email: string; password: string }): Promise<AuthTokens> {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new CustomError("Email already registered", 409);
  }

  const hashedPassword = await hashPassword(data.password);
  const user = await User.create({ ...data, password: hashedPassword });

  const token = generateToken({ userId: user._id.toString(), email: user.email, accountType: user.role, isInternal: user.isInternal ?? false });

  return {
    access_token: token,
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
  };
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthTokens> {
  const user = await User.findOne({ email: data.email });
  if (!user) {
    throw new CustomError("Invalid credentials", 401);
  }

  const valid = await verifyPassword(data.password, user.password);
  if (!valid) {
    throw new CustomError("Invalid credentials", 401);
  }

  const token = generateToken({ userId: user._id.toString(), email: user.email, accountType: user.role, isInternal: user.isInternal ?? false });

  return {
    access_token: token,
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
  };
}

export async function getUserById(userId: string): Promise<IUser | null> {
  return User.findById(userId);
}