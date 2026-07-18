import { readFileSync } from "node:fs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./index";

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
});
