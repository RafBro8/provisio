import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();
  console.log("Connected to MongoDB");

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Provisio API listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
