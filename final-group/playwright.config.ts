import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const PROJECT_ID = "demo-tripflow-e2e";
const AUTH_EMULATOR_ORIGIN = "http://127.0.0.1:9099";
const APP_ORIGIN = "http://127.0.0.1:4175";
const APP_URL = `${APP_ORIGIN}/final-group/`;

function resolveChromeExecutable(): string {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE,
    process.env.PROGRAMFILES
      ? `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`
      : undefined,
    process.env["PROGRAMFILES(X86)"]
      ? `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`
      : undefined,
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate));

  const executable = candidates.find((candidate) => existsSync(candidate));
  if (!executable) {
    throw new Error(
      "Local Google Chrome was not found. Set PLAYWRIGHT_CHROME_EXECUTABLE to its absolute path.",
    );
  }
  return executable;
}

const viteEnvironment: Record<string, string> = {
  // These explicit process values take precedence over Vite's .env.local load.
  // No real Firebase project or credential is needed for this isolated suite.
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
  VITE_FIREBASE_APP_ID: "1:000000000000:web:tripflowe2e",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  VITE_FIREBASE_USE_EMULATORS: "true",
  VITE_FIREBASE_AUTH_EMULATOR_PORT: "9099",
  VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: "8085",
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: fileURLToPath(
    new URL("../output/playwright/final-group/test-results/", import.meta.url),
  ),
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: APP_ORIGIN,
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: resolveChromeExecutable(),
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command:
        `node ../node_modules/firebase-tools/lib/bin/firebase.js emulators:start ` +
        `--only auth,firestore --project ${PROJECT_ID} --config firebase.json`,
      url: `${AUTH_EMULATOR_ORIGIN}/emulator/v1/projects/${PROJECT_ID}/config`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command:
        "node ../node_modules/vite/bin/vite.js .. --host 127.0.0.1 --port 4175 --strictPort",
      url: APP_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
      env: viteEnvironment,
    },
  ],
});
