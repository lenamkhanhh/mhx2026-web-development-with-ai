import { resolve } from "node:path";

// A normal checkout resolves dependencies from its own node_modules. This
// optional override only supports the constrained shared-worktree test runner.
const dependencyRoot = process.env.EVENTS_TEST_NODE_MODULES;
const aliases = dependencyRoot
  ? [
      { find: "react", replacement: resolve(dependencyRoot, "react") },
      { find: "react-dom", replacement: resolve(dependencyRoot, "react-dom") },
      { find: "@testing-library/react", replacement: resolve(dependencyRoot, "@testing-library/react") },
      { find: "@testing-library/user-event", replacement: resolve(dependencyRoot, "@testing-library/user-event") },
    ]
  : [];

export default {
  resolve: {
    alias: aliases,
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost/" },
    },
    include: ["final-group/src/features/events/**/*.test.{ts,tsx}"],
  },
};