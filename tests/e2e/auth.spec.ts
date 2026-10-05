import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E_OUTBOX } from "../../playwright.config";

/**
 * Accounts as a real user meets them: sign up, confirm the email from the link Kept sends,
 * recover a forgotten password, and change it (which signs out the other browser).
 * Emails are read from the outbox folder the test server writes to.
 */

function latestLink(to: string, route: "verify-email" | "reset-password"): string {
  const files = readdirSync(E2E_OUTBOX).sort().reverse();
  for (const f of files) {
    const mail = JSON.parse(readFileSync(path.join(E2E_OUTBOX, f), "utf8")) as { to: string; action?: { url: string } };
    if (mail.to === to && mail.action?.url.includes(`/${route}?token=`)) {
      const url = new URL(mail.action.url);
      return `${url.pathname}${url.search}`;
    }
  }
  throw new Error(`No ${route} email for ${to}`);
}

async function signUp(page: Page, name: string, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/app");
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

test("sign up, confirm the email from the link, then sign out and back in", async ({ page }) => {
  const email = `rosa-${unique()}@kept.test`;
  await signUp(page, "Rosa Diaz", email, "pan-de-rosa-1");

  await expect(page.getByText(`Confirm ${email}.`)).toBeVisible();
  await page.goto(latestLink(email, "verify-email"));
  await expect(page.getByRole("heading", { name: "Email confirmed." })).toBeVisible();
  await page.getByRole("link", { name: "Go to your dashboard" }).click();
  await page.waitForURL("**/app");
  await expect(page.getByText(`Confirm ${email}.`)).toHaveCount(0);

  // Reusing the link fails gracefully.
  await page.goto(latestLink(email, "verify-email"));
  await expect(page.getByRole("heading", { name: "We couldn’t confirm that." })).toBeVisible();

  // Signed out, a deep link goes to sign-in and back to the same page afterwards.
  await page.request.post("/api/auth/logout", { data: {} });
  await page.goto("/app/settings");
  await page.waitForURL(/\/login\?next=%2Fapp%2Fsettings/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-my-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match")).toBeVisible();
  await page.getByLabel("Password").fill("pan-de-rosa-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app/settings");
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
});

test("forgot password: emailed link sets a new password once", async ({ page }) => {
  const email = `fay-${unique()}@kept.test`;
  await signUp(page, "Fay Okoro", email, "first-password-1");
  await page.request.post("/api/auth/logout", { data: {} });

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /Email me a reset link/ }).click();
  await expect(page.getByText(/If an account exists for/)).toBeVisible();

  const link = latestLink(email, "reset-password");
  await page.goto(link);
  await page.getByLabel("New password", { exact: true }).fill("second-password-2");
  await page.getByLabel("Confirm new password", { exact: true }).fill("second-password-2");
  await page.getByRole("button", { name: /Set new password/ }).click();
  await page.waitForURL("**/app?password=reset");

  // The link is single-use.
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "That link has expired." })).toBeVisible();

  await page.request.post("/api/auth/logout", { data: {} });
  await signIn(page, email, "first-password-1");
  await expect(page.getByText("That email and password don't match")).toBeVisible();
  await signIn(page, email, "second-password-2");
  await page.waitForURL("**/app");
});

test("changing the password signs out the other browser", async ({ page, browser }) => {
  const email = `cam-${unique()}@kept.test`;
  await signUp(page, "Cam Lee", email, "first-password-1");

  const other = await browser.newContext();
  const laptop = await other.newPage();
  await signIn(laptop, email, "first-password-1");
  await laptop.waitForURL("**/app");

  await page.goto("/app/settings");
  await page.getByLabel("Current password").fill("first-password-1");
  await page.getByLabel("New password", { exact: true }).fill("second-password-2");
  await page.getByLabel("Confirm", { exact: true }).fill("second-password-2");
  await page.getByRole("button", { name: /Change password/ }).click();
  await expect(page.getByText("Password changed. Other devices were signed out.")).toBeVisible();

  // This browser stays signed in; the other one is sent to the login page.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await laptop.goto("/app");
  await laptop.waitForURL(/\/login/);
  await other.close();
});
