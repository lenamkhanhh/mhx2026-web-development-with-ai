import { readFileSync } from "node:fs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../api/index";

describe("Vercel deployment entrypoint", () => {
  it("serves the existing Express API through the serverless entrypoint", async () => {
    await request(app).get("/api/health").expect(200, { status: "ok" });
  });

  it("routes API requests before falling back to the React SPA", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(config.rewrites).toEqual([
      { source: "/api/(.*)", destination: "/api" },
      { source: "/(.*)", destination: "/index.html" },
    ]);
  });

  it("uses Node ESM-compatible extensions in production server imports", () => {
    const runtimeFiles = ["api/index.ts", "server/app.ts", "server/index.ts", "server/projects.ts"];

    for (const file of runtimeFiles) {
      const source = readFileSync(file, "utf8");
      const relativeImports = [...source.matchAll(/from\s+["'](\.[^"']+)["']/g)];

      for (const [, specifier] of relativeImports) {
        expect(specifier, `${file}: ${specifier}`).toMatch(/\.js$/);
      }
    }
  });
});
