import { describe, expect, it } from "vitest";

import {
  FirestoreDataError,
  createTripRecord,
  decodeEventRecord,
  decodeExpenseRecord,
  resolveFirebaseConfig,
} from "./codec";

describe("TripFlow Firestore record contract", () => {
  it("creates a trip record that contains only the agreed schema fields", () => {
    expect(
      createTripRecord(
        {
          name: "Da Nang weekend",
          destination: "Da Nang",
          startDate: "2026-08-01",
          endDate: "2026-08-03",
        },
        "lead-1",
        "DNANG2026",
      ),
    ).toEqual({
      name: "Da Nang weekend",
      destination: "Da Nang",
      startDate: "2026-08-01",
      endDate: "2026-08-03",
      leadId: "lead-1",
      joinCode: "DNANG2026",
    });
  });

  it("decodes an event using the approved Firestore status vocabulary", () => {
    expect(
      decodeEventRecord("event-1", {
        title: "Airport transfer",
        category: "transport",
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T09:00:00.000Z",
        status: "approved",
        participantIds: ["lead-1", "member-1"],
        createdBy: "lead-1",
        approvedBy: "lead-1",
      }),
    ).toMatchObject({
      id: "event-1",
      category: "transport",
      status: "approved",
      approvedBy: "lead-1",
    });
  });

  it("rejects non-integer and negative VND expense amounts from Firestore", () => {
    const baseExpense = {
      title: "Hotel",
      paidBy: "lead-1",
      splitAmong: ["lead-1", "member-1"],
      status: "pending",
      createdBy: "lead-1",
    };

    expect(() => decodeExpenseRecord("expense-1", { ...baseExpense, amount: -1 })).toThrow(
      FirestoreDataError,
    );
    expect(() => decodeExpenseRecord("expense-1", { ...baseExpense, amount: 12.5 })).toThrow(
      FirestoreDataError,
    );
  });

  it("requires the public Firebase configuration needed by the web adapter", () => {
    expect(() => resolveFirebaseConfig({})).toThrow(FirestoreDataError);

    expect(
      resolveFirebaseConfig({
        VITE_FIREBASE_API_KEY: "public-api-key",
        VITE_FIREBASE_AUTH_DOMAIN: "tripflow.firebaseapp.com",
        VITE_FIREBASE_PROJECT_ID: "tripflow",
        VITE_FIREBASE_APP_ID: "1:123:web:abc",
      }),
    ).toMatchObject({ projectId: "tripflow" });
  });
});
