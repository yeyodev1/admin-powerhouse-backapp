import { Response } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { User } from "../models/user.model";
import { CustomError } from "../errors/customError.error";
import { hashPassword } from "../services/auth.service";

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new CustomError("Unauthorized", 401);
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    throw new CustomError("User not found", 404);
  }

  res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
}

export async function getUsers(_req: AuthRequest, res: Response) {
  const users = await User.find().select("-password");
  res.json(users);
}

export async function createUser(req: AuthRequest, res: Response) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new CustomError("Name, email and password are required", 400);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new CustomError("Email already registered", 409);
  }

  const hashed = await hashPassword(password);
  const user = await User.create({ name, email, password: hashed, role: role || "user" });
  const obj = user.toObject();
  delete (obj as any).password;
  res.status(201).json(obj);
}

export async function updateUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, email, role } = req.body;

  const user = await User.findByIdAndUpdate(id, { name, email, role }, { new: true }).select("-password");
  if (!user) {
    throw new CustomError("User not found", 404);
  }
  res.json(user);
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new CustomError("User not found", 404);
  }
  res.json({ message: "User deleted" });
}
