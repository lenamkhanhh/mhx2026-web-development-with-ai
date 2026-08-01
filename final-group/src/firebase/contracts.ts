/**
 * Firestore-facing contract. These types deliberately mirror
 * references/data-model.md instead of the temporary UI/domain vocabulary.
 */
export type FirestoreMemberRole = "lead" | "member";
export type FirestoreEventCategory =
  | "transport"
  | "stay"
  | "food"
  | "activity"
  | "other";
export type FirestoreEventStatus =
  | "pending"
  | "approved"
  | "happening"
  | "completed"
  | "cancelled"
  | "paused";
export type ExpenseStatus = "pending" | "settled";
export type FirestoreEventPriority = "low" | "medium" | "high";
export type ExpenseCategory =
  | "transport"
  | "accommodation"
  | "food"
  | "activities"
  | "other";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface UserRecord {
  uid: string;
  displayName: string;
  email: string;
  tripIds: string[];
}

export interface TripRecord {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  leadId: string;
  joinCode: string;
  /** Optional migration-safe trip spending cap, stored as integer VND. */
  budgetVnd?: number;
}

export interface MemberRecord {
  uid: string;
  displayName: string;
  email: string;
  role: FirestoreMemberRole;
  responsibility: string;
  isDemo: boolean;
  /** Present only for members who joined through a server-verifiable proof. */
  joinedWithProofId?: string;
}

export interface EventRecord {
  id: string;
  /** Stable, lead-controlled position in the trip itinerary. */
  order: number;
  title: string;
  /** Empty only for migration-safe legacy documents. New writes require text. */
  description: string;
  category: FirestoreEventCategory;
  startAt: string;
  endAt: string;
  status: FirestoreEventStatus;
  participantIds: string[];
  createdBy: string;
  approvedBy: string | null;
  /** Optional operational details. Missing values must render as not set. */
  location?: string;
  assigneeUid?: string;
  priority?: FirestoreEventPriority;
  /** Firestore server timestamps exposed as ISO strings when available. */
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  /** Integer VND. */
  amount: number;
  paidBy: string;
  splitAmong: string[];
  status: ExpenseStatus;
  createdBy: string;
  /** Optional declared expense category; never inferred from a title. */
  category?: ExpenseCategory;
  /** Optional normalized link to the itinerary item that created this cost. */
  eventId?: string;
  /** Firestore server timestamps exposed as ISO strings when available. */
  createdAt?: string;
  updatedAt?: string;
}

/** Plain-text collaboration note attached to one itinerary item. */
export interface EventNote {
  id: string;
  eventId: string;
  body: string;
  createdBy: string;
  createdAt: string;
}

/** A lightweight planning checklist item attached to one itinerary item. */
export interface EventSubitem {
  id: string;
  eventId: string;
  title: string;
  completed: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Actor-attributed UI context, not a server-forensic audit trail. */
export interface TripActivity {
  id: string;
  kind: "note_added" | "subitem_added" | "subitem_completed" | "subitem_reopened";
  eventId: string;
  actorId: string;
  label: string;
  createdAt: string;
}

export interface TripSnapshot {
  trip: TripRecord;
  members: MemberRecord[];
  events: EventRecord[];
  expenses: ExpenseRecord[];
  /** Optional during the additive Firestore migration; repository snapshots emit arrays. */
  notes?: EventNote[];
  subitems?: EventSubitem[];
  activity?: TripActivity[];
}

export interface CreateTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetVnd?: number;
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: FirestoreEventCategory;
  startAt: string;
  endAt: string;
  participantIds: string[];
  location?: string;
  assigneeUid?: string;
  priority?: FirestoreEventPriority;
  /** Optional event cost, persisted as one linked expense document. */
  expenseAmount?: number;
  expensePaidBy?: string;
}

/**
 * Optional event metadata is stored as an absent Firestore field. `null` is
 * therefore an explicit clear instruction at the repository boundary, not a
 * value persisted in the document.
 */
export type UpdateEventInput = Omit<Partial<CreateEventInput>, "location" | "assigneeUid" | "priority"> & {
  location?: string | null;
  assigneeUid?: string | null;
  priority?: FirestoreEventPriority | null;
};

export interface CreateExpenseInput {
  title: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  category?: ExpenseCategory;
  eventId?: string;
}

export interface TripBackend {
  observeSession(listener: (user: AuthenticatedUser | null) => void): () => void;
  register(email: string, password: string, displayName: string): Promise<AuthenticatedUser>;
  login(email: string, password: string): Promise<AuthenticatedUser>;
  logout(): Promise<void>;
  upsertProfile(user: AuthenticatedUser): Promise<void>;
  getProfile(uid: string): Promise<UserRecord | null>;
  subscribeTrips(uid: string, listener: (trips: TripRecord[]) => void): () => void;
  subscribeTrip(
    tripId: string,
    listener: (snapshot: TripSnapshot) => void,
    onError?: (error: Error) => void,
  ): () => void;
  createTrip(input: CreateTripInput, actor: AuthenticatedUser): Promise<TripRecord>;
  /**
   * Intentionally fails closed until the schema supplies a server-verified
   * join proof (see the handoff). A client must never be allowed to self-add
   * to a trip merely by knowing its id.
   */
  joinTrip(joinCode: string, actor: AuthenticatedUser): Promise<TripRecord>;
  updateResponsibility(tripId: string, uid: string, responsibility: string): Promise<void>;
  removeMember(tripId: string, uid: string): Promise<void>;
  createEvent(tripId: string, input: CreateEventInput, actor: AuthenticatedUser): Promise<EventRecord>;
  updateEvent(tripId: string, eventId: string, patch: UpdateEventInput): Promise<void>;
  approveEvent(tripId: string, eventId: string, status: Exclude<FirestoreEventStatus, "pending">): Promise<void>;
  deleteEvent(tripId: string, eventId: string): Promise<void>;
  reorderEvents(tripId: string, eventIds: string[]): Promise<void>;
  createEventNote?(tripId: string, eventId: string, body: string): Promise<void>;
  deleteEventNote?(tripId: string, noteId: string): Promise<void>;
  createEventSubitem?(tripId: string, eventId: string, title: string): Promise<void>;
  toggleEventSubitem?(tripId: string, subitemId: string, completed: boolean): Promise<void>;
  deleteEventSubitem?(tripId: string, subitemId: string): Promise<void>;
  createExpense(tripId: string, input: CreateExpenseInput, actor: AuthenticatedUser): Promise<ExpenseRecord>;
  updateExpense(tripId: string, expenseId: string, patch: Partial<CreateExpenseInput>): Promise<void>;
  deleteExpense(tripId: string, expenseId: string): Promise<void>;
  settleExpense(tripId: string, expenseId: string): Promise<void>;
}
