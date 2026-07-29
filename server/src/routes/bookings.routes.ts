import { Router } from "express";
import {
  createBooking,
  listMyBookingsAsCustomer,
  listMyBookingsAsProvider,
  cancelBooking,
  rescheduleBooking,
} from "../controllers/bookings.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

export const bookingsRouter = Router();

bookingsRouter.post("/", requireAuth, requireRole("customer"), createBooking);
bookingsRouter.get("/mine", requireAuth, requireRole("customer"), listMyBookingsAsCustomer);
bookingsRouter.get("/provider-mine", requireAuth, requireRole("provider"), listMyBookingsAsProvider);
bookingsRouter.patch("/:id/cancel", requireAuth, cancelBooking);
bookingsRouter.patch("/:id/reschedule", requireAuth, requireRole("customer", "admin"), rescheduleBooking);
