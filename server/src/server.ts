import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { assertBookingIndex } from "./config/indexes";

async function main() {
  await connectDB();
  console.log("Connected to MongoDB");

  // Before accepting any traffic: a booking system that can't guarantee a
  // slot is booked once is worse down than up.
  await assertBookingIndex();
  console.log("Booking uniqueness index verified");

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Provisio API listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
