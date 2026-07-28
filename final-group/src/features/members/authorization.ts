import type { FirestoreMemberRole, MemberRecord } from "../../firebase/contracts";

export function canEditResponsibility(
  actorId: string,
  member: Pick<MemberRecord, "uid">,
): boolean {
  return actorId === member.uid;
}

export function canRemoveMember(
  actorId: string,
  actorRole: FirestoreMemberRole | undefined,
  target: Pick<MemberRecord, "uid">,
): boolean {
  return actorRole === "lead" && actorId !== target.uid;
}
