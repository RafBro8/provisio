import { Router } from "express";
import { createService, listMyServices, updateService } from "../controllers/services.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

export const servicesRouter = Router();

servicesRouter.post("/", requireAuth, requireRole("provider"), createService);
servicesRouter.get("/mine", requireAuth, requireRole("provider"), listMyServices);
servicesRouter.patch("/:id", requireAuth, requireRole("provider", "admin"), updateService);
