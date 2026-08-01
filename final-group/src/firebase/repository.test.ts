import { describe, expect, it } from "vitest";

import {
  assertApprovalStatus,
  FirestoreDataError,
  createTripRecord,
  decodeEventRecord,
  decodeExpenseRecord,
  resolveFirebaseConfig,
} from "./codec";
import { hashJoinCode, normalizeJoinCode } from "./repository";

describe("join proof identifiers", () => {
  it("normalizes formatted codes and hashes them deterministically without storing plaintext", async () => {
    expect(normalizeJoinCode(" abcd-efgh jklm-npqr ")).toBe("ABCDEFGHJKLMNPQR");
    const first = await hashJoinCode("ABCD-EFGH-JKLM-NPQR");
    const second = await hashJoinCode("abcdefghjklmnpqr");
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("ABCDEFGH");
  });
});

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

  it("preserves the approved Page 2 overview fields without inventing values", () => {
    expect(createTripRecord({
      name: "Da Nang weekend",
      destination: "Da Nang",
      startDate: "2026-08-01",
      endDate: "2026-08-03",
      budgetVnd: 8_000_000,
    }, "lead-1", "DNANG2026")).toMatchObject({ budgetVnd: 8_000_000 });

    expect(decodeEventRecord("event-1", {
      title: "Airport transfer",
      category: "transport",
      startAt: "2026-08-01T08:00:00.000Z",
      endAt: "2026-08-01T09:00:00.000Z",
      status: "approved",
      participantIds: ["lead-1"],
      createdBy: "lead-1",
      approvedBy: "lead-1",
      location: "Da Nang International Airport",
      assigneeUid: "lead-1",
      priority: "high",
      order: 0,
    })).toMatchObject({
      location: "Da Nang International Airport",
      assigneeUid: "lead-1",
      priority: "high",
    });

    expect(decodeExpenseRecord("expense-1", {
      title: "Airport transfer",
      amount: 500_000,
      paidBy: "lead-1",
      splitAmong: ["lead-1"],
      status: "pending",
      createdBy: "lead-1",
      category: "transport",
    })).toMatchObject({ category: "transport" });
  });

  it("decodes an event using the approved Firestore status vocabulary", () => {
    const createdAt = new Date("2026-08-01T07:00:00.000Z");
    const updatedAt = new Date("2026-08-01T08:30:00.000Z");
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
        order: 3,
        createdAt: { toDate: () => createdAt },
        updatedAt: { toDate: () => updatedAt },
      }),
    ).toMatchObject({
      id: "event-1",
      category: "transport",
      status: "approved",
      approvedBy: "lead-1",
      order: 3,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });

  it("decodes persisted expense timestamps for a truthful recent-expenses view", () => {
    const createdAt = new Date("2026-08-01T09:00:00.000Z");
    expect(decodeExpenseRecord("expense-1", {
      title: "Hotel",
      amount: 1_800_000,
      paidBy: "lead-1",
      splitAmong: ["lead-1", "member-1"],
      status: "pending",
      createdBy: "lead-1",
      createdAt: { toDate: () => createdAt },
    })).toMatchObject({ createdAt: createdAt.toISOString() });
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

  it("rejects pending and unknown values at the approval boundary", () => {
    expect(assertApprovalStatus("approved")).toBe("approved");
    expect(() => assertApprovalStatus("pending")).toThrow(FirestoreDataError);
    expect(() => assertApprovalStatus("unknown")).toThrow(FirestoreDataError);
  });
});
