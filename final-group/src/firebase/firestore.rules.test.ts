import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "tripflow-rules-test";
const TRIP_ID = "trip-1";
const LEAD_ID = "lead-1";
const MEMBER_ID = "member-1";
const OUTSIDER_ID = "outsider-1";

let testEnvironment: RulesTestEnvironment;

const now = () => Timestamp.fromMillis(1_780_000_000_000);

function tripData() {
  return {
    name: "Đà Lạt cuối tuần",
    destination: "Đà Lạt",
    startDate: "2026-08-08",
    endDate: "2026-08-10",
    leadId: LEAD_ID,
    joinCode: "DALAT26",
    createdAt: now(),
    updatedAt: now(),
  };
}

function memberData(role: "lead" | "member", displayName: string, joinedWithProofId?: string) {
  return {
    displayName,
    email: `${displayName.toLowerCase()}@example.com`,
    role,
    responsibility: "",
    isDemo: false,
    ...(joinedWithProofId ? { joinedWithProofId } : {}),
    joinedAt: now(),
  };
}

function eventData(
  createdBy: string,
  status: "pending" | "approved" | "paused" | "completed",
) {
  return {
    description: "Meet in the lobby before checking in.",
    title: "Nhận phòng",
    order: 0,
    category: "stay",
    startAt: "2026-08-08T14:00:00.000Z",
    endAt: "2026-08-08T15:00:00.000Z",
    status,
    participantIds: [LEAD_ID, MEMBER_ID],
    createdBy,
    approvedBy: status === "approved" ? LEAD_ID : null,
    createdAt: now(),
    updatedAt: now(),
  };
}

function expenseData(createdBy: string) {
  return {
    title: "Khách sạn",
    amount: 1_200_000,
    paidBy: createdBy,
    splitAmong: [LEAD_ID, MEMBER_ID],
    status: "pending",
    createdBy,
    createdAt: now(),
    updatedAt: now(),
  };
}

async function seedTrip() {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "trips", TRIP_ID), tripData());
    await setDoc(
      doc(db, "trips", TRIP_ID, "members", LEAD_ID),
      memberData("lead", "Lead"),
    );
    await setDoc(
      doc(db, "trips", TRIP_ID, "members", MEMBER_ID),
      memberData("member", "Member"),
    );
  });
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: readFileSync(
        new URL("../../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await seedTrip();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe("trip and membership boundaries", () => {
  it("allows members to read their trip but rejects outsiders", async () => {
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const outsiderDb = testEnvironment.authenticatedContext(OUTSIDER_ID).firestore();

    await assertSucceeds(getDoc(doc(memberDb, "trips", TRIP_ID)));
    await assertFails(getDoc(doc(outsiderDb, "trips", TRIP_ID)));
    await assertFails(
      getDocs(collection(outsiderDb, "trips", TRIP_ID, "members")),
    );
  });

  it("allows a signed-in user to atomically create a trip and lead membership", async () => {
    const tripId = "trip-created";
    const db = testEnvironment.authenticatedContext(OUTSIDER_ID).firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "trips", tripId), {
      ...tripData(),
      leadId: OUTSIDER_ID,
    });
    batch.set(
      doc(db, "trips", tripId, "members", OUTSIDER_ID),
      memberData("lead", "Outsider"),
    );
    batch.set(doc(db, "tripJoinProofs", "new-trip-proof"), {
      tripId,
      active: true,
      expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
      createdBy: OUTSIDER_ID,
      createdAt: serverTimestamp(),
    });

    await assertSucceeds(batch.commit());
  });

  it("allows only proof-backed self-join as a member", async () => {
    const proofId = "proof-for-trip-1";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "tripJoinProofs", proofId), {
        tripId: TRIP_ID,
        active: true,
        expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
        createdBy: LEAD_ID,
        createdAt: now(),
      });
    });
    const outsiderDb = testEnvironment.authenticatedContext(OUTSIDER_ID).firestore();

    await assertFails(
      setDoc(
        doc(outsiderDb, "trips", TRIP_ID, "members", MEMBER_ID),
        memberData("member", "Impersonated", proofId),
      ),
    );
    await assertFails(
      setDoc(
        doc(outsiderDb, "trips", TRIP_ID, "members", OUTSIDER_ID),
        memberData("lead", "Escalated", proofId),
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(outsiderDb, "trips", TRIP_ID, "members", OUTSIDER_ID),
        memberData("member", "Outsider", proofId),
      ),
    );
  });

  it("rejects expired or revoked join proofs", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "tripJoinProofs", "expired-proof"), {
        tripId: TRIP_ID,
        active: true,
        expiresAt: Timestamp.fromMillis(Date.now() - 60_000),
        createdBy: LEAD_ID,
        createdAt: now(),
      });
      await setDoc(doc(context.firestore(), "tripJoinProofs", "revoked-proof"), {
        tripId: TRIP_ID,
        active: false,
        expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
        createdBy: LEAD_ID,
        createdAt: now(),
      });
    });
    const outsiderDb = testEnvironment.authenticatedContext(OUTSIDER_ID).firestore();
    for (const proofId of ["expired-proof", "revoked-proof"]) {
      await assertFails(
        setDoc(
          doc(outsiderDb, "trips", TRIP_ID, "members", OUTSIDER_ID),
          memberData("member", "Outsider", proofId),
        ),
      );
    }
  });

  it("allows a member to edit only their own responsibility", async () => {
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();

    await assertSucceeds(
      updateDoc(doc(memberDb, "trips", TRIP_ID, "members", MEMBER_ID), {
        responsibility: "Đặt xe",
      }),
    );
    await assertFails(
      updateDoc(doc(memberDb, "trips", TRIP_ID, "members", LEAD_ID), {
        responsibility: "Không được phép",
      }),
    );
  });

  it("allows the lead, but not a member, to remove another member", async () => {
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();

    await assertFails(
      deleteDoc(doc(memberDb, "trips", TRIP_ID, "members", LEAD_ID)),
    );
    await assertSucceeds(
      deleteDoc(doc(leadDb, "trips", TRIP_ID, "members", MEMBER_ID)),
    );
  });
});

