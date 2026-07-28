import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import { verifyToken, AUTH_COOKIE_NAME } from "../utils/jwt";
import type { UserRole } from "../models/User";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    throw new AppError(401, "Not authenticated");
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(401, "Invalid or expired session");
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "Forbidden");
    }
    next();
  };
}
