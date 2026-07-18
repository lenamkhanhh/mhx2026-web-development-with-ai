import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { createProjectStore, type ProjectStore } from "./projectStore";
import { seedProjects } from "./projects";

class CorsOriginError extends Error {}

const httpUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
});

const projectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1_000),
  image: z.string().trim().min(1).max(500),
  technologies: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  link: httpUrlSchema,
});

const projectUpdateSchema = projectSchema.partial().refine((value) => Object.keys(value).length > 0);

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  const configuredOrigin = process.env.CLIENT_ORIGIN;
  return origin === configuredOrigin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function createApp(store: ProjectStore = createProjectStore(seedProjects)) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new CorsOriginError("Origin is not allowed"), false);
      },
    }),
  );
  app.use(express.json({ limit: "50kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/projects", (request, response) => {
    const q = typeof request.query.q === "string" ? request.query.q : undefined;
    const technology =
      typeof request.query.technology === "string" ? request.query.technology : undefined;
    response.json({ data: store.list({ q, technology }) });
  });

  app.get("/api/projects/:id", (request, response) => {
    const project = store.findById(request.params.id);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    response.json({ data: project });
  });

  app.post("/api/projects", (request, response) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid project data" });
      return;
    }
    response.status(201).json({ data: store.create(parsed.data) });
  });

  app.put("/api/projects/:id", (request, response) => {
    const parsed = projectSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid project data" });
      return;
    }
    const project = store.replace(request.params.id, parsed.data);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    response.json({ data: project });
  });

  app.patch("/api/projects/:id", (request, response) => {
    const parsed = projectUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid project data" });
      return;
    }
    const project = store.update(request.params.id, parsed.data);
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    response.json({ data: project });
  });

  app.delete("/api/projects/:id", (request, response) => {
    if (!store.delete(request.params.id)) {
      response.status(404).json({ error: "Project not found" });
      return;
    }
    response.status(204).end();
  });

  app.use((_request, response) => {
    response.status(404).json({ error: "Route not found" });
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof CorsOriginError) {
        response.status(403).json({ error: "Origin is not allowed" });
        return;
      }
      response.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
