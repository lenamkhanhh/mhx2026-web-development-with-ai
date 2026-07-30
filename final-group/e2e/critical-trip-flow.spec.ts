import { expect, test } from "@playwright/test";

const AUTH_EMULATOR_ORIGIN = "http://127.0.0.1:9099";

test("a traveller persists timeline notes, sub-items, and activity through Firestore", async ({ page }, testInfo) => {
  test.setTimeout(70_000);
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) externalRequests.push(request.url());
  });

  const runId = `${Date.now()}-${testInfo.parallelIndex}`;
  const email = `tripflow-e2e-${runId}@example.test`;
  const password = "Synthetic-E2E-Only-2026!";
  const displayName = `E2E Traveller ${runId}`;
  const tripName = `E2E Trip ${runId}`;
  const eventTitle = `Sunrise ${runId}`;
  const eventLocation = "Tuyen Lam Lake";

  await page.goto("/final-group/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  const signUpRequestPromise = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/accounts:signUp"));
  await page.getByRole("button", { name: "Create account" }).click();
  expect(new URL((await signUpRequestPromise).url()).origin).toBe(AUTH_EMULATOR_ORIGIN);

  await expect(page.getByTestId("onboarding-workbench")).toBeVisible();
  await page.getByLabel("Trip name").fill(tripName);
  await page.getByLabel("Destination").fill("Da Lat");
  await page.getByLabel("Start date").fill("2026-08-10");
  await page.getByLabel("End date").fill("2026-08-12");
  await page.getByRole("button", { name: "Create new trip" }).click();
  await expect(page.getByRole("navigation", { name: "TripFlow navigation" })).toBeVisible();

  await page.getByRole("link", { name: "Timeline" }).click();
  await page.getByTestId("events-add-button").click();
  await page.getByLabel("Item title").fill(eventTitle);
  await page.getByLabel("Start").fill("2026-08-10T05:00");
  await page.getByLabel("End").fill("2026-08-10T06:00");
  await page.getByLabel("Location").fill(eventLocation);
  await page.getByLabel("Assignee").selectOption({ label: displayName });
  await page.getByLabel("Priority").selectOption("high");
  await page.getByRole("checkbox", { name: displayName }).check();
  await page.getByRole("button", { name: "Add to timeline" }).click();
  const eventRow = page.getByRole("list", { name: "Trip timeline" }).getByRole("listitem").filter({ hasText: eventTitle });
  await expect(eventRow).toBeVisible();
  await page.getByRole("button", { name: "Close item composer" }).click();

  await page.getByRole("button", { name: `Open ${eventTitle} details` }).click();
  const details = page.getByRole("complementary", { name: "Event details" });
  await details.getByRole("tab", { name: "Notes" }).click();
  await details.getByLabel("New note").fill("Bring a light jacket.");
  await details.getByRole("button", { name: "Add note" }).click();
  await expect(details.getByText("Bring a light jacket.")).toBeVisible();

  await details.getByRole("tab", { name: "Sub-items" }).click();
  await details.getByLabel("New sub-item").fill("Confirm the meeting point");
  await details.getByRole("button", { name: "Add sub-item" }).click();
  await expect(details.getByText("Confirm the meeting point")).toBeVisible();
  const completionBox = details.getByRole("checkbox", { name: "Mark Confirm the meeting point complete" });
  await completionBox.click();
  await expect(details.getByRole("checkbox", { name: "Mark Confirm the meeting point open" })).toBeChecked();

  await page.reload();
  await page.getByRole("link", { name: "Timeline" }).click();
  await page.getByRole("button", { name: `Open ${eventTitle} details` }).click();
  const reloadedDetails = page.getByRole("complementary", { name: "Event details" });
  await reloadedDetails.getByRole("tab", { name: "Notes" }).click();
  await expect(reloadedDetails.getByText("Bring a light jacket.")).toBeVisible();
  await reloadedDetails.getByRole("tab", { name: "Sub-items" }).click();
  await expect(reloadedDetails.getByRole("checkbox", { name: "Mark Confirm the meeting point open" })).toBeChecked();

  await page.getByRole("link", { name: "Overview" }).click();
  const itinerary = page.getByRole("table", { name: "Trip itinerary" });
  await expect(itinerary.getByText(eventLocation)).toBeVisible();
  await expect(itinerary.getByLabel(displayName)).toBeVisible();
  await expect(itinerary.getByText("high", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Trip context" }).getByText("Completed sub-item “Confirm the meeting point”")).toBeVisible();
  expect(externalRequests).toEqual([]);
});
