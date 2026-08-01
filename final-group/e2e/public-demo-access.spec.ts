import { expect, test } from "@playwright/test";

test("the public interactive demo needs no account, stays local, and can be exited", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
      externalRequests.push(request.url());
    }
  });

  const eventTitle = `Sandbox item ${Date.now()}`;
  await page.goto("/final-group/?demo=1");
  await expect(page.getByRole("navigation", { name: "TripFlow navigation" })).toBeVisible();
  await expect(page.getByTestId("local-demo-notice")).toContainText("never syncs to Firebase");

  await page.getByRole("link", { name: "Timeline" }).click();
  await page.getByTestId("events-add-button").click();
  await page.getByLabel("Item title").fill(eventTitle);
  await page.getByLabel("Description").fill("Synthetic local-only timeline item.");
  await page.getByLabel("Start").fill("2026-08-01T09:00");
  await page.getByLabel("End").fill("2026-08-01T10:00");
  await page.getByRole("checkbox", { name: "An Nhiên" }).check();
  await page.getByRole("button", { name: "Add to timeline" }).click();
  await expect(page.getByRole("list", { name: "Trip timeline" }).getByText(eventTitle)).toBeVisible();

  await page.reload();
  await page.getByRole("link", { name: "Timeline" }).click();
  await expect(page.getByRole("list", { name: "Trip timeline" }).getByText(eventTitle)).toHaveCount(0);

  await page.getByRole("button", { name: "Exit demo" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(externalRequests).toEqual([]);
});
