import { describe, expect, it } from "vitest";

import {
  FirebaseEmulatorConfigurationError,
  resolveFirebaseEmulatorTarget,
} from "./runtime";

describe("Firebase emulator runtime boundary", () => {
  it("stays disabled unless the local emulator flag is explicitly true", () => {
    expect(resolveFirebaseEmulatorTarget({})).toBeNull();
    expect(
      resolveFirebaseEmulatorTarget({
        VITE_FIREBASE_USE_EMULATORS: "false",
      }),
    ).toBeNull();
  });

  it("uses loopback-only defaults for Auth and Firestore", () => {
    expect(
      resolveFirebaseEmulatorTarget({
        VITE_FIREBASE_USE_EMULATORS: "true",
      }),
    ).toEqual({
      host: "127.0.0.1",
      authPort: 9099,
      firestorePort: 8085,
    });
  });

  it("accepts explicit local ports for an isolated E2E run", () => {
    expect(
      resolveFirebaseEmulatorTarget({
        VITE_FIREBASE_USE_EMULATORS: "true",
        VITE_FIREBASE_AUTH_EMULATOR_PORT: "9199",
        VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: "8185",
      }),
    ).toEqual({
      host: "127.0.0.1",
      authPort: 9199,
      firestorePort: 8185,
    });
  });

  it.each(["0", "65536", "not-a-port", "9099.5"])(
    "rejects an unsafe emulator port: %s",
    (port) => {
      expect(() =>
        resolveFirebaseEmulatorTarget({
          VITE_FIREBASE_USE_EMULATORS: "true",
          VITE_FIREBASE_AUTH_EMULATOR_PORT: port,
        }),
      ).toThrow(FirebaseEmulatorConfigurationError);
    },
  );
});
