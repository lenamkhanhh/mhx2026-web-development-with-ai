import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  type Auth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  arrayUnion,
  collection,
  connectFirestoreEmulator,
  type DocumentData,
  deleteField,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { assertApprovalStatus } from "./codec";
import { resolveFirebaseEmulatorTarget } from "./runtime";

import type {
  AuthenticatedUser,
  CreateEventInput,
  CreateExpenseInput,
  CreateTripInput,
  EventRecord,
  EventNote,
  EventSubitem,
  ExpenseCategory,
  ExpenseRecord,
  FirestoreEventCategory,
  FirestoreEventPriority,
  FirestoreEventStatus,
  MemberRecord,
  TripBackend,
  TripActivity,
  TripRecord,
  TripSnapshot,
  UpdateEventInput,
  UserRecord,
} from "./contracts";

type Environment = Record<string, string | undefined>;

const emulatorConnectedAuth = new WeakSet<Auth>();
const emulatorConnectedFirestore = new WeakSet<Firestore>();

const EVENT_CATEGORIES = new Set<FirestoreEventCategory>([
  "transport",
  "stay",
  "food",
  "activity",
  "other",
]);
const EVENT_STATUSES = new Set<FirestoreEventStatus>([
  "pending",
  "approved",
  "happening",
  "completed",
  "cancelled",
  "paused",
]);
const EVENT_PRIORITIES = new Set<FirestoreEventPriority>(["low", "medium", "high"]);
const EXPENSE_CATEGORIES = new Set<ExpenseCategory>([
  "transport", "accommodation", "food", "activities", "other",
]);

export class FirestoreDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreDataError";
  }
}

export class UnsupportedTripOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedTripOperationError";
  }
}

function value(data: DocumentData, key: string): unknown {
  return data[key];
}

function stringValue(data: DocumentData, key: string): string {
  const result = value(data, key);
  if (typeof result !== "string") throw new FirestoreDataError(`Expected ${key} to be a string.`);
  return result;
}

function stringList(data: DocumentData, key: string): string[] {
  const result = value(data, key);
  if (!Array.isArray(result) || result.some((item) => typeof item !== "string")) {
    throw new FirestoreDataError(`Expected ${key} to be a list of strings.`);
  }
  return [...result];
}

function enumValue<T extends string>(data: DocumentData, key: string, valid: Set<T>): T {
  const result = stringValue(data, key) as T;
  if (!valid.has(result)) throw new FirestoreDataError(`Unexpected ${key}: ${result}.`);
  return result;
}

function optionalString(data: DocumentData, key: string): string | undefined {
  const result = value(data, key);
  if (result === undefined || result === null) return undefined;
  if (typeof result !== "string" || !result.trim()) {
    throw new FirestoreDataError(`Expected ${key} to be a non-empty string.`);
  }
  return result;
}

function optionalEnumValue<T extends string>(data: DocumentData, key: string, valid: Set<T>): T | undefined {
  const result = optionalString(data, key);
  if (result === undefined) return undefined;
  if (!valid.has(result as T)) throw new FirestoreDataError(`Unexpected ${key}: ${result}.`);
  return result as T;
}

function optionalTimestamp(data: DocumentData, key: string): string | undefined {
  const result = value(data, key);
  if (result === undefined || result === null) return undefined;
  if (typeof result === "string" && isDateTime(result)) return new Date(result).toISOString();
  if (typeof result === "object" && result !== null && "toDate" in result) {
    const timestamp = result as { toDate?: unknown };
    if (typeof timestamp.toDate === "function") {
      const parsed = (timestamp.toDate as () => Date).call(timestamp);
      if (parsed instanceof Date && Number.isFinite(parsed.getTime())) return parsed.toISOString();
    }
  }
  throw new FirestoreDataError(`Expected ${key} to be a Firestore timestamp.`);
}