describe("event boundaries", () => {
  it("requires member events to start pending and lead events to start approved", async () => {
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();

    await assertSucceeds(
      setDoc(
        doc(memberDb, "trips", TRIP_ID, "events", "member-pending"),
        eventData(MEMBER_ID, "pending"),
      ),
    );
    await assertFails(
      setDoc(
        doc(memberDb, "trips", TRIP_ID, "events", "member-approved"),
        {
          ...eventData(MEMBER_ID, "approved"),
          approvedBy: MEMBER_ID,
        },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(leadDb, "trips", TRIP_ID, "events", "lead-approved"),
        eventData(LEAD_ID, "approved"),
      ),
    );
  });

  it("requires a non-empty event description", async () => {
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const valid = eventData(LEAD_ID, "approved");
    const { description: _description, ...withoutDescription } = valid;

    await assertFails(
      setDoc(
        doc(leadDb, "trips", TRIP_ID, "events", "missing-description"),
        withoutDescription,
      ),
    );
    await assertFails(
      setDoc(doc(leadDb, "trips", TRIP_ID, "events", "blank-description"), {
        ...valid,
        description: "",
      }),
    );
    await assertSucceeds(
      setDoc(
        doc(leadDb, "trips", TRIP_ID, "events", "valid-description"),
        valid,
      ),
    );
  });

  it("allows only the lead to pause or manually complete an event", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "trips", TRIP_ID, "events", "lifecycle"),
        eventData(LEAD_ID, "approved"),
      );
    });
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const ref = ["trips", TRIP_ID, "events", "lifecycle"] as const;

    await assertFails(
      updateDoc(doc(memberDb, ...ref), { status: "paused", updatedAt: now() }),
    );
    await assertSucceeds(
      updateDoc(doc(leadDb, ...ref), { status: "paused", updatedAt: now() }),
    );
    await assertSucceeds(
      updateDoc(doc(leadDb, ...ref), { status: "completed", updatedAt: now() }),
    );
  });

  it("prevents a member from approving their own pending event", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "trips", TRIP_ID, "events", "pending"),
        eventData(MEMBER_ID, "pending"),
      );
    });
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();

    await assertFails(
      updateDoc(doc(memberDb, "trips", TRIP_ID, "events", "pending"), {
        status: "approved",
        approvedBy: MEMBER_ID,
        updatedAt: now(),
      }),
    );
  });

  it("allows only the lead to persist event order", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "trips", TRIP_ID, "events", "pending"),
        eventData(MEMBER_ID, "pending"),
      );
    });
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const eventPath = ["trips", TRIP_ID, "events", "pending"] as const;

    await assertFails(
      updateDoc(doc(memberDb, ...eventPath), {
        order: 1,
        updatedAt: now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(leadDb, ...eventPath), {
        order: 1,
        updatedAt: now(),
      }),
    );
  });
});

