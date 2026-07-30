import type {
  AuthenticatedUser,
  CreateEventInput,
  CreateExpenseInput,
  EventRecord,
  ExpenseRecord,
  FirestoreEventStatus,
  MemberRecord,
  TripBackend,
  TripRecord,
  TripSnapshot,
  UserRecord,
} from "../firebase/contracts";

const LOCAL_DEMO_QUERY_VALUE = "1";

const DEMO_LEAD: AuthenticatedUser = {
  uid: "demo-lead",
  email: "an.nhien@tripflow.demo",
  displayName: "An Nhiên",
};

const DEMO_MEMBERS: MemberRecord[] = [
  {
    uid: "demo-lead",
    displayName: "An Nhiên",
    email: "an.nhien@tripflow.demo",
    role: "lead",
    responsibility: "Điều phối lịch trình & phê duyệt",
    isDemo: true,
  },
  {
    uid: "demo-minh",
    displayName: "Minh Khoa",
    email: "minh.khoa@tripflow.demo",
    role: "member",
    responsibility: "Chi phí và hóa đơn chung",
    isDemo: true,
  },
  {
    uid: "demo-ha",
    displayName: "Hà Vy",
    email: "ha.vy@tripflow.demo",
    role: "member",
    responsibility: "Chỗ ở & check-in",
    isDemo: true,
  },
  {
    uid: "demo-tuan",
    displayName: "Tuấn Minh",
    email: "tuan.minh@tripflow.demo",
    role: "member",
    responsibility: "Di chuyển nội thành",
    isDemo: true,
  },
  {
    uid: "demo-linh",
    displayName: "Linh Chi",
    email: "linh.chi@tripflow.demo",
    role: "member",
    responsibility: "Ăn uống & điểm hẹn",
    isDemo: true,
  },
];

const BANGKOK_TRIP: TripRecord = {
  id: "demo-bangkok-ops",
  name: "Demo local · Bangkok Ops Week",
  destination: "Bangkok · dữ liệu minh họa",
  startDate: "2026-07-29",
  endDate: "2026-08-02",
  leadId: DEMO_LEAD.uid,
  joinCode: "BANGKOK26",
};

const DALAT_TRIP: TripRecord = {
  id: "demo-dalat-studio",
  name: "Demo local · Đà Lạt Studio Weekend",
  destination: "Đà Lạt · dữ liệu minh họa",
  startDate: "2026-08-14",
  endDate: "2026-08-16",
  leadId: DEMO_LEAD.uid,
  joinCode: "DALAT26",
};

const DANANG_TRIP: TripRecord = {
  id: "demo-danang-build",
  name: "Demo local · Đà Nẵng Build Week",
  destination: "Đà Nẵng · dữ liệu minh họa",
  startDate: "2026-09-03",
  endDate: "2026-09-06",
  leadId: DEMO_LEAD.uid,
  joinCode: "DANANG26",
};

/**
 * The rich board is an opt-in local preview. It has no Firebase adapter,
 * contains only synthetic identities, and resets whenever the page reloads.
 */
export function shouldUseLocalDemoPreview(
  search: string,
  isDevelopment: boolean,
): boolean {
  return isDevelopment && new URLSearchParams(search).get("demo") === LOCAL_DEMO_QUERY_VALUE;
}

export function createLocalDemoTripBackend(): TripBackend {
  return new LocalDemoTripBackend();
}

class LocalDemoTripBackend implements TripBackend {
  private session: AuthenticatedUser | null = copyUser(DEMO_LEAD);
  private readonly profiles = new Map<string, UserRecord>();
  private readonly snapshots = new Map<string, TripSnapshot>();
  private readonly sessionListeners = new Set<(user: AuthenticatedUser | null) => void>();
  private readonly tripListListeners = new Map<string, Set<(trips: TripRecord[]) => void>>();
  private readonly tripListeners = new Map<string, Set<(snapshot: TripSnapshot) => void>>();
  private idSequence = 0;

  constructor() {
    this.profiles.set(DEMO_LEAD.uid, profileFor(DEMO_LEAD, [BANGKOK_TRIP, DALAT_TRIP, DANANG_TRIP]));
    for (const snapshot of createInitialSnapshots()) {
      this.snapshots.set(snapshot.trip.id, copySnapshot(snapshot));
    }
  }

  observeSession(listener: (user: AuthenticatedUser | null) => void): () => void {
    this.sessionListeners.add(listener);
    listener(copyUserOrNull(this.session));
    return () => this.sessionListeners.delete(listener);
  }

