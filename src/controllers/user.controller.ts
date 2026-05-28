import { Response } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { getUserById } from "../services/auth.service";
import { CustomError } from "../errors/customError.error";

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new CustomError("Unauthorized", 401);
  }

  const user = await getUserById(req.user.userId);
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