import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["final-group/src/firebase/firestore.rules.test.ts"],
    sequence: {
      concurrent: false,
    },
  },
});