describe("expense boundaries", () => {
  it("allows one expense to link to an event created in the same batch", async () => {
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const batch = writeBatch(leadDb);
    batch.set(doc(leadDb, "trips", TRIP_ID, "events", "event-with-cost"), eventData(LEAD_ID, "approved"));
    batch.set(doc(leadDb, "trips", TRIP_ID, "expenses", "linked-expense"), {
      ...expenseData(LEAD_ID),
      eventId: "event-with-cost",
    });
    await assertSucceeds(batch.commit());

    await assertFails(
      setDoc(doc(leadDb, "trips", TRIP_ID, "expenses", "orphan-expense"), {
        ...expenseData(LEAD_ID),
        eventId: "missing-event",
      }),
    );
  });

  it("prevents a member from editing another user's expense", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "trips", TRIP_ID, "expenses", "lead-expense"),
        expenseData(LEAD_ID),
      );
    });
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();

    await assertFails(
      updateDoc(
        doc(memberDb, "trips", TRIP_ID, "expenses", "lead-expense"),
        { amount: 1, updatedAt: now() },
      ),
    );
  });

  it("keeps settlement lead-only even for an expense creator", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "trips", TRIP_ID, "expenses", "member-expense"),
        expenseData(MEMBER_ID),
      );
    });
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const expensePath = ["trips", TRIP_ID, "expenses", "member-expense"] as const;

    await assertFails(
      updateDoc(doc(memberDb, ...expensePath), {
        status: "settled",
        updatedAt: now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(leadDb, ...expensePath), {
        status: "settled",
        updatedAt: now(),
      }),
    );
  });
});

describe("event collaboration boundaries", () => {
  async function seedEvent() {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "trips", TRIP_ID, "events", "event-1"),
        eventData(LEAD_ID, "approved"),
      );
    });
  }

  it("allows a member to add a bounded note for an existing event but not alter another note", async () => {
    await seedEvent();
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const notePath = ["trips", TRIP_ID, "notes", "member-note"] as const;

    await assertSucceeds(
      setDoc(doc(memberDb, ...notePath), {
        eventId: "event-1",
        body: "Meet at the arrival exit.",
        createdBy: MEMBER_ID,
        createdAt: now(),
      }),
    );
    await assertFails(
      updateDoc(doc(leadDb, ...notePath), { body: "Tampered note" }),
    );
    await assertFails(
      setDoc(doc(memberDb, "trips", TRIP_ID, "notes", "too-long"), {
        eventId: "event-1",
        body: "x".repeat(1001),
        createdBy: MEMBER_ID,
        createdAt: now(),
      }),
    );
  });

  it("restricts sub-item completion to its author or the lead", async () => {
    await seedEvent();
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "trips", TRIP_ID, "subitems", "member-subitem"), {
        eventId: "event-1",
        title: "Confirm pickup contact",
        completed: false,
        createdBy: MEMBER_ID,
        createdAt: now(),
        updatedAt: now(),
      });
    });
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const outsiderDb = testEnvironment.authenticatedContext(OUTSIDER_ID).firestore();
    const subitemPath = ["trips", TRIP_ID, "subitems", "member-subitem"] as const;

    await assertSucceeds(updateDoc(doc(memberDb, ...subitemPath), { completed: true, updatedAt: now() }));
    await assertSucceeds(updateDoc(doc(leadDb, ...subitemPath), { completed: false, updatedAt: now() }));
    await assertFails(updateDoc(doc(outsiderDb, ...subitemPath), { completed: true, updatedAt: now() }));
    await assertFails(updateDoc(doc(memberDb, ...subitemPath), { title: "Not an allowed update", updatedAt: now() }));
  });

  it("keeps trip activity actor-attributed and append-only", async () => {
    await seedEvent();
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const leadDb = testEnvironment.authenticatedContext(LEAD_ID).firestore();
    const activityPath = ["trips", TRIP_ID, "activity", "member-activity"] as const;
    const activity = {
      kind: "note_added",
      eventId: "event-1",
      actorId: MEMBER_ID,
      label: "Added a note",
      createdAt: now(),
    };

    await assertSucceeds(setDoc(doc(memberDb, ...activityPath), activity));
    await assertFails(updateDoc(doc(memberDb, ...activityPath), { label: "Edited activity" }));
    await assertFails(deleteDoc(doc(leadDb, ...activityPath)));
    await assertFails(setDoc(doc(memberDb, "trips", TRIP_ID, "activity", "spoofed"), { ...activity, actorId: LEAD_ID }));
  });

  it("accepts a server-timestamped sub-item and matching activity in one batch", async () => {
    await seedEvent();
    const memberDb = testEnvironment.authenticatedContext(MEMBER_ID).firestore();
    const batch = writeBatch(memberDb);
    batch.set(doc(memberDb, "trips", TRIP_ID, "subitems", "batched-subitem"), {
      eventId: "event-1",
      title: "Confirm pickup contact",
      completed: false,
      createdBy: MEMBER_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(memberDb, "trips", TRIP_ID, "activity", "batched-activity"), {
      kind: "subitem_added",
      eventId: "event-1",
      actorId: MEMBER_ID,
      label: "Added sub-item",
      createdAt: serverTimestamp(),
    });

    await assertSucceeds(batch.commit());
  });
});
