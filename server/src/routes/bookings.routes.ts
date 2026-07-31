import { Router } from "express";
import {
  createBooking,
  listMyBookingsAsCustomer,
  listMyBookingsAsProvider,
  listAllBookings,
  cancelBooking,
  rescheduleBooking,
  completeBooking,
} from "../controllers/bookings.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

export const bookingsRouter = Router();

bookingsRouter.post("/", requireAuth, requireRole("customer"), createBooking);
bookingsRouter.get("/", requireAuth, requireRole("admin"), listAllBookings);
bookingsRouter.get("/mine", requireAuth, requireRole("customer"), listMyBookingsAsCustomer);
bookingsRouter.get("/provider-mine", requireAuth, requireRole("provider"), listMyBookingsAsProvider);
bookingsRouter.patch("/:id/cancel", requireAuth, cancelBooking);
bookingsRouter.patch("/:id/reschedule", requireAuth, requireRole("customer", "admin"), rescheduleBooking);
bookingsRouter.patch("/:id/complete", requireAuth, requireRole("provider", "admin"), completeBooking);