export function createTripRecord(
  input: CreateTripInput,
  leadId: string,
  joinCode: string,
): Omit<TripRecord, "id"> {
  if (!input.name.trim() || !input.destination.trim()) {
    throw new FirestoreDataError("Trip name and destination are required.");
  }
  if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate) || input.endDate < input.startDate) {
    throw new FirestoreDataError("Trip dates must be valid YYYY-MM-DD values.");
  }
  if (!leadId || !/^[A-Z0-9]{6,16}$/.test(joinCode)) {
    throw new FirestoreDataError("Trip lead and uppercase join code are required.");
  }
  if (input.budgetVnd !== undefined && (!Number.isSafeInteger(input.budgetVnd) || input.budgetVnd < 0)) {
    throw new FirestoreDataError("Trip budget must be a non-negative integer VND amount.");
  }
  return { ...input, name: input.name.trim(), destination: input.destination.trim(), leadId, joinCode };
}

export function decodeEventRecord(id: string, data: DocumentData): EventRecord {
  const approvedBy = value(data, "approvedBy");
  if (approvedBy !== null && typeof approvedBy !== "string") {
    throw new FirestoreDataError("Expected approvedBy to be a uid or null.");
  }
  const rawOrder = value(data, "order");
  const order = rawOrder === undefined ? Number.MAX_SAFE_INTEGER : rawOrder;
  if (typeof order !== "number" || !Number.isSafeInteger(order) || order < 0) {
    throw new FirestoreDataError("Expected order to be a non-negative integer.");
  }
  return {
    id,
    order,
    title: stringValue(data, "title"),
    description: optionalString(data, "description") ?? "",
    category: enumValue(data, "category", EVENT_CATEGORIES),
    startAt: isoDateTime(data, "startAt"),
    endAt: isoDateTime(data, "endAt"),
    status: enumValue(data, "status", EVENT_STATUSES),
    participantIds: stringList(data, "participantIds"),
    createdBy: stringValue(data, "createdBy"),
    approvedBy,
    location: optionalString(data, "location"),
    assigneeUid: optionalString(data, "assigneeUid"),
    priority: optionalEnumValue(data, "priority", EVENT_PRIORITIES),
    createdAt: optionalTimestamp(data, "createdAt"),
    updatedAt: optionalTimestamp(data, "updatedAt"),
  };
}

export function decodeExpenseRecord(id: string, data: DocumentData): ExpenseRecord {
  const amount = value(data, "amount");
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
    throw new FirestoreDataError("Expense amount must be a non-negative integer VND amount.");
  }
  const status = stringValue(data, "status");
  if (status !== "pending" && status !== "settled") {
    throw new FirestoreDataError(`Unexpected expense status: ${status}.`);
  }
  return {
    id,
    title: stringValue(data, "title"),
    amount,
    paidBy: stringValue(data, "paidBy"),
    splitAmong: stringList(data, "splitAmong"),
    status,
    createdBy: stringValue(data, "createdBy"),
    category: optionalEnumValue(data, "category", EXPENSE_CATEGORIES),
    eventId: optionalString(data, "eventId"),
    createdAt: optionalTimestamp(data, "createdAt"),
    updatedAt: optionalTimestamp(data, "updatedAt"),
  };
}

export function resolveFirebaseConfig(environment: Environment): FirebaseOptions {
  const required = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"] as const;
  const values = Object.fromEntries(
    required.map((key) => [key, environment[`VITE_FIREBASE_${key}`]?.trim()]),
  ) as Record<(typeof required)[number], string | undefined>;
  const missing = required.filter((key) => !values[key]);
  if (missing.length > 0) {
    throw new FirestoreDataError(`Missing public Firebase configuration: ${missing.join(", ")}.`);
  }
      return {
    apiKey: values.API_KEY!,
    authDomain: values.AUTH_DOMAIN!,
    projectId: values.PROJECT_ID!,
    appId: values.APP_ID!,
    ...(environment.VITE_FIREBASE_MESSAGING_SENDER_ID
      ? { messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID }
      : {}),
  };
}

export function createFirebaseTripBackend(environment: Environment = import.meta.env): TripBackend {
  const config = resolveFirebaseConfig(environment);
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const emulatorTarget = resolveFirebaseEmulatorTarget(environment);

  if (emulatorTarget && !emulatorConnectedAuth.has(auth)) {
    connectAuthEmulator(
      auth,
      `http://${emulatorTarget.host}:${emulatorTarget.authPort}`,
      { disableWarnings: true },
    );
    emulatorConnectedAuth.add(auth);
  }
  if (emulatorTarget && !emulatorConnectedFirestore.has(firestore)) {
    connectFirestoreEmulator(
      firestore,
      emulatorTarget.host,
      emulatorTarget.firestorePort,
    );
    emulatorConnectedFirestore.add(firestore);
  }

  return new FirebaseTripBackend(auth, firestore);
}

