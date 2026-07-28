export type MemberRole = "lead" | "member";

export type EventStatus =
  | "pending"
  | "upcoming"
  | "ongoing"
  | "done"
  | "cancelled"
  | "paused";

export type EventCategory =
  | "food"
  | "sightseeing"
  | "bonding"
  | "transport"
  | "other";

export interface TripEvent {
  id: string;
  tripId: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  category: EventCategory;
  status: EventStatus;
  participantIds: string[];
  payerId: string | null;
  amount: number;
  createdBy: string;
  approvedBy: string | null;
  order: number;
}

export interface BalanceMember {
  id: string;
  displayName: string;
}

export interface MemberBalance {
  memberId: string;
  displayName: string;
  paid: number;
  owed: number;
  balance: number;
}

export interface EventPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

const PRESERVED_STATUSES = new Set<EventStatus>([
  "pending",
  "paused",
  "cancelled",
]);

export function validateEventInput(
  event: Pick<
    TripEvent,
    | "title"
    | "startAt"
    | "endAt"
    | "amount"
    | "participantIds"
    | "payerId"
  >,
): string[] {
  const errors: string[] = [];
  const start = Date.parse(event.startAt);
  const end = Date.parse(event.endAt);

  if (!event.title.trim()) {
    errors.push("Tiêu đề là bắt buộc.");
  } else if (event.title.trim().length > 120) {
    errors.push("Tiêu đề không được vượt quá 120 ký tự.");
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    errors.push("Thời gian bắt đầu và kết thúc không hợp lệ.");
  } else if (end <= start) {
    errors.push("Giờ kết thúc phải sau giờ bắt đầu.");
  }

  if (!Number.isFinite(event.amount) || event.amount < 0) {
    errors.push("Chi phí phải là số không âm.");
  }

  if (event.amount > 0 && event.participantIds.length === 0) {
    errors.push("Event có chi phí phải có ít nhất một thành viên.");
  }

  if (
    event.amount > 0 &&
    (!event.payerId || !event.participantIds.includes(event.payerId))
  ) {
    errors.push("Người trả phải là một thành viên tham gia event.");
  }

  return errors;
}

export function hasScheduleConflict(
  candidate: Pick<TripEvent, "id" | "startAt" | "endAt" | "status">,
  events: TripEvent[],
): boolean {
  const start = Date.parse(candidate.startAt);
  const end = Date.parse(candidate.endAt);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

  return events.some((event) => {
    if (event.id === candidate.id || event.status === "pending") return false;

    const eventStart = Date.parse(event.startAt);
    const eventEnd = Date.parse(event.endAt);
    return start < eventEnd && end > eventStart;
  });
}

export function deriveEventStatus(
  event: Pick<TripEvent, "status" | "startAt" | "endAt">,
  now = new Date(),
): EventStatus {
  if (PRESERVED_STATUSES.has(event.status)) return event.status;

  const currentTime = now.getTime();
  const start = Date.parse(event.startAt);
  const end = Date.parse(event.endAt);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return event.status;
  if (currentTime >= end) return "done";
  if (currentTime >= start) return "ongoing";
  return "upcoming";
}

export function canManageEvent(
  role: MemberRole,
  userId: string,
  event: Pick<TripEvent, "createdBy" | "status">,
): EventPermissions {
  if (role === "lead") {
    return {
      canEdit: true,
      canDelete: true,
      canApprove: true,
    };
  }

  const canManageOwnPending =
    event.createdBy === userId && event.status === "pending";

  return {
    canEdit: canManageOwnPending,
    canDelete: canManageOwnPending,
    canApprove: false,
  };
}

export function calculateBalances(
  members: BalanceMember[],
  events: TripEvent[],
): MemberBalance[] {
  const balances = new Map(
    members.map((member) => [
      member.id,
      {
        memberId: member.id,
        displayName: member.displayName,
        paid: 0,
        owed: 0,
        balance: 0,
      },
    ]),
  );

  for (const event of events) {
    if (
      event.status === "pending" ||
      event.status === "cancelled" ||
      event.amount <= 0 ||
      event.participantIds.length === 0
    ) {
      continue;
    }

    const participants = [
      ...new Set(event.participantIds.filter((id) => balances.has(id))),
    ];
    if (participants.length === 0) continue;

    const payer = event.payerId ? balances.get(event.payerId) : undefined;
    if (payer) payer.paid += event.amount;

    const share = event.amount / participants.length;
    for (const memberId of participants) {
      const member = balances.get(memberId);
      if (member) member.owed += share;
    }
  }

  return [...balances.values()].map((member) => {
    const paid = roundMoney(member.paid);
    const owed = roundMoney(member.owed);
    return {
      ...member,
      paid,
      owed,
      balance: roundMoney(paid - owed),
    };
  });
}

export function reorderEvents(
  events: TripEvent[],
  eventId: string,
  direction: "up" | "down",
): TripEvent[] {
  const ordered = [...events].sort(
    (left, right) =>
      left.order - right.order ||
      Date.parse(left.startAt) - Date.parse(right.startAt),
  );
  const currentIndex = ordered.findIndex((event) => event.id === eventId);
  if (currentIndex === -1) return ordered;

  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= ordered.length) {
    return ordered.map((event, order) => ({ ...event, order }));
  }

  const next = [...ordered];
  [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
  return next.map((event, order) => ({ ...event, order }));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
