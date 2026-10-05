import { test, expect } from "@playwright/test";

test("mobile landing cards open accessible visual walkthroughs", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.getByText("AI credits included")).toBeVisible();
  for (let i=0;i<3;i++) {
    await page.locator(".workflow-card").nth(i).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("img")).toBeVisible();
    await expect(page.locator(".workflow-card").nth(i)).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(4700);
    await expect(page.locator(".workflow-card").nth(i)).toHaveClass(/selected/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  await page.getByRole("button",{name:"Explore the demo",exact:true}).click();
  await expect(page.getByRole("button",{name:/Try as Maya/})).toBeVisible();
});
