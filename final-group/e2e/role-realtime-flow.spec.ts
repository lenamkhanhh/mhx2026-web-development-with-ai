import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { expect, test, type Page } from "@playwright/test";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-tripflow-e2e";
const SYNTHETIC_PASSWORD = "Synthetic-E2E-Only-2026!";

test("lead and member permissions stay consistent across realtime updates", async ({
  browser,
  page: leadPage,
}, testInfo) => {
  test.setTimeout(60_000);
  const runId = `${Date.now()}-${testInfo.parallelIndex}`;
  const lead = {
    email: `tripflow-lead-${runId}@example.test`,
    displayName: `Lead ${runId}`,
  };
  const member = {
    email: `tripflow-member-${runId}@example.test`,
    displayName: `Member ${runId}`,
  };
  const tripName = `Role Trip ${runId}`;
  const memberEvent = `Member proposal ${runId}`;
  const memberExpense = `Member expense ${runId}`;
  const productionRequests: string[] = [];
  guardProductionFirebase(leadPage, productionRequests);

  await register(leadPage, lead);
  await createTrip(leadPage, tripName);
  const tripId = await leadPage.getByLabel("Chuyến đi đang mở").inputValue();

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  guardProductionFirebase(memberPage, productionRequests);
  try {
    await register(memberPage, member);
    await seedMember(tripId, member);

    await expect(
      memberPage.getByRole("navigation", { name: "Điều hướng TripFlow" }),
    ).toBeVisible();
    await expect(memberPage.getByText("MEMBER", { exact: true })).toBeVisible();

    await memberPage.getByRole("link", { name: "Lịch trình" }).click();
    await memberPage.getByLabel("Tên hoạt động").fill(memberEvent);
    await memberPage.getByLabel("Bắt đầu").fill("2026-08-20T09:00");
    await memberPage.getByLabel("Kết thúc").fill("2026-08-20T10:00");
    await memberPage.getByRole("checkbox", { name: member.displayName }).check();
    await memberPage
      .getByRole("button", { name: "Thêm vào lịch trình" })
      .click();
    const memberEventRow = memberPage
      .getByRole("listitem")
      .filter({ hasText: memberEvent });
    await expect(
      memberEventRow.getByText("Chờ duyệt"),
    ).toBeVisible();
    await expect(
      memberEventRow.getByRole("button", { name: "Duyệt" }),
    ).toHaveCount(0);

    await leadPage.getByRole("link", { name: "Lịch trình" }).click();
    const leadEventRow = leadPage
      .getByRole("listitem")
      .filter({ hasText: memberEvent });
    await expect(leadEventRow.getByText("Chờ duyệt")).toBeVisible();
    await leadEventRow.getByRole("button", { name: "Duyệt" }).click();
    await expect(
      memberEventRow.getByText("Đã duyệt"),
    ).toBeVisible();

    await memberPage.getByRole("link", { name: "Chi phí" }).click();
    await memberPage.getByLabel("Tên khoản chi").fill(memberExpense);
    await memberPage.getByLabel("Số tiền (VND)").fill("320000");
    await memberPage.getByRole("button", { name: "Thêm khoản chi" }).click();
    await expect(
      memberPage
        .getByLabel("Danh sách chi phí")
        .getByText(memberExpense, { exact: true }),
    ).toBeVisible();
    await expect(
      memberPage.getByRole("button", { name: `Chốt ${memberExpense}` }),
    ).toHaveCount(0);

    await leadPage.getByRole("link", { name: "Chi phí" }).click();
    await leadPage
      .getByRole("button", { name: `Chốt ${memberExpense}` })
      .click();
    await leadPage.getByRole("button", { name: "Xác nhận chốt" }).click();
    await expect(
      memberPage
        .getByLabel("Danh sách chi phí")
        .getByText(/Đã chốt/),
    ).toBeVisible();

    await memberPage.getByRole("link", { name: "Thành viên" }).click();
    await memberPage
      .getByRole("textbox", {
        name: `Trách nhiệm của ${member.displayName}`,
      })
      .fill("Ghi hình");
    await memberPage
      .getByRole("button", { name: "Lưu trách nhiệm" })
      .click();
    await expect(
      memberPage.getByText("Đã lưu trách nhiệm", { exact: true }),
    ).toBeVisible();

    await leadPage.getByRole("link", { name: "Thành viên" }).click();
    await expect(
      leadPage.getByRole("textbox", {
        name: `Trách nhiệm của ${member.displayName}`,
      }),
    ).toHaveValue("Ghi hình");
    await leadPage
      .getByRole("button", {
        name: `Xóa ${member.displayName} khỏi chuyến đi`,
      })
      .click();
    await leadPage.getByRole("button", { name: "Xác nhận xóa" }).click();

    await expect(
      leadPage.getByText(member.displayName, { exact: true }),
    ).toHaveCount(0);
    await expect(memberPage.getByTestId("onboarding-workbench")).toBeVisible();
    expect(productionRequests).toEqual([]);
  } finally {
    await memberContext.close();
  }
});

async function register(
  page: Page,
  user: { email: string; displayName: string },
): Promise<void> {
  await page.goto("/final-group/");
  await page.getByRole("tab", { name: "Đăng ký" }).click();
  await page.getByLabel("Tên hiển thị").fill(user.displayName);
  await page.getByLabel("Email").fill(user.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(SYNTHETIC_PASSWORD);
  await page.getByLabel("Xác nhận mật khẩu").fill(SYNTHETIC_PASSWORD);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(page.getByTestId("onboarding-workbench")).toBeVisible();
}

async function createTrip(page: Page, tripName: string): Promise<void> {
  await page.getByLabel("Tên chuyến đi").fill(tripName);
  await page.getByLabel("Điểm đến").fill("Đà Nẵng");
  await page.getByLabel("Ngày bắt đầu").fill("2026-08-20");
  await page.getByLabel("Ngày kết thúc").fill("2026-08-22");
  await page.getByRole("button", { name: "Tạo chuyến đi mới" }).click();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng TripFlow" }),
  ).toBeVisible();
}

async function seedMember(
  tripId: string,
  member: { email: string; displayName: string },
): Promise<void> {
  let environment: RulesTestEnvironment | undefined;
  try {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host: "127.0.0.1", port: 8085 },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      const profiles = await getDocs(collection(firestore, "users"));
      const profile = profiles.docs.find(
        (candidate) => candidate.data().email === member.email,
      );
      if (!profile) throw new Error("Synthetic member profile was not created.");

      await setDoc(doc(firestore, "trips", tripId, "members", profile.id), {
        displayName: member.displayName,
        email: member.email,
        role: "member",
        responsibility: "",
        isDemo: false,
        joinedAt: Timestamp.now(),
      });
      await updateDoc(doc(firestore, "users", profile.id), {
        tripIds: arrayUnion(tripId),
        updatedAt: Timestamp.now(),
      });
    });
  } finally {
    await environment?.cleanup();
  }
}

function guardProductionFirebase(page: Page, requests: string[]): void {
  page.on("request", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (
      hostname === "identitytoolkit.googleapis.com" ||
      hostname === "firestore.googleapis.com"
    ) {
      requests.push(request.url());
    }
  });
}