export class FirebaseTripBackend implements TripBackend {
  constructor(private readonly auth: Auth, private readonly firestore: Firestore) {}

  observeSession(listener: (user: AuthenticatedUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => listener(user ? toAuthenticatedUser(user) : null));
  }

  async register(email: string, password: string, displayName: string): Promise<AuthenticatedUser> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(credential.user, { displayName });
    return toAuthenticatedUser(credential.user);
  }

  async login(email: string, password: string): Promise<AuthenticatedUser> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return toAuthenticatedUser(credential.user);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  async upsertProfile(user: AuthenticatedUser): Promise<void> {
    const profileRef = doc(this.firestore, "users", user.uid);
    const existing = await getDoc(profileRef);
    const profileFields = {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      updatedAt: serverTimestamp(),
    };
    if (existing.exists()) {
      await updateDoc(profileRef, profileFields);
      return;
    }
    await setDoc(profileRef, { ...profileFields, tripIds: [] });
  }

  async getProfile(uid: string): Promise<UserRecord | null> {
    const snapshot = await getDoc(doc(this.firestore, "users", uid));
    return snapshot.exists() ? decodeUserRecord(uid, snapshot.data()) : null;
  }

  subscribeTrips(uid: string, listener: (trips: TripRecord[]) => void): () => void {
    let stopTrips: Array<() => void> = [];
    const stopProfile = onSnapshot(doc(this.firestore, "users", uid), (profile) => {
      stopTrips.forEach((stop) => stop());
      stopTrips = [];
      if (!profile.exists()) return listener([]);
      const tripIds = decodeUserRecord(uid, profile.data()).tripIds;
      const current = new Map<string, TripRecord>();
      const publish = () => listener(tripIds.flatMap((id) => (current.has(id) ? [current.get(id)!] : [])));
      stopTrips = tripIds.map((tripId) =>
        onSnapshot(
          doc(this.firestore, "trips", tripId),
          (trip) => {
            if (trip.exists()) current.set(tripId, decodeTripRecord(tripId, trip.data()));
            else current.delete(tripId);
            publish();
          },
          () => {
            // tripIds is only a convenience index. Membership/Rules are the
            // source of truth, so an unavailable trip must disappear locally.
            current.delete(tripId);
            publish();
          },
        ),
      );
      if (tripIds.length === 0) publish();
    });
    return () => {
      stopProfile();
      stopTrips.forEach((stop) => stop());
    };
  }

  subscribeTrip(
    tripId: string,
    listener: (snapshot: TripSnapshot) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let trip: TripRecord | null = null;
    let members: MemberRecord[] = [];
    let events: EventRecord[] = [];
    let expenses: ExpenseRecord[] = [];
    let notes: EventNote[] = [];
    let subitems: EventSubitem[] = [];
    let activity: TripActivity[] = [];
    const publish = () => {
      if (trip) listener({ trip, members, events, expenses, notes, subitems, activity });
    };
    const fail = (error: Error) => onError?.(error);
    return combineUnsubscribers([
      onSnapshot(doc(this.firestore, "trips", tripId), (snapshot) => {
        if (!snapshot.exists()) return fail(new FirestoreDataError("Trip does not exist or is unavailable."));
        trip = decodeTripRecord(tripId, snapshot.data());
        publish();
      }, fail),
      onSnapshot(collection(this.firestore, "trips", tripId, "members"), (snapshot) => {
        members = snapshot.docs.map((member) => decodeMemberRecord(member.id, member.data()));
        publish();
      }, fail),
      onSnapshot(collection(this.firestore, "trips", tripId, "events"), (snapshot) => {
        events = snapshot.docs
          .map((event) => decodeEventRecord(event.id, event.data()))
          .sort((left, right) =>
            left.order - right.order ||
            Date.parse(left.startAt) - Date.parse(right.startAt) ||
            left.id.localeCompare(right.id),
          );
        publish();
      }, fail),
      onSnapshot(collection(this.firestore, "trips", tripId, "expenses"), (snapshot) => {
        expenses = snapshot.docs.map((expense) => decodeExpenseRecord(expense.id, expense.data()));
        publish();
      }, fail),
      onSnapshot(collection(this.firestore, "trips", tripId, "notes"), (snapshot) => {
        notes = snapshot.docs.map((note) => decodeEventNote(note.id, note.data({ serverTimestamps: "estimate" })))
          .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
        publish();
      }, fail),
      onSnapshot(collection(this.firestore, "trips", tripId, "subitems"), (snapshot) => {
        subitems = snapshot.docs.map((subitem) => decodeEventSubitem(subitem.id, subitem.data({ serverTimestamps: "estimate" })))
          .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
        publish();
      }, fail),
      onSnapshot(collection(this.firestore, "trips", tripId, "activity"), (snapshot) => {
        activity = snapshot.docs.map((item) => decodeTripActivity(item.id, item.data({ serverTimestamps: "estimate" })))
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
        publish();
      }, fail),
    ]);
  }

  async createTrip(input: CreateTripInput, actor: AuthenticatedUser): Promise<TripRecord> {
    const tripRef = doc(collection(this.firestore, "trips"));
    const joinCode = createJoinCode();
    const proofId = await hashJoinCode(joinCode);
    const trip = { id: tripRef.id, ...createTripRecord(input, actor.uid, joinCode) };
    const batch = writeBatch(this.firestore);
    batch.set(tripRef, { ...withoutId(trip), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    batch.set(doc(this.firestore, "trips", trip.id, "members", actor.uid), {
      displayName: actor.displayName ?? actor.email ?? "Trip lead",
      email: actor.email ?? "",
      role: "lead",
      responsibility: "",
      isDemo: false,
      joinedAt: serverTimestamp(),
    });
    batch.set(doc(this.firestore, "users", actor.uid), {
      displayName: actor.displayName ?? "",
      email: actor.email ?? "",
      tripIds: arrayUnion(trip.id),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    batch.set(doc(this.firestore, "tripJoinProofs", proofId), {
      tripId: trip.id,
      active: true,
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return trip;
  }

  async joinTrip(joinCode: string, actor: AuthenticatedUser): Promise<TripRecord> {
    const normalized = normalizeJoinCode(joinCode);
    if (!/^[A-Z0-9]{16}$/.test(normalized)) {
      throw new FirestoreDataError("Enter a valid 16-character join code.");
    }
    const proofId = await hashJoinCode(normalized);
    const proofSnapshot = await getDoc(doc(this.firestore, "tripJoinProofs", proofId));
    if (!proofSnapshot.exists()) throw new FirestoreDataError("Join code is invalid or expired.");
    const proof = proofSnapshot.data();
    const tripId = stringValue(proof, "tripId");
    if (value(proof, "active") !== true) throw new FirestoreDataError("Join code is invalid or expired.");
    const expiresAt = value(proof, "expiresAt");
    if (!expiresAt || typeof expiresAt !== "object" || !("toMillis" in expiresAt) || typeof expiresAt.toMillis !== "function" || expiresAt.toMillis() <= Date.now()) {
      throw new FirestoreDataError("Join code is invalid or expired.");
    }
    const batch = writeBatch(this.firestore);
    batch.set(doc(this.firestore, "trips", tripId, "members", actor.uid), {
      displayName: actor.displayName ?? actor.email ?? "Trip member",
      email: actor.email ?? "",
      role: "member",
      responsibility: "",
      isDemo: false,
      joinedWithProofId: proofId,
      joinedAt: serverTimestamp(),
    });
    batch.set(doc(this.firestore, "users", actor.uid), {
      displayName: actor.displayName ?? "",
      email: actor.email ?? "",
      tripIds: arrayUnion(tripId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    const tripSnapshot = await getDoc(doc(this.firestore, "trips", tripId));
    if (!tripSnapshot.exists()) throw new FirestoreDataError("Trip is no longer available.");
    return decodeTripRecord(tripId, tripSnapshot.data());
  }

  updateResponsibility(tripId: string, uid: string, responsibility: string): Promise<void> {
    return updateDoc(doc(this.firestore, "trips", tripId, "members", uid), { responsibility });
  }

  updateMemberProfile(tripId: string, uid: string, patch: { displayName?: string; responsibility?: string }): Promise<void> {
    const displayName = patch.displayName?.trim();
    const responsibility = patch.responsibility?.trim();
    if (displayName !== undefined && (!displayName || displayName.length > 120)) {
      return Promise.reject(new FirestoreDataError("Display name must contain 1 to 120 characters."));
    }
    if (responsibility !== undefined && responsibility.length > 240) {
      return Promise.reject(new FirestoreDataError("Responsibility must contain at most 240 characters."));
    }
    return updateDoc(doc(this.firestore, "trips", tripId, "members", uid), {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(responsibility !== undefined ? { responsibility } : {}),
    });
  }

  removeMember(tripId: string, uid: string): Promise<void> {
    return deleteDoc(doc(this.firestore, "trips", tripId, "members", uid));
  }

  async createEvent(tripId: string, input: CreateEventInput, actor: AuthenticatedUser): Promise<EventRecord> {
    validateEventInput(input);
    const member = await this.getMember(tripId, actor.uid);
    if (!member) throw new FirestoreDataError("Only a trip member can create an event.");
    const eventRef = doc(collection(this.firestore, "trips", tripId, "events"));
    const { expenseAmount, expensePaidBy, ...eventInput } = input;
    const event: EventRecord = {
      id: eventRef.id,
      order: Date.now(),
      ...eventInput,
      status: member.role === "lead" ? "approved" : "pending",
      createdBy: actor.uid,
      approvedBy: member.role === "lead" ? actor.uid : null,
    };
    const batch = writeBatch(this.firestore);
    batch.set(eventRef, { ...withoutId(event), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    if (expenseAmount !== undefined && expensePaidBy !== undefined) {
      const payer = await this.getMember(tripId, expensePaidBy);
      if (!payer || !event.participantIds.includes(expensePaidBy)) {
        throw new FirestoreDataError("The event payer must be one of its trip participants.");
      }
      batch.set(doc(collection(this.firestore, "trips", tripId, "expenses")), {
        eventId: event.id,
        title: event.title,
        amount: expenseAmount,
        paidBy: expensePaidBy,
        splitAmong: [...event.participantIds],
        status: "pending",
        createdBy: actor.uid,
        category: expenseCategoryForEvent(event.category),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return event;
  }

  async updateEvent(tripId: string, eventId: string, patch: UpdateEventInput): Promise<void> {
    validateEventPatch(patch);
    const eventRef = doc(this.firestore, "trips", tripId, "events", eventId);
    const existing = await getDoc(eventRef);
    if (!existing.exists()) throw new FirestoreDataError("Event does not exist.");
    const current = decodeEventRecord(eventId, existing.data());
    validateEventInput({
      title: patch.title ?? current.title,
      description: patch.description ?? current.description,
      category: patch.category ?? current.category,
      startAt: patch.startAt ?? current.startAt,
      endAt: patch.endAt ?? current.endAt,
      participantIds: patch.participantIds ?? current.participantIds,
      location: patch.location === null ? undefined : patch.location ?? current.location,
      assigneeUid: patch.assigneeUid === null ? undefined : patch.assigneeUid ?? current.assigneeUid,
      priority: patch.priority === null ? undefined : patch.priority ?? current.priority,
    });
    await updateDoc(eventRef, {
      ...patch,
      ...(patch.location === null ? { location: deleteField() } : {}),
      ...(patch.assigneeUid === null ? { assigneeUid: deleteField() } : {}),
      ...(patch.priority === null ? { priority: deleteField() } : {}),
      updatedAt: serverTimestamp(),
    });
  }

  approveEvent(tripId: string, eventId: string, status: Exclude<FirestoreEventStatus, "pending">): Promise<void> {
    try {
      assertApprovalStatus(status);
    } catch {
      throw new FirestoreDataError("Invalid approval status.");
    }
    const actor = this.auth.currentUser;
    if (!actor) return Promise.reject(new FirestoreDataError("Authentication is required."));
    return updateDoc(doc(this.firestore, "trips", tripId, "events", eventId), {
      status,
      approvedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
  }

  deleteEvent(tripId: string, eventId: string): Promise<void> {
    return deleteDoc(doc(this.firestore, "trips", tripId, "events", eventId));
  }

  async reorderEvents(tripId: string, eventIds: string[]): Promise<void> {
    if (new Set(eventIds).size !== eventIds.length) {
      throw new FirestoreDataError("Event order cannot contain duplicate ids.");
    }
    const batch = writeBatch(this.firestore);
    eventIds.forEach((eventId, order) => {
      batch.update(doc(this.firestore, "trips", tripId, "events", eventId), {
        order,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  async createEventNote(tripId: string, eventId: string, body: string): Promise<void> {
    const actor = this.requireActor();
    const normalizedBody = body.trim();
    if (!normalizedBody || normalizedBody.length > 1000) throw new FirestoreDataError("Notes must contain 1 to 1000 characters.");
    await this.requireEvent(tripId, eventId);
    const noteRef = doc(collection(this.firestore, "trips", tripId, "notes"));
    const batch = writeBatch(this.firestore);
    batch.set(noteRef, { eventId, body: normalizedBody, createdBy: actor.uid, createdAt: serverTimestamp() });
    this.writeActivity(batch, tripId, { kind: "note_added", eventId, actorId: actor.uid, label: "Added a note" });
    await batch.commit();
  }

  deleteEventNote(tripId: string, noteId: string): Promise<void> {
    return deleteDoc(doc(this.firestore, "trips", tripId, "notes", noteId));
  }

  async createEventSubitem(tripId: string, eventId: string, title: string): Promise<void> {
    const actor = this.requireActor();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > 160) throw new FirestoreDataError("Sub-items must contain 1 to 160 characters.");
    await this.requireEvent(tripId, eventId);
    const subitemRef = doc(collection(this.firestore, "trips", tripId, "subitems"));
    const batch = writeBatch(this.firestore);
    batch.set(subitemRef, { eventId, title: normalizedTitle, completed: false, createdBy: actor.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    this.writeActivity(batch, tripId, { kind: "subitem_added", eventId, actorId: actor.uid, label: `Added sub-item “${normalizedTitle}”` });
    await batch.commit();
  }

  async toggleEventSubitem(tripId: string, subitemId: string, completed: boolean): Promise<void> {
    const actor = this.requireActor();
    const subitemRef = doc(this.firestore, "trips", tripId, "subitems", subitemId);
    const existing = await getDoc(subitemRef);
    if (!existing.exists()) throw new FirestoreDataError("Sub-item does not exist.");
    const subitem = decodeEventSubitem(subitemId, existing.data({ serverTimestamps: "estimate" }));
    const batch = writeBatch(this.firestore);
    batch.update(subitemRef, { completed, updatedAt: serverTimestamp() });
    this.writeActivity(batch, tripId, { kind: completed ? "subitem_completed" : "subitem_reopened", eventId: subitem.eventId, actorId: actor.uid, label: `${completed ? "Completed" : "Reopened"} sub-item “${subitem.title}”` });
    await batch.commit();
  }

  deleteEventSubitem(tripId: string, subitemId: string): Promise<void> {
    return deleteDoc(doc(this.firestore, "trips", tripId, "subitems", subitemId));
  }

  async createExpense(tripId: string, input: CreateExpenseInput, actor: AuthenticatedUser): Promise<ExpenseRecord> {
    validateExpenseInput(input);
    const expenseRef = doc(collection(this.firestore, "trips", tripId, "expenses"));
    const expense: ExpenseRecord = { id: expenseRef.id, ...input, status: "pending", createdBy: actor.uid };
    await setDoc(expenseRef, { ...withoutId(expense), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return expense;
  }

  async updateExpense(tripId: string, expenseId: string, patch: Partial<CreateExpenseInput>): Promise<void> {
    const expenseRef = doc(this.firestore, "trips", tripId, "expenses", expenseId);
    const existing = await getDoc(expenseRef);
    if (!existing.exists()) throw new FirestoreDataError("Expense does not exist.");
    const current = decodeExpenseRecord(expenseId, existing.data());
    validateExpenseInput({
      title: patch.title ?? current.title,
      amount: patch.amount ?? current.amount,
      paidBy: patch.paidBy ?? current.paidBy,
      splitAmong: patch.splitAmong ?? current.splitAmong,
      category: patch.category ?? current.category,
    });
    await updateDoc(expenseRef, { ...patch, updatedAt: serverTimestamp() });
  }

  deleteExpense(tripId: string, expenseId: string): Promise<void> {
    return deleteDoc(doc(this.firestore, "trips", tripId, "expenses", expenseId));
  }

  settleExpense(tripId: string, expenseId: string): Promise<void> {
    if (!this.auth.currentUser) {
      return Promise.reject(new FirestoreDataError("Authentication is required."));
    }
    return updateDoc(doc(this.firestore, "trips", tripId, "expenses", expenseId), {
      status: "settled",
      updatedAt: serverTimestamp(),
    });
  }

  private async getMember(tripId: string, uid: string): Promise<MemberRecord | null> {
    const snapshot = await getDoc(doc(this.firestore, "trips", tripId, "members", uid));
    return snapshot.exists() ? decodeMemberRecord(uid, snapshot.data()) : null;
  }

  private requireActor(): AuthenticatedUser {
    const actor = this.auth.currentUser;
    if (!actor) throw new FirestoreDataError("Authentication is required.");
    return toAuthenticatedUser(actor);
  }

  private async requireEvent(tripId: string, eventId: string): Promise<void> {
    if (!(await getDoc(doc(this.firestore, "trips", tripId, "events", eventId))).exists()) {
      throw new FirestoreDataError("Timeline item does not exist.");
    }
  }

  private writeActivity(batch: ReturnType<typeof writeBatch>, tripId: string, activity: Omit<TripActivity, "id" | "createdAt">): void {
    batch.set(doc(collection(this.firestore, "trips", tripId, "activity")), { ...activity, createdAt: serverTimestamp() });
  }
}

function decodeTripRecord(id: string, data: DocumentData): TripRecord {
  const budgetVnd = value(data, "budgetVnd");
  if (budgetVnd !== undefined && (typeof budgetVnd !== "number" || !Number.isSafeInteger(budgetVnd) || budgetVnd < 0)) {
    throw new FirestoreDataError("Trip budget must be a non-negative integer VND amount.");
  }
  return { id, name: stringValue(data, "name"), destination: stringValue(data, "destination"), startDate: stringValue(data, "startDate"), endDate: stringValue(data, "endDate"), leadId: stringValue(data, "leadId"), joinCode: stringValue(data, "joinCode"), ...(budgetVnd === undefined ? {} : { budgetVnd }) };
}

function decodeUserRecord(uid: string, data: DocumentData): UserRecord {
  return { uid, displayName: stringValue(data, "displayName"), email: stringValue(data, "email"), tripIds: stringList(data, "tripIds") };
}

function decodeMemberRecord(uid: string, data: DocumentData): MemberRecord {
  const role = stringValue(data, "role");
  if (role !== "lead" && role !== "member") throw new FirestoreDataError(`Unexpected member role: ${role}.`);
  const isDemo = value(data, "isDemo");
  if (typeof isDemo !== "boolean") throw new FirestoreDataError("Expected isDemo to be boolean.");
  return { uid, displayName: stringValue(data, "displayName"), email: stringValue(data, "email"), role, responsibility: stringValue(data, "responsibility"), isDemo, ...(optionalString(data, "joinedWithProofId") ? { joinedWithProofId: optionalString(data, "joinedWithProofId") } : {}) };
}

export function decodeEventNote(id: string, data: DocumentData): EventNote {
  return { id, eventId: stringValue(data, "eventId"), body: stringValue(data, "body"), createdBy: stringValue(data, "createdBy"), createdAt: requiredTimestamp(data, "createdAt") };
}

export function decodeEventSubitem(id: string, data: DocumentData): EventSubitem {
  const completed = value(data, "completed");
  if (typeof completed !== "boolean") throw new FirestoreDataError("Expected completed to be a boolean.");
  return { id, eventId: stringValue(data, "eventId"), title: stringValue(data, "title"), completed, createdBy: stringValue(data, "createdBy"), createdAt: requiredTimestamp(data, "createdAt"), updatedAt: requiredTimestamp(data, "updatedAt") };
}

export function decodeTripActivity(id: string, data: DocumentData): TripActivity {
  const kind = stringValue(data, "kind");
  if (kind !== "note_added" && kind !== "subitem_added" && kind !== "subitem_completed" && kind !== "subitem_reopened") throw new FirestoreDataError("Unexpected activity kind.");
  return { id, kind, eventId: stringValue(data, "eventId"), actorId: stringValue(data, "actorId"), label: stringValue(data, "label"), createdAt: requiredTimestamp(data, "createdAt") };
}

function validateEventInput(input: CreateEventInput): void {
  if (!input.title.trim() || !EVENT_CATEGORIES.has(input.category) || !isDateTime(input.startAt) || !isDateTime(input.endAt) || Date.parse(input.endAt) <= Date.parse(input.startAt) || input.participantIds.length === 0) {
    throw new FirestoreDataError("Invalid event input.");
  }
  if (input.location !== undefined && !input.location.trim()) throw new FirestoreDataError("Event location cannot be blank.");
  if (input.assigneeUid !== undefined && !input.assigneeUid.trim()) throw new FirestoreDataError("Event assignee cannot be blank.");
  if (input.priority !== undefined && !EVENT_PRIORITIES.has(input.priority)) throw new FirestoreDataError("Invalid event priority.");
}

function validateEventPatch(patch: UpdateEventInput): void {
  if (patch.title !== undefined && !patch.title.trim()) throw new FirestoreDataError("Event title is required.");
  if (patch.category !== undefined && !EVENT_CATEGORIES.has(patch.category)) throw new FirestoreDataError("Invalid event category.");
  if (patch.startAt !== undefined && !isDateTime(patch.startAt)) throw new FirestoreDataError("Invalid event start time.");
  if (patch.endAt !== undefined && !isDateTime(patch.endAt)) throw new FirestoreDataError("Invalid event end time.");
  if (patch.participantIds !== undefined && patch.participantIds.length === 0) throw new FirestoreDataError("An event needs participants.");
  if (patch.location !== undefined && patch.location !== null && !patch.location.trim()) throw new FirestoreDataError("Event location cannot be blank.");
  if (patch.assigneeUid !== undefined && patch.assigneeUid !== null && !patch.assigneeUid.trim()) throw new FirestoreDataError("Event assignee cannot be blank.");
  if (patch.priority !== undefined && patch.priority !== null && !EVENT_PRIORITIES.has(patch.priority)) throw new FirestoreDataError("Invalid event priority.");
}

function validateExpenseInput(input: CreateExpenseInput): void {
  if (!input.title.trim() || !Number.isSafeInteger(input.amount) || input.amount < 0 || !input.paidBy || input.splitAmong.length === 0) {
    throw new FirestoreDataError("Expenses must use non-negative integer VND and include a payer and participants.");
  }
  if (input.category !== undefined && !EXPENSE_CATEGORIES.has(input.category)) throw new FirestoreDataError("Invalid expense category.");
}

function isoDateTime(data: DocumentData, key: string): string {
  const result = stringValue(data, key);
  if (!isDateTime(result)) throw new FirestoreDataError(`Expected ${key} to be an ISO datetime.`);
  return result;
}

function requiredTimestamp(data: DocumentData, key: string): string {
  const timestamp = optionalTimestamp(data, key);
  if (!timestamp) throw new FirestoreDataError(`Expected ${key} to be a Firestore timestamp.`);
  return timestamp;
}

function isDateTime(value: string): boolean { return Number.isFinite(Date.parse(value)) && value.includes("T"); }
function isIsoDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)); }
function withoutId<T extends { id: string }>(record: T): Omit<T, "id"> { const { id: _id, ...data } = record; return data; }
function combineUnsubscribers(unsubscribers: Array<() => void>): () => void { return () => unsubscribers.forEach((unsubscribe) => unsubscribe()); }
function toAuthenticatedUser(user: { uid: string; email: string | null; displayName: string | null }): AuthenticatedUser { return { uid: user.uid, email: user.email, displayName: user.displayName }; }
export function normalizeJoinCode(value: string): string {
  return value.trim().replace(/[\s-]+/g, "").toUpperCase();
}

export async function hashJoinCode(value: string): Promise<string> {
  const normalized = normalizeJoinCode(value);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function expenseCategoryForEvent(category: FirestoreEventCategory): ExpenseCategory {
  if (category === "stay") return "accommodation";
  if (category === "food") return "food";
  if (category === "activity") return "activities";
  if (category === "transport") return "transport";
  return "other";
}
