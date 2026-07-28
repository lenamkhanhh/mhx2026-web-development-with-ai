import type {
  EventCategory,
  EventStatus,
  MemberRole,
  TripEvent,
} from "./domain";

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  leadId: string;
  joinCode: string;
}

export interface TripMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  responsibility: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  tripIds: string[];
}

export interface EventDraft {
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
}

export type DashboardView =
  | "overview"
  | "schedule"
  | "expenses"
  | "members";

export interface TripSnapshot {
  trip: Trip;
  members: TripMember[];
  events: TripEvent[];
}
