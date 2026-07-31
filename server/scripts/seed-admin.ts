import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { env } from "../src/config/env";
import { User } from "../src/models/User";

// Admin accounts can't be created through the public /auth/register endpoint
// on purpose (see auth.controller.ts) — this script is the intended way to
// provision one. Run with `npm run seed:admin` from server/.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@provisio.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Provisio Admin";

async function main(): Promise<void> {
  await mongoose.connect(env.mongoUri);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash, role: "admin" });
    console.log(`Created admin account: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
