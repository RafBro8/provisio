import { Router } from "express";
import { listMyNotifications, markAsRead, markAllAsRead } from "../controllers/notifications.controller";
import { requireAuth } from "../middleware/auth.middleware";

export const notificationsRouter = Router();

notificationsRouter.get("/mine", requireAuth, listMyNotifications);
notificationsRouter.patch("/read-all", requireAuth, markAllAsRead);
notificationsRouter.patch("/:id/read", requireAuth, markAsRead);
