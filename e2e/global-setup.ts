import { execSync } from "node:child_process";
import path from "node:path";
import { E2E_MONGODB_URI, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ADMIN_NAME } from "./tests/helpers/constants";

const SERVER_DIR = path.resolve(__dirname, "../server");

// Admin accounts can't be created through the public API by design (see
// server/src/controllers/auth.controller.ts), so the e2e admin-override spec
// needs one seeded some other way. Rather than reimplementing the
// bcrypt-hashing logic here, this just runs the actual script the project
// ships for provisioning admins (server/scripts/seed-admin.ts) against the
// e2e database, pointed at throwaway test credentials.
export default function globalSetup(): void {
  execSync("npm run seed:admin", {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      MONGODB_URI: E2E_MONGODB_URI,
      SEED_ADMIN_EMAIL: E2E_ADMIN_EMAIL,
      SEED_ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      SEED_ADMIN_NAME: E2E_ADMIN_NAME,
    },
    stdio: "inherit",
  });
}
