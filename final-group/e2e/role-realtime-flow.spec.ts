import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { expect, test, type Page } from "@playwright/test";
import { arrayUnion, collection, doc, getDocs, setDoc, Timestamp, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-tripflow-e2e";
const SYNTHETIC_PASSWORD = "Synthetic-E2E-Only-2026!";

test("lead approval and member collaboration stay realtime and permission-aware", async ({ browser, page: leadPage }, testInfo) => {
  test.setTimeout(100_000);
  const runId = `${Date.now()}-${testInfo.parallelIndex}`;
  const lead = { email: `tripflow-lead-${runId}@example.test`, displayName: `Lead ${runId}` };
  const member = { email: `tripflow-member-${runId}@example.test`, displayName: `Member ${runId}` };
  const tripName = `Role Trip ${runId}`;
  const memberEvent = `Member proposal ${runId}`;

  await register(leadPage, lead);
  await createTrip(leadPage, tripName);
  const tripId = await leadPage.getByLabel("Current trip").inputValue();
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  try {
    await register(memberPage, member);
    await seedMember(tripId, member);
    await memberPage.reload();
    await leadPage.reload();
    await expect(memberPage.getByText("MEMBER", { exact: true })).toBeVisible();

    await memberPage.getByRole("link", { name: "Timeline" }).click();
    await memberPage.getByTestId("events-add-button").click();
    await memberPage.getByLabel("Item title").fill(memberEvent);
    await memberPage.getByLabel("Description").fill("Member proposal awaiting lead review.");
    await memberPage.getByLabel("Start").fill("2026-08-20T09:00");
    await memberPage.getByLabel("End").fill("2026-08-20T10:00");
    await memberPage.getByRole("checkbox", { name: member.displayName }).check();
    await memberPage.getByRole("button", { name: "Add to timeline" }).click();
    const memberEventRow = memberPage.getByRole("listitem").filter({ hasText: memberEvent });
    await expect(memberEventRow.getByText("In review", { exact: true })).toBeVisible();

    await leadPage.reload();
    await leadPage.getByRole("link", { name: "Timeline" }).click();
    const leadEventRow = leadPage.getByRole("listitem").filter({ hasText: memberEvent });
    await expect(leadEventRow.getByText("In review", { exact: true })).toBeVisible();
    await leadEventRow.getByRole("button", { name: `Open actions for ${memberEvent}` }).click();
    await leadEventRow.getByRole("button", { name: "Approve" }).click();
    await expect(memberEventRow.getByText("Open", { exact: true })).toBeVisible();
    await leadEventRow.getByRole("button", { name: `Open actions for ${memberEvent}` }).click();

    await memberPage.getByRole("button", { name: "Close item composer" }).click();
    await memberPage.getByRole("button", { name: `Open ${memberEvent} details` }).click();
    const memberDetails = memberPage.getByRole("complementary", { name: "Event details" });
    await memberDetails.getByRole("tab", { name: "Notes" }).click();
    await memberDetails.getByLabel("New note").fill("The member has checked transport.");
    await memberDetails.getByRole("button", { name: "Add note" }).click();
    await expect(
      memberDetails
        .getByRole("region", { name: "Event notes" })
        .getByText("The member has checked transport."),
    ).toBeVisible();

    await leadPage.getByRole("button", { name: `Open ${memberEvent} details` }).click();
    const leadDetails = leadPage.getByRole("complementary", { name: "Event details" });
    await leadDetails.getByRole("tab", { name: "Notes" }).click();
    await expect(
      leadDetails
        .getByRole("region", { name: "Event notes" })
        .getByText("The member has checked transport."),
    ).toBeVisible();
  } finally {
    await memberContext.close();
  }
});

async function register(page: Page, user: { email: string; displayName: string }): Promise<void> {
  await page.goto("/final-group/");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill(user.displayName);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(SYNTHETIC_PASSWORD);
  await page.getByLabel("Confirm password").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("onboarding-workbench")).toBeVisible();
}

async function createTrip(page: Page, tripName: string): Promise<void> {
  await page.getByLabel("Trip name").fill(tripName);
  await page.getByLabel("Destination").fill("Da Nang");
  await page.getByLabel("Start date").fill("2026-08-20");
  await page.getByLabel("End date").fill("2026-08-22");
  await page.getByRole("button", { name: "Create new trip" }).click();
  await expect(page.getByRole("navigation", { name: "TripFlow navigation" })).toBeVisible();
}

async function seedMember(tripId: string, member: { email: string; displayName: string }): Promise<void> {
  let environment: RulesTestEnvironment | undefined;
  try {
    environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { host: "127.0.0.1", port: 8085 } });
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      const profiles = await getDocs(collection(firestore, "users"));
      const profile = profiles.docs.find((candidate) => candidate.data().email === member.email);
      if (!profile) throw new Error("Synthetic member profile was not created.");
      await setDoc(doc(firestore, "trips", tripId, "members", profile.id), { displayName: member.displayName, email: member.email, role: "member", responsibility: "", isDemo: false, joinedAt: Timestamp.now() });
      await updateDoc(doc(firestore, "users", profile.id), { tripIds: arrayUnion(tripId), updatedAt: Timestamp.now() });
    });
  } finally {
    await environment?.cleanup();
  }
}
