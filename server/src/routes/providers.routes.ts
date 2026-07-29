import { Router } from "express";
import {
  listProviders,
  getProviderDetail,
  getMyProfile,
  updateMyProfile,
  getAvailability,
} from "../controllers/providers.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

export const providersRouter = Router();

// More specific "me" routes must be registered before the "/:id" param route.
providersRouter.get("/me/profile", requireAuth, requireRole("provider"), getMyProfile);
providersRouter.put("/me/profile", requireAuth, requireRole("provider"), updateMyProfile);

providersRouter.get("/", listProviders);
providersRouter.get("/:id", getProviderDetail);
providersRouter.get("/:id/availability", getAvailability);
