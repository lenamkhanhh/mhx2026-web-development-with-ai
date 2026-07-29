// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemberRecord } from "../../firebase/contracts";
import { MembersPanel } from "./MembersPanel";

const members: MemberRecord[] = [
  { uid: "lead-1", displayName: "Khanh", email: "lead@example.com", role: "lead", responsibility: "Coordination", isDemo: true },
  { uid: "member-1", displayName: "Minh", email: "member@example.com", role: "member", responsibility: "Photography", isDemo: true },
];

afterEach(cleanup);

describe("MembersPanel", () => {
  it("renders roles, join code, and keeps another member responsibility locked", () => {
    render(<MembersPanel currentUserId="member-1" members={members} onRemoveMember={vi.fn()} onUpdateResponsibility={vi.fn()} trip={{ id: "trip-1", joinCode: "DALAT26" }} />);
    expect(screen.getByText("DALAT26")).toBeTruthy();
    expect(screen.getByText("Lead")).toBeTruthy();
    expect(screen.getByText("Member")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: /Khanh/ }) as HTMLInputElement).disabled).toBe(true);
  });

  it("requires lead confirmation before removing another member", async () => {
    const user = userEvent.setup();
    const onRemoveMember = vi.fn();
    render(<MembersPanel currentUserId="lead-1" members={members} onRemoveMember={onRemoveMember} onUpdateResponsibility={vi.fn()} trip={{ id: "trip-1", joinCode: "DALAT26" }} />);
    await user.click(screen.getByRole("button", { name: /Minh/ }));
    expect(onRemoveMember).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    expect(onRemoveMember).toHaveBeenCalledWith("member-1");
  });
});