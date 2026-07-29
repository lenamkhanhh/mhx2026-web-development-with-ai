import { expect, test } from "@playwright/test";

const AUTH_EMULATOR_ORIGIN = "http://127.0.0.1:9099";

test("a new traveller can create a trip, open Workbench, and log out", async ({
  page,
}, testInfo) => {
  const productionFirebaseRequests: string[] = [];
  page.on("request", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (
      hostname === "identitytoolkit.googleapis.com" ||
      hostname === "firestore.googleapis.com"
    ) {
      productionFirebaseRequests.push(request.url());
    }
  });

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
  await page.getByRole("tab", { name: "Tham gia chuyến đi" }).click();
  await expect(
    page.getByRole("button", { name: "Chưa thể tham gia bằng mã" }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Tạo chuyến đi" }).click();

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

  await page.getByRole("link", { name: "Lịch trình" }).click();
  await page.getByLabel("Tên hoạt động").fill("Đón bình minh");
  await page.getByRole("combobox", { name: "Loại" }).selectOption("activity");
  await page.getByLabel("Bắt đầu").fill("2026-08-10T05:00");
  await page.getByLabel("Kết thúc").fill("2026-08-10T06:00");
  await page.getByRole("checkbox", { name: displayName }).check();
  await page.getByRole("button", { name: "Thêm vào lịch trình" }).click();
  await expect(page.getByText("Đón bình minh", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã duyệt", { exact: true })).toBeVisible();

  await page.getByLabel("Tên hoạt động").fill("Ăn sáng E2E");
  await page.getByRole("combobox", { name: "Loại" }).selectOption("food");
  await page.getByLabel("Bắt đầu").fill("2026-08-10T07:00");
  await page.getByLabel("Kết thúc").fill("2026-08-10T08:00");
  await page.getByRole("checkbox", { name: displayName }).check();
  await page.getByRole("button", { name: "Thêm vào lịch trình" }).click();
  await expect(page.getByText("Ăn sáng E2E", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Đưa Ăn sáng E2E lên" }).click();
  const timeline = page.getByRole("list", { name: "Timeline hoạt động" });
  await expect(timeline.getByRole("listitem").first()).toContainText("Ăn sáng E2E");

  await page.reload();
  await page.getByRole("link", { name: "Lịch trình" }).click();
  await expect(
    page
      .getByRole("list", { name: "Timeline hoạt động" })
      .getByRole("listitem")
      .first(),
  ).toContainText("Ăn sáng E2E");

  await page.getByRole("link", { name: "Chi phí" }).click();
  await page.getByLabel("Tên khoản chi").fill("Bữa tối E2E");
  await page.getByLabel("Số tiền (VND)").fill("450000");
  await page.getByRole("button", { name: "Thêm khoản chi" }).click();
  await expect(
    page.getByLabel("Danh sách chi phí").getByText("Bữa tối E2E", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chốt Bữa tối E2E" }).click();
  await expect(
    page.getByRole("dialog", { name: "Xác nhận chốt khoản chi" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận chốt" }).click();
  await expect(page.getByText("Đã chốt", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Thành viên" }).click();
  const responsibility = page.getByRole("textbox", {
    name: `Trách nhiệm của ${displayName}`,
  });
  await responsibility.fill("Điều phối lịch trình");
  await page.getByRole("button", { name: "Lưu trách nhiệm" }).click();
  await expect(page.getByText("Đã lưu trách nhiệm", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(
    page.getByRole("heading", { name: "Chào mừng trở lại" }),
  ).toBeVisible();

  const loginRequestPromise = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/accounts:signInWithPassword"),
  );
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  const loginRequest = await loginRequestPromise;
  expect(new URL(loginRequest.url()).origin).toBe(AUTH_EMULATOR_ORIGIN);

  await expect(
    page.getByRole("navigation", { name: "Điều hướng TripFlow" }),
  ).toBeVisible();
  await expect(page.getByLabel("Chuyến đi đang mở")).toContainText(tripName);
  expect(productionFirebaseRequests).toEqual([]);
});
