import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  type Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  arrayUnion,
  collection,
  type DocumentData,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { assertApprovalStatus } from "./codec";

import type {
  AuthenticatedUser,
  CreateEventInput,
  CreateExpenseInput,
  CreateTripInput,
  EventRecord,
  ExpenseRecord,
  FirestoreEventCategory,
  FirestoreEventStatus,
  MemberRecord,
  TripBackend,
  TripRecord,
  TripSnapshot,
  UserRecord,
} from "./contracts";

type Environment = Record<string, string | undefined>;

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
  return { ...input, name: input.name.trim(), destination: input.destination.trim(), leadId, joinCode };
}

export function decodeEventRecord(id: string, data: DocumentData): EventRecord {
  const approvedBy = value(data, "approvedBy");
  if (approvedBy !== null && typeof approvedBy !== "string") {
    throw new FirestoreDataError("Expected approvedBy to be a uid or null.");
  }
  return {
    id,
    title: stringValue(data, "title"),
    category: enumValue(data, "category", EVENT_CATEGORIES),
    startAt: isoDateTime(data, "startAt"),
    endAt: isoDateTime(data, "endAt"),
    status: enumValue(data, "status", EVENT_STATUSES),
    participantIds: stringList(data, "participantIds"),
    createdBy: stringValue(data, "createdBy"),
    approvedBy,
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
  return new FirebaseTripBackend(getAuth(app), getFirestore(app));
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
        onSnapshot(doc(this.firestore, "trips", tripId), (trip) => {
          if (trip.exists()) current.set(tripId, decodeTripRecord(tripId, trip.data()));
          else current.delete(tripId);
          publish();
        }),
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
    const publish = () => {
      if (trip) listener({ trip, members, events, expenses });
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
        events = snapshot.docs.map((event) => decodeEventRecord(event.id, event.data()));
        publish();
      }, fail),
      onSnapshot(collection(this.firestore, "trips", tripId, "expenses"), (snapshot) => {
        expenses = snapshot.docs.map((expense) => decodeExpenseRecord(expense.id, expense.data()));
        publish();
      }, fail),
    ]);
  }

  async createTrip(input: CreateTripInput, actor: AuthenticatedUser): Promise<TripRecord> {
    const tripRef = doc(collection(this.firestore, "trips"));
    const joinCode = createJoinCode();
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
    await batch.commit();
    return trip;
  }

  async joinTrip(_joinCode: string, _actor: AuthenticatedUser): Promise<never> {
    throw new UnsupportedTripOperationError(
      "Joining by code is disabled until a callable function or a server-verifiable join-proof schema is approved.",
    );
  }

  updateResponsibility(tripId: string, uid: string, responsibility: string): Promise<void> {
    return updateDoc(doc(this.firestore, "trips", tripId, "members", uid), { responsibility });
  }

  removeMember(tripId: string, uid: string): Promise<void> {
    return deleteDoc(doc(this.firestore, "trips", tripId, "members", uid));
  }

  async createEvent(tripId: string, input: CreateEventInput, actor: AuthenticatedUser): Promise<EventRecord> {
    validateEventInput(input);
    const member = await this.getMember(tripId, actor.uid);
    if (!member) throw new FirestoreDataError("Only a trip member can create an event.");
    const eventRef = doc(collection(this.firestore, "trips", tripId, "events"));
    const event: EventRecord = {
      id: eventRef.id,
      ...input,
      status: member.role === "lead" ? "approved" : "pending",
      createdBy: actor.uid,
      approvedBy: member.role === "lead" ? actor.uid : null,
    };
    await setDoc(eventRef, { ...withoutId(event), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return event;
  }

  async updateEvent(tripId: string, eventId: string, patch: Partial<CreateEventInput>): Promise<void> {
    validateEventPatch(patch);
    const eventRef = doc(this.firestore, "trips", tripId, "events", eventId);
    const existing = await getDoc(eventRef);
    if (!existing.exists()) throw new FirestoreDataError("Event does not exist.");
    const current = decodeEventRecord(eventId, existing.data());
    validateEventInput({
      title: patch.title ?? current.title,
      category: patch.category ?? current.category,
      startAt: patch.startAt ?? current.startAt,
      endAt: patch.endAt ?? current.endAt,
      participantIds: patch.participantIds ?? current.participantIds,
    });
    await updateDoc(eventRef, { ...patch, updatedAt: serverTimestamp() });
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

  async reorderEvents(_tripId: string, _eventIds: string[]): Promise<never> {
    throw new UnsupportedTripOperationError("Reordering is disabled because events have no approved persistent order field.");
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
}

function decodeTripRecord(id: string, data: DocumentData): TripRecord {
  return { id, name: stringValue(data, "name"), destination: stringValue(data, "destination"), startDate: stringValue(data, "startDate"), endDate: stringValue(data, "endDate"), leadId: stringValue(data, "leadId"), joinCode: stringValue(data, "joinCode") };
}

function decodeUserRecord(uid: string, data: DocumentData): UserRecord {
  return { uid, displayName: stringValue(data, "displayName"), email: stringValue(data, "email"), tripIds: stringList(data, "tripIds") };
}

function decodeMemberRecord(uid: string, data: DocumentData): MemberRecord {
  const role = stringValue(data, "role");
  if (role !== "lead" && role !== "member") throw new FirestoreDataError(`Unexpected member role: ${role}.`);
  const isDemo = value(data, "isDemo");
  if (typeof isDemo !== "boolean") throw new FirestoreDataError("Expected isDemo to be boolean.");
  return { uid, displayName: stringValue(data, "displayName"), email: stringValue(data, "email"), role, responsibility: stringValue(data, "responsibility"), isDemo };
}

function validateEventInput(input: CreateEventInput): void {
  if (!input.title.trim() || !EVENT_CATEGORIES.has(input.category) || !isDateTime(input.startAt) || !isDateTime(input.endAt) || Date.parse(input.endAt) <= Date.parse(input.startAt) || input.participantIds.length === 0) {
    throw new FirestoreDataError("Invalid event input.");
  }
}

function validateEventPatch(patch: Partial<CreateEventInput>): void {
  if (patch.title !== undefined && !patch.title.trim()) throw new FirestoreDataError("Event title is required.");
  if (patch.category !== undefined && !EVENT_CATEGORIES.has(patch.category)) throw new FirestoreDataError("Invalid event category.");
  if (patch.startAt !== undefined && !isDateTime(patch.startAt)) throw new FirestoreDataError("Invalid event start time.");
  if (patch.endAt !== undefined && !isDateTime(patch.endAt)) throw new FirestoreDataError("Invalid event end time.");
  if (patch.participantIds !== undefined && patch.participantIds.length === 0) throw new FirestoreDataError("An event needs participants.");
}

function validateExpenseInput(input: CreateExpenseInput): void {
  if (!input.title.trim() || !Number.isSafeInteger(input.amount) || input.amount < 0 || !input.paidBy || input.splitAmong.length === 0) {
    throw new FirestoreDataError("Expenses must use non-negative integer VND and include a payer and participants.");
  }
}

function isoDateTime(data: DocumentData, key: string): string {
  const result = stringValue(data, key);
  if (!isDateTime(result)) throw new FirestoreDataError(`Expected ${key} to be an ISO datetime.`);
  return result;
}

function isDateTime(value: string): boolean { return Number.isFinite(Date.parse(value)) && value.includes("T"); }
function isIsoDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)); }
function withoutId<T extends { id: string }>(record: T): Omit<T, "id"> { const { id: _id, ...data } = record; return data; }
function combineUnsubscribers(unsubscribers: Array<() => void>): () => void { return () => unsubscribers.forEach((unsubscribe) => unsubscribe()); }
function toAuthenticatedUser(user: { uid: string; email: string | null; displayName: string | null }): AuthenticatedUser { return { uid: user.uid, email: user.email, displayName: user.displayName }; }
function createJoinCode(): string { return Array.from(crypto.getRandomValues(new Uint32Array(2))).map((value) => value.toString(36).toUpperCase()).join("").slice(0, 10).padEnd(6, "0"); }