  async register(
    email: string,
    _password: string,
    displayName: string,
  ): Promise<AuthenticatedUser> {
    const user: AuthenticatedUser = {
      uid: this.nextId("demo-user"),
      email,
      displayName: displayName.trim() || "Khách demo",
    };
    this.profiles.set(user.uid, profileFor(user, []));
    this.setSession(user);
    return copyUser(user);
  }

  async login(email: string, _password: string): Promise<AuthenticatedUser> {
    const existing = [...this.profiles.values()].find(
      (profile) => profile.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
    );
    if (!existing) {
      throw new Error("Tài khoản không thuộc dữ liệu demo local.");
    }
    const user: AuthenticatedUser = {
      uid: existing.uid,
      email: existing.email,
      displayName: existing.displayName,
    };
    this.setSession(user);
    return copyUser(user);
  }

  async logout(): Promise<void> {
    this.setSession(null);
  }

  async upsertProfile(user: AuthenticatedUser): Promise<void> {
    const currentTrips = this.tripsFor(user.uid);
    this.profiles.set(user.uid, profileFor(user, currentTrips));
  }

  async getProfile(uid: string): Promise<UserRecord | null> {
    const profile = this.profiles.get(uid);
    return profile ? copyProfile(profile) : null;
  }

  subscribeTrips(uid: string, listener: (trips: TripRecord[]) => void): () => void {
    const listeners = this.tripListListeners.get(uid) ?? new Set<(trips: TripRecord[]) => void>();
    listeners.add(listener);
    this.tripListListeners.set(uid, listeners);
    listener(this.tripsFor(uid));
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.tripListListeners.delete(uid);
    };
  }

  subscribeTrip(
    tripId: string,
    listener: (snapshot: TripSnapshot) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const snapshot = this.snapshots.get(tripId);
    if (!snapshot) {
      onError?.(new Error("Không tìm thấy chuyến demo local."));
      return () => undefined;
    }
    const listeners = this.tripListeners.get(tripId) ?? new Set<(snapshot: TripSnapshot) => void>();
    listeners.add(listener);
    this.tripListeners.set(tripId, listeners);
    listener(copySnapshot(snapshot));
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.tripListeners.delete(tripId);
    };
  }

  async createTrip(input: Parameters<TripBackend["createTrip"]>[0], actor: AuthenticatedUser): Promise<TripRecord> {
    const trip: TripRecord = {
      id: this.nextId("demo-trip"),
      name: input.name.trim(),
      destination: `${input.destination.trim()} · dữ liệu demo local`,
      startDate: input.startDate,
      endDate: input.endDate,
      leadId: actor.uid,
      joinCode: `LOCAL${String(this.idSequence).padStart(2, "0")}`,
    };
    const member: MemberRecord = {
      uid: actor.uid,
      displayName: actor.displayName ?? actor.email ?? "Khách demo",
      email: actor.email ?? "guest@tripflow.demo",
      role: "lead",
      responsibility: "Điều phối chuyến demo",
      isDemo: true,
    };
    this.snapshots.set(trip.id, { trip, members: [member], events: [], expenses: [] });
    this.profiles.set(actor.uid, profileFor(actor, this.tripsFor(actor.uid)));
    this.emitTrips(actor.uid);
    return copyTrip(trip);
  }

  async joinTrip(_joinCode: string, _actor: AuthenticatedUser): Promise<never> {
    throw new Error("Mã tham gia cần xác minh từ server; bản local vẫn khóa an toàn.");
  }

  async updateResponsibility(tripId: string, uid: string, responsibility: string): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      members: snapshot.members.map((member) =>
        member.uid === uid ? { ...member, responsibility: responsibility.trim() } : member,
      ),
    }));
  }

  async removeMember(tripId: string, uid: string): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => {
      if (uid === snapshot.trip.leadId) {
        throw new Error("Không thể xóa lead của chuyến demo.");
      }
      return {
        ...snapshot,
        members: snapshot.members.filter((member) => member.uid !== uid),
        events: snapshot.events.map((event) => ({
          ...event,
          participantIds: event.participantIds.filter((participantId) => participantId !== uid),
        })),
        expenses: snapshot.expenses.map((expense) => ({
          ...expense,
          splitAmong: expense.splitAmong.filter((participantId) => participantId !== uid),
        })),
      };
    });
  }

  async createEvent(
    tripId: string,
    input: CreateEventInput,
    actor: AuthenticatedUser,
  ): Promise<EventRecord> {
    const snapshot = this.requireSnapshot(tripId);
    const role = snapshot.members.find((member) => member.uid === actor.uid)?.role ?? "member";
    const event: EventRecord = {
      id: this.nextId("demo-event"),
      order: nextOrder(snapshot.events),
      title: input.title.trim(),
      category: input.category,
      startAt: input.startAt,
      endAt: input.endAt,
      status: role === "lead" ? "approved" : "pending",
      participantIds: [...input.participantIds],
      createdBy: actor.uid,
      approvedBy: role === "lead" ? actor.uid : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.updateSnapshot(tripId, (current) => ({
      ...current,
      events: [...current.events, event],
    }));
    return copyEvent(event);
  }

  async updateEvent(
    tripId: string,
    eventId: string,
    patch: Partial<CreateEventInput>,
  ): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      events: snapshot.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              ...patch,
              ...(patch.participantIds ? { participantIds: [...patch.participantIds] } : {}),
              updatedAt: nowIso(),
            }
          : event,
      ),
    }));
  }

  async approveEvent(
    tripId: string,
    eventId: string,
    status: Exclude<FirestoreEventStatus, "pending">,
  ): Promise<void> {
    const approverId = this.session?.uid ?? null;
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      events: snapshot.events.map((event) =>
        event.id === eventId ? { ...event, status, approvedBy: approverId, updatedAt: nowIso() } : event,
      ),
    }));
  }

  async deleteEvent(tripId: string, eventId: string): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      events: snapshot.events.filter((event) => event.id !== eventId),
    }));
  }

  async reorderEvents(tripId: string, eventIds: string[]): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => {
      const eventById = new Map(snapshot.events.map((event) => [event.id, event]));
      const ordered = eventIds
        .map((eventId) => eventById.get(eventId))
        .filter((event): event is EventRecord => Boolean(event))
        .map((event, order) => ({ ...event, order, updatedAt: nowIso() }));
      const remaining = snapshot.events
        .filter((event) => !eventIds.includes(event.id))
        .sort((left, right) => left.order - right.order)
        .map((event, offset) => ({ ...event, order: ordered.length + offset, updatedAt: nowIso() }));
      return { ...snapshot, events: [...ordered, ...remaining] };
    });
  }

  async createExpense(
    tripId: string,
    input: CreateExpenseInput,
    actor: AuthenticatedUser,
  ): Promise<ExpenseRecord> {
    const expense: ExpenseRecord = {
      id: this.nextId("demo-expense"),
      title: input.title.trim(),
      amount: input.amount,
      paidBy: input.paidBy,
      splitAmong: [...input.splitAmong],
      status: "pending",
      createdBy: actor.uid,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      expenses: [...snapshot.expenses, expense],
    }));
    return copyExpense(expense);
  }

  async updateExpense(
    tripId: string,
    expenseId: string,
    patch: Partial<CreateExpenseInput>,
  ): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      expenses: snapshot.expenses.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              ...patch,
              ...(patch.splitAmong ? { splitAmong: [...patch.splitAmong] } : {}),
              updatedAt: nowIso(),
            }
          : expense,
      ),
    }));
  }

  async deleteExpense(tripId: string, expenseId: string): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      expenses: snapshot.expenses.filter((expense) => expense.id !== expenseId),
    }));
  }

  async settleExpense(tripId: string, expenseId: string): Promise<void> {
    this.updateSnapshot(tripId, (snapshot) => ({
      ...snapshot,
      expenses: snapshot.expenses.map((expense) =>
        expense.id === expenseId ? { ...expense, status: "settled", updatedAt: nowIso() } : expense,
      ),
    }));
  }

  private setSession(nextSession: AuthenticatedUser | null): void {
    this.session = nextSession ? copyUser(nextSession) : null;
    const session = copyUserOrNull(this.session);
    this.sessionListeners.forEach((listener) => listener(session));
  }

  private requireSnapshot(tripId: string): TripSnapshot {
    const snapshot = this.snapshots.get(tripId);
    if (!snapshot) throw new Error("Không tìm thấy chuyến demo local.");
    return copySnapshot(snapshot);
  }

  private updateSnapshot(
    tripId: string,
    update: (snapshot: TripSnapshot) => TripSnapshot,
  ): void {
    const nextSnapshot = copySnapshot(update(this.requireSnapshot(tripId)));
    this.snapshots.set(tripId, nextSnapshot);
    this.emitTrip(tripId);
    for (const member of nextSnapshot.members) this.emitTrips(member.uid);
  }

  private tripsFor(uid: string): TripRecord[] {
    return [...this.snapshots.values()]
      .filter((snapshot) => snapshot.members.some((member) => member.uid === uid))
      .map((snapshot) => copyTrip(snapshot.trip));
  }

  private emitTrips(uid: string): void {
    const listeners = this.tripListListeners.get(uid);
    if (!listeners) return;
    const trips = this.tripsFor(uid);
    listeners.forEach((listener) => listener(trips));
  }

  private emitTrip(tripId: string): void {
    const snapshot = this.snapshots.get(tripId);
    const listeners = this.tripListeners.get(tripId);
    if (!snapshot || !listeners) return;
    listeners.forEach((listener) => listener(copySnapshot(snapshot)));
  }

  private nextId(prefix: string): string {
    this.idSequence += 1;
    return `${prefix}-${this.idSequence}`;
  }
}

