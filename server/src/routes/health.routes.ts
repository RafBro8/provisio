import { Router } from "express";
import mongoose from "mongoose";
import { env } from "../config/env";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    // Which database this process is actually talking to. The e2e setup
    // checks it, because a leftover server from another session can answer
    // on the same port while pointed at the dev database. Not exposed in
    // production — nothing outside needs to know it there.
    ...(env.nodeEnv !== "production" && { database: mongoose.connection.name }),
    // Lets a deploy be confirmed from outside: Render keeps the old instance
    // serving if a new one fails to start, so "the site is up" alone doesn't
    // prove the latest commit is what's running.
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    timestamp: new Date().toISOString(),
  });
});
