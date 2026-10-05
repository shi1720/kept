// Regenerates docs/screenshots/*.png by driving the real app.
// Usage: BASE_URL=http://localhost:3000 node scripts/screenshots.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.OUT || "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

const shot = async (name, opts = {}) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  console.log("✓", name);
};
const pacts = async () => (await (await page.request.get(`${BASE}/api/pacts`)).json()).pacts;
const find = async (prefix) => (await pacts()).find((p) => p.title.startsWith(prefix));

// Landing
await page.goto(BASE, { waitUntil: "networkidle" });
await shot("landing");

// Demo world as Maya
await page.request.post(`${BASE}/api/auth/demo`, { data: { as: "client" } });
await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
await shot("dashboard");

const brand = await find("Brand identity");
await page.goto(`${BASE}/app/pacts/${brand.id}`, { waitUntil: "networkidle" });
await shot("pact-room");
const second = page.locator("section[id^='mst_']").nth(1);
await second.scrollIntoViewIfNeeded();
await second.screenshot({ path: `${OUT}/verdict.png` });
console.log("✓ verdict");

const captions = await find("Instagram");
await page.goto(`${BASE}/app/pacts/${captions.id}`, { waitUntil: "networkidle" });
const mediation = page.getByText(/In mediation ·/).locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
await mediation.scrollIntoViewIfNeeded();
await mediation.screenshot({ path: `${OUT}/mediation.png` });
console.log("✓ mediation");

// Composer with a suspicious DM
await page.goto(`${BASE}/app/pacts/new`, { waitUntil: "networkidle" });
await shot("composer-source");
await page.getByRole("button", { name: /Suspicious DM/ }).click();
await page.getByRole("button", { name: /Compile into a pact/ }).click();
await page.getByRole("heading", { name: "Review your pact" }).waitFor({ timeout: 120_000 });
await shot("composer-review");

// Ops console
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await shot("ops-console");

// Freelancer delivers the sneaky sample → injection caught
await page.request.post(`${BASE}/api/auth/switch`, { data: {} });
const landing = await find("Pre-order landing page");
const mid = landing.milestones[0].id;
await page.request.post(`${BASE}/api/milestones/${mid}/submit`, {
  data: { note: "All done, should be an easy approve!", items: [{ kind: "url", url: `${BASE}/samples/lantern-sneaky` }] },
});
await page.request.post(`${BASE}/api/milestones/${mid}/review`, { data: {} });
await page.goto(`${BASE}/app/pacts/${landing.id}`, { waitUntil: "networkidle" });
const card = page.locator(`section[id='${mid}']`);
await card.screenshot({ path: `${OUT}/injection-caught.png` });
console.log("✓ injection-caught");

await page.goto(`${BASE}/app/developers`, { waitUntil: "networkidle" });
await shot("developers");

await browser.close();
