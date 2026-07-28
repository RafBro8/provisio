import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User, ProviderProfile } from "../models";
import type { UserRole } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { signToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE_MS } from "../utils/jwt";
import { env } from "../config/env";

const SALT_ROUNDS = 10;

// Admin accounts are provisioned out-of-band (e.g. a seed script), never via public registration.
const SELF_REGISTERABLE_ROLES: UserRole[] = ["customer", "provider"];

function setAuthCookie(res: Response, userId: string, role: UserRole): void {
  const token = signToken({ sub: userId, role });
  const isProd = env.nodeEnv === "production";

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    // Frontend and backend will live on different domains in production
    // (Vercel + Render), which makes this a cross-site cookie — that
    // requires SameSite=None, which in turn requires Secure=true.
    sameSite: isProd ? "none" : "lax",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

function sanitizeUser(user: { _id: unknown; name: string; email: string; role: UserRole }) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = req.body ?? {};

  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    throw new AppError(400, "name, email, and password are required");
  }
  if (!SELF_REGISTERABLE_ROLES.includes(role)) {
    throw new AppError(400, "role must be 'customer' or 'provider'");
  }
  if (password.length < 8) {
    throw new AppError(400, "password must be at least 8 characters");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError(409, "An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, role });

  if (role === "provider") {
    await ProviderProfile.create({ userId: user._id });
  }

  setAuthCookie(res, String(user._id), user.role);
  res.status(201).json({ user: sanitizeUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError(400, "email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, "Invalid email or password");
  }

  setAuthCookie(res, String(user._id), user.role);
  res.json({ user: sanitizeUser(user) });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  // requireAuth runs first and guarantees req.user is set here.
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw new AppError(401, "Not authenticated");
  }
  res.json({ user: sanitizeUser(user) });
}
