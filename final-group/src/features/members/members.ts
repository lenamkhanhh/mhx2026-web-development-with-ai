import type {
  AuthenticatedUser,
  FirestoreMemberRole,
  MemberRecord,
  TripBackend,
  TripRecord,
} from "../../firebase/contracts";
import { canEditResponsibility, canRemoveMember } from "./authorization";

export interface MembersFeatureOptions {
  backend: TripBackend;
  tripId: string;
  actor: AuthenticatedUser;
  /** UI affordance only; Firestore Rules authorize each mutation. */
  role: FirestoreMemberRole;
}

export interface MembersSnapshot {
  trip: TripRecord;
  members: MemberRecord[];
}

export type MemberActionErrorCode = "forbidden" | "not-found";

export class MemberActionError extends Error {
  constructor(
    public readonly code: MemberActionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MemberActionError";
  }
}

/**
 * Member UI orchestration over the typed Firebase port. Client role checks
 * only avoid presenting impossible actions; Firestore Rules remain decisive.
 */
export class MembersFeature {
  private current: MembersSnapshot | undefined;
  private readonly listeners = new Set<(snapshot: MembersSnapshot | undefined) => void>();
  private unsubscribeFromTrip: (() => void) | undefined;

  constructor(private readonly options: MembersFeatureOptions) {}

  get snapshot(): MembersSnapshot | undefined {
    return this.current && cloneSnapshot(this.current);
  }

  subscribe(listener: (snapshot: MembersSnapshot | undefined) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    this.stop();
    this.unsubscribeFromTrip = this.options.backend.subscribeTrip(
      this.options.tripId,
      (snapshot) => this.replaceSnapshot({ trip: snapshot.trip, members: snapshot.members }),
    );
  }

  stop(): void {
    this.unsubscribeFromTrip?.();
    this.unsubscribeFromTrip = undefined;
  }

  replaceSnapshot(snapshot: MembersSnapshot): void {
    this.current = cloneSnapshot(snapshot);
    this.notify();
  }

  async updateResponsibility(uid: string, responsibility: string): Promise<void> {
    if (!canEditResponsibility(this.options.actor.uid, { uid })) {
      throw new MemberActionError("forbidden", "You can update only your own responsibility.");
    }
    this.requireMember(uid);
    await this.options.backend.updateResponsibility(
      this.options.tripId,
      uid,
      responsibility,
    );
  }

  async removeMember(uid: string): Promise<void> {
    if (!canRemoveMember(this.options.actor.uid, this.options.role, { uid })) {
      throw new MemberActionError("forbidden", "Only the trip lead can remove another member.");
    }
    this.requireMember(uid);
    await this.options.backend.removeMember(this.options.tripId, uid);
  }

  private requireMember(uid: string): MemberRecord {
    const member = this.current?.members.find((candidate) => candidate.uid === uid);
    if (!member) {
      throw new MemberActionError("not-found", "That member is no longer in this trip.");
    }
    return member;
  }

  private notify(): void {
    const snapshot = this.snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

function cloneSnapshot(snapshot: MembersSnapshot): MembersSnapshot {
  return {
    trip: { ...snapshot.trip },
    members: snapshot.members.map((member) => ({ ...member })),
  };
}
