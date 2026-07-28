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

function memberData(role: "lead" | "member", displayName: string) {
  return {
    displayName,
    email: `${displayName.toLowerCase()}@example.com`,
    role,
    responsibility: "",
    isDemo: false,
    joinedAt: now(),
  };
}

function eventData(createdBy: string, status: "pending" | "approved") {
  return {
    title: "Nhận phòng",
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

    await assertSucceeds(batch.commit());
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
});

describe("expense boundaries", () => {
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
