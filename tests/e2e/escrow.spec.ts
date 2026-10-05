import { expect, test, type Page } from "@playwright/test";

/**
 * Golden path through both sides of a pact, exactly as a judge would click it:
 * countersign → fund with PayPal (simulator in CI) → deliver → AI referee →
 * approve → PayPal payout; plus mediation, anti-ghosting and the composer.
 */

async function startDemo(page: Page, as: "client" | "freelancer") {
  const res = await page.request.post("/api/auth/demo", { data: { as } });
  expect(res.ok()).toBeTruthy();
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  await page.getByRole("button", {name:"Skip guide"}).click();
}

async function switchPersona(page: Page, to: "Ana" | "Maya") {
  await page.getByRole("button", { name: new RegExp(`Switch to ${to}`) }).click();
  const guide = page.getByRole("button", {name:"Skip guide"});
  await guide.waitFor({state:"visible",timeout:2000}).then(()=>guide.click()).catch(()=>{});
  await expect(page.getByText(new RegExp(`you are ${to === "Ana" ? "Ana Reyes" : "Maya Chen"}`))).toBeVisible();
}

async function openPact(page: Page, title: RegExp) {
  await page.goto("/app");
  await page.locator(".ag-row", { hasText: title }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

test("full escrow lifecycle across both personas", async ({ page }) => {
  await startDemo(page, "freelancer");

  // Ana countersigns Maya's packaging pact from the invitation.
  const pacts = (await (await page.request.get("/api/pacts")).json()).pacts as { title: string; inviteToken: string; id: string }[];
  const packaging = pacts.find((p) => p.title.startsWith("Holiday Blend packaging"))!;
  await page.goto(`/invite/${packaging.inviteToken}`);
  await page.getByRole("button", { name: /Countersign as/ }).click();
  await page.waitForURL(`**/app/pacts/${packaging.id}`);
  await expect(page.getByText("Signed by both")).toBeVisible();

  // Maya funds milestone 1 with PayPal.
  await switchPersona(page, "Maya");
  await page.goto(`/app/pacts/${packaging.id}`);
  await page.getByRole("button", { name: /Pay \$.* with PayPal/ }).first().click();
  await expect(page.getByText(/Funded!/)).toBeVisible();
  await expect(page.getByText(/is working on it/)).toBeVisible();

  // Ana delivers; the referee reviews.
  await switchPersona(page, "Ana");
  await page.goto(`/app/pacts/${packaging.id}`);
  await page.getByRole("button", { name: /^Submit work$/ }).click();
  await page.getByRole("tab", { name: /Write/ }).click();
  await page.getByPlaceholder(/Paste copy/).fill(
    "Concept A: an engraved lantern wrapped in holly, Holiday Blend lettering in Ember. Concept B: a vintage stamp with a coffee branch, Holiday Blend set in Cream on Roast.",
  );
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("AI Referee verdict").first()).toBeVisible({ timeout: 60_000 });

  // Maya approves and the payout is recorded.
  await switchPersona(page, "Maya");
  await page.goto(`/app/pacts/${packaging.id}`);
  await page.getByRole("button", { name: /Approve & release/ }).click();
  await page.getByRole("button", { name: "Release payment" }).click();
  await expect(page.getByText("Released in full")).toBeVisible();
  await expect(page.getByText("PayPal Payout to freelancer")).toBeVisible();
});

test("AI mediation settles a dispute as payout + refund", async ({ page }) => {
  await startDemo(page, "client");
  await openPact(page, /Instagram launch captions/);
  await page.getByRole("button", { name: /Accept 65\/35 split/ }).click();
  await expect(page.getByText(/You accepted/)).toBeVisible();
  await switchPersona(page, "Ana");
  await openPact(page, /Instagram launch captions/);
  await page.getByRole("button", { name: /Accept 65\/35 split/ }).click();
  await expect(page.getByText("Settled 65/35").first()).toBeVisible();
  await expect(page.getByText("PayPal refund to client")).toBeVisible();
});

test("anti-ghosting: silence releases a PASS, and mediates anything less", async ({ page }) => {
  await startDemo(page, "freelancer");
  await openPact(page, /Menu photo retouching/);
  await page.getByText("Demo controls").click();
  await page.getByRole("button", { name: /Skip ahead/ }).click();
  await expect(page.getByText("Released in full")).toBeVisible();

  await openPact(page, /Brand identity/);
  await page.getByText("Demo controls").click();
  await page.getByRole("button", { name: /Skip ahead/ }).click();
  // The seeded verdict is PARTIAL, so silence opens mediation rather than paying out.
  await expect(page.getByText(/In mediation ·/)).toBeVisible();
});

test("contract compiler turns a DM into a signed pact", async ({ page }) => {
  await startDemo(page, "client");
  await page.goto("/app/pacts/new");
  await page.getByRole("button", { name: /Suspicious DM/ }).click();
  await page.getByRole("button", { name: /Compile into a pact/ }).click();
  await expect(page.getByRole("heading", { name: "Review your pact" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/risk flag/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign & send/ })).toBeDisabled();
  await page.getByText(/I’ve read these warnings/).click();
  await page.getByRole("button", { name: /Sign & send/ }).click();
  await page.waitForURL(/\/app\/pacts\/pct_/);
  await expect(page.getByText(/Waiting for the other party to countersign/)).toBeVisible();
});

test("health, doctor and MCP endpoints respond", async ({ request }) => {
  expect((await request.get("/api/health")).ok()).toBeTruthy();
  expect((await request.get("/api/doctor")).ok()).toBeTruthy();
  const unauth = await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  expect(unauth.status()).toBe(401);
});
