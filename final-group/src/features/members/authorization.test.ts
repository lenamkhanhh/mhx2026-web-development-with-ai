import { describe, expect, it } from "vitest";
import type { MemberRecord } from "../../firebase/contracts";
import { canEditResponsibility, canRemoveMember } from "./authorization";

const lead: MemberRecord = {
  uid: "lead-1",
  displayName: "Lead",
  email: "lead@example.com",
  role: "lead",
  responsibility: "Coordination",
  isDemo: true,
};

const member: MemberRecord = {
  uid: "member-1",
  displayName: "Member",
  email: "member@example.com",
  role: "member",
  responsibility: "Photography",
  isDemo: true,
};

describe("member authorization", () => {
  it("only permits a member to edit their own responsibility", () => {
    expect(canEditResponsibility(member.uid, member)).toBe(true);
    expect(canEditResponsibility(lead.uid, member)).toBe(false);
  });

  it("permits only the lead to remove another non-lead member", () => {
    expect(canRemoveMember(lead.uid, lead.role, member)).toBe(true);
    expect(canRemoveMember(member.uid, member.role, lead)).toBe(false);
    expect(canRemoveMember(lead.uid, lead.role, lead)).toBe(false);
  });
});
