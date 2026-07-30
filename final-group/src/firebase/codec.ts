import type {
  CreateTripInput,
  EventRecord,
  ExpenseCategory,
  ExpenseRecord,
  FirestoreEventCategory,
  FirestoreEventPriority,
  FirestoreEventStatus,
  TripRecord,
} from "./contracts";

import type { DocumentData } from "firebase/firestore";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
}

type Environment = Record<string, string | undefined>;

export const EVENT_CATEGORIES = new Set<FirestoreEventCategory>([
  "transport", "stay", "food", "activity", "other",
]);
export const EVENT_STATUSES = new Set<FirestoreEventStatus>([
  "pending", "approved", "happening", "completed", "cancelled",
]);
export const EVENT_PRIORITIES = new Set<FirestoreEventPriority>(["low", "medium", "high"]);
export const EXPENSE_CATEGORIES = new Set<ExpenseCategory>([
  "transport", "accommodation", "food", "activities", "other",
]);
const APPROVAL_STATUSES = new Set<Exclude<FirestoreEventStatus, "pending">>([
  "approved", "happening", "completed", "cancelled",
]);

export class FirestoreDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreDataError";
  }
}

export function assertApprovalStatus(
  value: unknown,
): Exclude<FirestoreEventStatus, "pending"> {
  if (
    typeof value !== "string" ||
    !APPROVAL_STATUSES.has(value as Exclude<FirestoreEventStatus, "pending">)
  ) {
    throw new FirestoreDataError("Invalid approval status.");
  }
  return value as Exclude<FirestoreEventStatus, "pending">;
}

function value(data: DocumentData, key: string): unknown { return data[key]; }

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

export function createTripRecord(input: CreateTripInput, leadId: string, joinCode: string): Omit<TripRecord, "id"> {
  if (!input.name.trim() || !input.destination.trim()) throw new FirestoreDataError("Trip name and destination are required.");
  if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate) || input.endDate < input.startDate) {
    throw new FirestoreDataError("Trip dates must be valid YYYY-MM-DD values.");
  }
  if (!leadId || !/^[A-Z0-9]{6,16}$/.test(joinCode)) throw new FirestoreDataError("Trip lead and uppercase join code are required.");
  if (input.budgetVnd !== undefined && (!Number.isSafeInteger(input.budgetVnd) || input.budgetVnd < 0)) {
    throw new FirestoreDataError("Trip budget must be a non-negative integer VND amount.");
  }
  return { ...input, name: input.name.trim(), destination: input.destination.trim(), leadId, joinCode };
}

export function decodeEventRecord(id: string, data: DocumentData): EventRecord {
  const approvedBy = value(data, "approvedBy");
  if (approvedBy !== null && typeof approvedBy !== "string") throw new FirestoreDataError("Expected approvedBy to be a uid or null.");
  const rawOrder = value(data, "order");
  const order = rawOrder === undefined ? Number.MAX_SAFE_INTEGER : rawOrder;
  if (typeof order !== "number" || !Number.isSafeInteger(order) || order < 0) {
    throw new FirestoreDataError("Expected order to be a non-negative integer.");
  }
  return { id, order, title: stringValue(data, "title"), category: enumValue(data, "category", EVENT_CATEGORIES), startAt: isoDateTime(data, "startAt"), endAt: isoDateTime(data, "endAt"), status: enumValue(data, "status", EVENT_STATUSES), participantIds: stringList(data, "participantIds"), createdBy: stringValue(data, "createdBy"), approvedBy, location: optionalString(data, "location"), assigneeUid: optionalString(data, "assigneeUid"), priority: optionalEnumValue(data, "priority", EVENT_PRIORITIES), createdAt: optionalTimestamp(data, "createdAt"), updatedAt: optionalTimestamp(data, "updatedAt") };
}

export function decodeExpenseRecord(id: string, data: DocumentData): ExpenseRecord {
  const amount = value(data, "amount");
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) throw new FirestoreDataError("Expense amount must be a non-negative integer VND amount.");
  const status = stringValue(data, "status");
  if (status !== "pending" && status !== "settled") throw new FirestoreDataError(`Unexpected expense status: ${status}.`);
  return { id, title: stringValue(data, "title"), amount, paidBy: stringValue(data, "paidBy"), splitAmong: stringList(data, "splitAmong"), status, createdBy: stringValue(data, "createdBy"), category: optionalEnumValue(data, "category", EXPENSE_CATEGORIES), createdAt: optionalTimestamp(data, "createdAt"), updatedAt: optionalTimestamp(data, "updatedAt") };
}

