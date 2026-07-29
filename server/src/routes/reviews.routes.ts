import { Router } from "express";
import { createReview, listProviderReviews } from "../controllers/reviews.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

export const reviewsRouter = Router();

reviewsRouter.post("/", requireAuth, requireRole("customer"), createReview);
reviewsRouter.get("/provider/:providerId", listProviderReviews);
