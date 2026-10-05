import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Every test file gets an isolated SQLite database, the PayPal simulator and the offline AI.
const dir = mkdtempSync(path.join(tmpdir(), "kept-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.PAYPAL_CLIENT_ID = "";
process.env.PAYPAL_CLIENT_SECRET = "";
process.env.AI_PROVIDER = "offline";
process.env.ANTHROPIC_API_KEY = "";
process.env.GEMINI_API_KEY = "";
