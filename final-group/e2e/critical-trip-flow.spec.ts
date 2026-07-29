import { expect, test } from "@playwright/test";

const AUTH_EMULATOR_ORIGIN = "http://127.0.0.1:9099";

test("a new traveller can create a trip, open Workbench, and log out", async ({
  page,
}, testInfo) => {
  const runId = `${Date.now()}-${testInfo.parallelIndex}`;
  const email = `tripflow-e2e-${runId}@example.test`;
  const password = "Synthetic-E2E-Only-2026!";
  const displayName = `E2E Traveller ${runId}`;
  const tripName = `E2E Trip ${runId}`;

  await page.goto("/final-group/");
  await expect(
    page.getByRole("heading", { name: "Chào mừng trở lại" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Đăng ký" }).click();
  await page.getByLabel("Tên hiển thị").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByLabel("Xác nhận mật khẩu").fill(password);

  const signUpRequestPromise = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/accounts:signUp"),
  );
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();

  const signUpRequest = await signUpRequestPromise;
  expect(
    new URL(signUpRequest.url()).origin,
    `Firebase Auth must stay inside the local emulator; observed ${signUpRequest.url()}`,
  ).toBe(AUTH_EMULATOR_ORIGIN);

  await expect(
    page.getByRole("heading", { name: "Bắt đầu một chuyến đi" }),
  ).toBeVisible();
  await page.getByLabel("Tên chuyến đi").fill(tripName);
  await page.getByLabel("Điểm đến").fill("Đà Lạt");
  await page.getByLabel("Ngày bắt đầu").fill("2026-08-10");
  await page.getByLabel("Ngày kết thúc").fill("2026-08-12");
  await page.getByRole("button", { name: "Tạo chuyến đi mới" }).click();

  await expect(
    page.getByRole("navigation", { name: "Điều hướng TripFlow" }),
  ).toBeVisible();
  await expect(page.getByLabel("Chuyến đi đang mở")).toHaveValue(
    /.+/,
  );
  await expect(page.getByLabel("Chuyến đi đang mở")).toContainText(tripName);

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(
    page.getByRole("heading", { name: "Chào mừng trở lại" }),
  ).toBeVisible();
});
