import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { CustomError } from "../errors/customError.error";

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const user = (req as AuthRequest).user;
  if (!user) {
    throw new CustomError("No authenticated", 401);
  }
  if (user.accountType !== "admin") {
    throw new CustomError("Admin access required", 403);
  }
  next();
}
