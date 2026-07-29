type Environment = Record<string, string | undefined>;

export interface FirebaseEmulatorTarget {
  host: "127.0.0.1";
  authPort: number;
  firestorePort: number;
}

export class FirebaseEmulatorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseEmulatorConfigurationError";
  }
}

export function resolveFirebaseEmulatorTarget(
  environment: Environment,
): FirebaseEmulatorTarget | null {
  if (environment.VITE_FIREBASE_USE_EMULATORS !== "true") return null;

  return {
    host: "127.0.0.1",
    authPort: parsePort(
      environment.VITE_FIREBASE_AUTH_EMULATOR_PORT,
      9099,
      "Auth",
    ),
    firestorePort: parsePort(
      environment.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT,
      8085,
      "Firestore",
    ),
  };
}

function parsePort(
  rawPort: string | undefined,
  fallback: number,
  service: string,
): number {
  const value = rawPort?.trim() || String(fallback);
  if (!/^\d+$/.test(value)) {
    throw new FirebaseEmulatorConfigurationError(
      `${service} emulator port must be an integer between 1 and 65535.`,
    );
  }

  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new FirebaseEmulatorConfigurationError(
      `${service} emulator port must be an integer between 1 and 65535.`,
    );
  }
  return port;
}
