import { Response } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { registerUser, loginUser } from "../services/auth.service";
import { CustomError } from "../errors/customError.error";

export async function register(req: AuthRequest, res: Response) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new CustomError("Name, email and password are required", 400);
  }

  if (password.length < 8) {
    throw new CustomError("Password must be at least 8 characters", 400);
  }

  const result = await registerUser({ name, email, password });
  res.status(201).json(result);
}

export async function login(req: AuthRequest, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new CustomError("Email and password are required", 400);
  }

  const result = await loginUser({ email, password });
  res.json(result);
}