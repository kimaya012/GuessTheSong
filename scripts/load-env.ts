import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true }); // fall back to .env if present