export function resolveFirebaseConfig(environment: Environment): FirebaseClientConfig {
  const required = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"] as const;
  const values = Object.fromEntries(required.map((key) => [key, environment[`VITE_FIREBASE_${key}`]?.trim()])) as Record<(typeof required)[number], string | undefined>;
  const missing = required.filter((key) => !values[key]);
  if (missing.length > 0) throw new FirestoreDataError(`Missing public Firebase configuration: ${missing.join(", ")}.`);
  return { apiKey: values.API_KEY!, authDomain: values.AUTH_DOMAIN!, projectId: values.PROJECT_ID!, appId: values.APP_ID!, ...(environment.VITE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: environment.VITE_FIREBASE_MESSAGING_SENDER_ID } : {}) };
}

export function validateEventInput(input: { title: string; category: FirestoreEventCategory; startAt: string; endAt: string; participantIds: string[]; location?: string; assigneeUid?: string; priority?: FirestoreEventPriority }): void {
  if (!input.title.trim() || !EVENT_CATEGORIES.has(input.category) || !isDateTime(input.startAt) || !isDateTime(input.endAt) || Date.parse(input.endAt) <= Date.parse(input.startAt) || input.participantIds.length === 0) throw new FirestoreDataError("Invalid event input.");
  if (input.location !== undefined && !input.location.trim()) throw new FirestoreDataError("Event location cannot be blank.");
  if (input.assigneeUid !== undefined && !input.assigneeUid.trim()) throw new FirestoreDataError("Event assignee cannot be blank.");
  if (input.priority !== undefined && !EVENT_PRIORITIES.has(input.priority)) throw new FirestoreDataError("Invalid event priority.");
}

export function validateEventPatch(patch: Partial<{ title: string; category: FirestoreEventCategory; startAt: string; endAt: string; participantIds: string[]; location?: string; assigneeUid?: string; priority?: FirestoreEventPriority }>): void {
  if (patch.title !== undefined && !patch.title.trim()) throw new FirestoreDataError("Event title is required.");
  if (patch.category !== undefined && !EVENT_CATEGORIES.has(patch.category)) throw new FirestoreDataError("Invalid event category.");
  if (patch.startAt !== undefined && !isDateTime(patch.startAt)) throw new FirestoreDataError("Invalid event start time.");
  if (patch.endAt !== undefined && !isDateTime(patch.endAt)) throw new FirestoreDataError("Invalid event end time.");
  if (patch.participantIds !== undefined && patch.participantIds.length === 0) throw new FirestoreDataError("An event needs participants.");
  if (patch.location !== undefined && !patch.location.trim()) throw new FirestoreDataError("Event location cannot be blank.");
  if (patch.assigneeUid !== undefined && !patch.assigneeUid.trim()) throw new FirestoreDataError("Event assignee cannot be blank.");
  if (patch.priority !== undefined && !EVENT_PRIORITIES.has(patch.priority)) throw new FirestoreDataError("Invalid event priority.");
}

export function validateExpenseInput(input: { title: string; amount: number; paidBy: string; splitAmong: string[]; category?: ExpenseCategory }): void {
  if (!input.title.trim() || !Number.isSafeInteger(input.amount) || input.amount < 0 || !input.paidBy || input.splitAmong.length === 0) throw new FirestoreDataError("Expenses must use non-negative integer VND and include a payer and participants.");
  if (input.category !== undefined && !EXPENSE_CATEGORIES.has(input.category)) throw new FirestoreDataError("Invalid expense category.");
}

function optionalString(data: DocumentData, key: string): string | undefined {
  const result = value(data, key);
  if (result === undefined || result === null) return undefined;
  if (typeof result !== "string" || !result.trim()) throw new FirestoreDataError(`Expected ${key} to be a non-empty string.`);
  return result;
}

function optionalEnumValue<T extends string>(data: DocumentData, key: string, valid: Set<T>): T | undefined {
  const result = optionalString(data, key);
  if (result === undefined) return undefined;
  if (!valid.has(result as T)) throw new FirestoreDataError(`Unexpected ${key}: ${result}.`);
  return result as T;
}

function isoDateTime(data: DocumentData, key: string): string {
  const result = stringValue(data, key);
  if (!isDateTime(result)) throw new FirestoreDataError(`Expected ${key} to be an ISO datetime.`);
  return result;
}
function optionalTimestamp(data: DocumentData, key: string): string | undefined {
  const result = value(data, key);
  if (result === undefined || result === null) return undefined;
  if (typeof result === "string" && isDateTime(result)) return new Date(result).toISOString();
  if (typeof result === "object" && result !== null && "toDate" in result) {
    const toDate = (result as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      const parsed = (toDate as () => Date)();
      if (parsed instanceof Date && Number.isFinite(parsed.getTime())) return parsed.toISOString();
    }
  }
  throw new FirestoreDataError(`Expected ${key} to be a Firestore timestamp.`);
}
function isDateTime(value: string): boolean { return Number.isFinite(Date.parse(value)) && value.includes("T"); }
function isIsoDate(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)); }
