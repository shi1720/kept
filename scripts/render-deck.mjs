// Renders docs/deck/index.html to docs/Kept-pitch-deck.pdf (+ PNG previews with PREVIEW=1).
import { chromium } from "@playwright/test";
import path from "node:path";

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`file://${path.resolve("docs/deck/index.html")}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: "docs/Kept-pitch-deck.pdf", width: "1920px", height: "1080px", printBackground: true });
if (process.env.PREVIEW) {
  const slides = await page.$$(".slide");
  for (const [i, s] of slides.entries()) await s.screenshot({ path: `${process.env.PREVIEW}/slide-${String(i + 1).padStart(2, "0")}.png` });
}
console.log("deck rendered");
await browser.close();