function createInitialSnapshots(): TripSnapshot[] {
  return [
    {
      trip: BANGKOK_TRIP,
      members: DEMO_MEMBERS,
      events: [
        event("bkk-01", 0, "Tập trung tại sân bay", "transport", "2026-07-29T01:00:00.000Z", "2026-07-29T02:00:00.000Z", "completed", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-lead", "demo-lead"),
        event("bkk-02", 1, "Check-in hostel Ari", "stay", "2026-07-29T08:30:00.000Z", "2026-07-29T09:15:00.000Z", "completed", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-ha", "demo-lead"),
        event("bkk-03", 2, "Ăn trưa khao soi", "food", "2026-07-29T11:00:00.000Z", "2026-07-29T12:20:00.000Z", "completed", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-linh", "demo-lead"),
        event("bkk-04", 3, "Đi bộ Talad Noi", "activity", "2026-07-29T13:00:00.000Z", "2026-07-29T15:30:00.000Z", "completed", ["demo-lead", "demo-ha", "demo-tuan", "demo-linh"], "demo-minh", "demo-lead"),
        event("bkk-05", 4, "Mở room điều phối", "other", "2026-07-30T03:00:00.000Z", "2026-07-30T03:30:00.000Z", "completed", ["demo-lead", "demo-minh"], "demo-lead", "demo-lead"),
        event("bkk-06", 5, "Di chuyển BTS đến IconSiam", "transport", "2026-07-30T06:00:00.000Z", "2026-07-30T07:00:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-tuan", "demo-lead"),
        event("bkk-07", 6, "Street food Yaowarat", "food", "2026-07-30T12:00:00.000Z", "2026-07-30T15:00:00.000Z", "happening", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-linh", "demo-lead"),
        event("bkk-08", 7, "Đề xuất bảo tàng MOCA", "activity", "2026-07-31T03:00:00.000Z", "2026-07-31T05:30:00.000Z", "pending", ["demo-lead", "demo-minh", "demo-ha"], "demo-ha", null),
        event("bkk-09", 8, "Phương án trời mưa", "other", "2026-07-31T06:00:00.000Z", "2026-07-31T07:00:00.000Z", "cancelled", ["demo-lead", "demo-minh"], "demo-minh", "demo-lead"),
        event("bkk-10", 9, "Xe đêm về sân bay", "transport", "2026-08-02T12:00:00.000Z", "2026-08-02T15:00:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-tuan", "demo-lead"),
      ],
      expenses: [
        expense("bkk-exp-01", "Vé Airport Rail Link", 224_000, "demo-tuan", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "settled", "demo-tuan"),
        expense("bkk-exp-02", "Hostel Ari · 3 đêm", 3_150_000, "demo-ha", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "settled", "demo-ha"),
        expense("bkk-exp-03", "Khao soi & đồ uống", 485_000, "demo-linh", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-linh"),
        expense("bkk-exp-04", "Vé tàu BTS nhóm", 360_000, "demo-tuan", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-tuan"),
        expense("bkk-exp-05", "Vé workshop sáng tạo", 1_250_000, "demo-lead", ["demo-lead", "demo-minh", "demo-ha", "demo-linh"], "settled", "demo-lead"),
        expense("bkk-exp-06", "Cà phê & coworking", 318_000, "demo-minh", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-minh"),
        expense("bkk-exp-07", "Yaowarat dinner", 690_000, "demo-linh", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-linh"),
        expense("bkk-exp-08", "Grab về sân bay", 410_000, "demo-lead", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-lead"),
      ],
    },
    {
      trip: DALAT_TRIP,
      members: DEMO_MEMBERS,
      events: [
        event("dl-01", 0, "Đón xe đêm", "transport", "2026-08-14T14:00:00.000Z", "2026-08-14T15:00:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-tuan", "demo-lead"),
        event("dl-02", 1, "Check-in studio thông", "stay", "2026-08-15T02:00:00.000Z", "2026-08-15T03:00:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-ha", "demo-lead"),
        event("dl-03", 2, "Chụp ảnh hồ Tuyền Lâm", "activity", "2026-08-15T06:00:00.000Z", "2026-08-15T08:00:00.000Z", "pending", ["demo-lead", "demo-minh", "demo-ha"], "demo-minh", null),
        event("dl-04", 3, "Ăn tối chợ Đà Lạt", "food", "2026-08-15T11:30:00.000Z", "2026-08-15T13:30:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-linh", "demo-lead"),
      ],
      expenses: [
        expense("dl-exp-01", "Studio thông", 2_400_000, "demo-ha", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-ha"),
        expense("dl-exp-02", "Xe limousine", 1_750_000, "demo-tuan", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-tuan"),
        expense("dl-exp-03", "Set bánh căn", 450_000, "demo-linh", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "settled", "demo-linh"),
      ],
    },
    {
      trip: DANANG_TRIP,
      members: DEMO_MEMBERS,
      events: [
        event("dn-01", 0, "Đến sân bay Đà Nẵng", "transport", "2026-09-03T03:00:00.000Z", "2026-09-03T04:00:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-tuan", "demo-lead"),
        event("dn-02", 1, "Nhận villa Mỹ Khê", "stay", "2026-09-03T06:00:00.000Z", "2026-09-03T07:00:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-ha", "demo-lead"),
        event("dn-03", 2, "Review sprint tại coworking", "other", "2026-09-04T02:00:00.000Z", "2026-09-04T04:00:00.000Z", "pending", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-lead", null),
        event("dn-04", 3, "Ăn hải sản Mân Thái", "food", "2026-09-04T11:00:00.000Z", "2026-09-04T13:00:00.000Z", "approved", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "demo-linh", "demo-lead"),
      ],
      expenses: [
        expense("dn-exp-01", "Villa Mỹ Khê", 4_600_000, "demo-ha", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-ha"),
        expense("dn-exp-02", "Thuê xe 4 ngày", 2_200_000, "demo-tuan", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "settled", "demo-tuan"),
        expense("dn-exp-03", "Hải sản Mân Thái", 1_180_000, "demo-linh", ["demo-lead", "demo-minh", "demo-ha", "demo-tuan", "demo-linh"], "pending", "demo-linh"),
      ],
    },
  ].map(copySnapshot);
}

function event(
  id: string,
  order: number,
  title: string,
  category: EventRecord["category"],
  startAt: string,
  endAt: string,
  status: EventRecord["status"],
  participantIds: string[],
  createdBy: string,
  approvedBy: string | null,
): EventRecord {
  const timestamp = demoRecordTimestamp(id);
  return { id, order, title, category, startAt, endAt, status, participantIds, createdBy, approvedBy, createdAt: timestamp, updatedAt: timestamp };
}

function expense(
  id: string,
  title: string,
  amount: number,
  paidBy: string,
  splitAmong: string[],
  status: ExpenseRecord["status"],
  createdBy: string,
): ExpenseRecord {
  const timestamp = demoRecordTimestamp(id);
  return { id, title, amount, paidBy, splitAmong, status, createdBy, createdAt: timestamp, updatedAt: timestamp };
}

function nowIso(): string {
  return new Date().toISOString();
}

function demoRecordTimestamp(id: string): string {
  const sequence = Number(id.match(/(\d+)$/)?.[1] ?? "0");
  return new Date(Date.UTC(2026, 6, 30, 7, sequence * 7, 0)).toISOString();
}

function profileFor(user: AuthenticatedUser, trips: TripRecord[]): UserRecord {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Khách demo",
    email: user.email ?? "guest@tripflow.demo",
    tripIds: trips.map((trip) => trip.id),
  };
}

function nextOrder(events: EventRecord[]): number {
  return events.reduce((max, event) => Math.max(max, event.order), -1) + 1;
}

function copyUser(user: AuthenticatedUser): AuthenticatedUser {
  return { ...user };
}

function copyUserOrNull(user: AuthenticatedUser | null): AuthenticatedUser | null {
  return user ? copyUser(user) : null;
}

function copyProfile(profile: UserRecord): UserRecord {
  return { ...profile, tripIds: [...profile.tripIds] };
}

function copyTrip(trip: TripRecord): TripRecord {
  return { ...trip };
}

function copyEvent(event: EventRecord): EventRecord {
  return { ...event, participantIds: [...event.participantIds] };
}

function copyExpense(expense: ExpenseRecord): ExpenseRecord {
  return { ...expense, splitAmong: [...expense.splitAmong] };
}

function copySnapshot(snapshot: TripSnapshot): TripSnapshot {
  return {
    trip: copyTrip(snapshot.trip),
    members: snapshot.members.map((member) => ({ ...member })),
    events: snapshot.events.map(copyEvent),
    expenses: snapshot.expenses.map(copyExpense),
  };
}
