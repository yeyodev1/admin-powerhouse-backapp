import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { CustomError } from "../errors/customError.error";

/** Roles con acceso al módulo de estudios: administradores y asesores */
export const STAFF_ROLES = ["admin", "advisor"];

/**
 * Igual que `adminMiddleware` pero también deja pasar a los asesores.
 * Se usa en estudios: el asesor los lee, los edita y los envía por WhatsApp;
 * la gestión de usuarios sigue siendo exclusiva de admin.
 */
export function staffMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) throw new CustomError("No authenticated", 401);
  if (!STAFF_ROLES.includes(user.accountType)) {
    throw new CustomError("Se requiere perfil de administrador o asesor", 403);
  }
  next();
}
