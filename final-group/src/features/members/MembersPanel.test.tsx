// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemberRecord } from "../../firebase/contracts";
import { MembersPanel } from "./MembersPanel";

const members: MemberRecord[] = [
  {
    uid: "lead-1",
    displayName: "Khanh",
    email: "lead@example.com",
    role: "lead",
    responsibility: "Coordination",
    isDemo: true,
  },
  {
    uid: "member-1",
    displayName: "Minh",
    email: "minh@example.com",
    role: "member",
    responsibility: "Photography",
    isDemo: true,
  },
];

afterEach(cleanup);

describe("MembersPanel", () => {
  it("displays a join code and saves only the current member responsibility", async () => {
    const user = userEvent.setup();
    const onUpdateResponsibility = vi.fn();
    render(
      <MembersPanel
        currentUserId="member-1"
        members={members}
        onRemoveMember={vi.fn()}
        onUpdateResponsibility={onUpdateResponsibility}
        trip={{ id: "trip-dalat", joinCode: "DALAT26" }}
      />,
    );

    expect(screen.getByText("DALAT26")).toBeTruthy();
    expect(screen.getByText("trip-dalat")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xóa thành viên" })).toBeNull();

    const leadInput = screen.getByRole("textbox", {
      name: "Trách nhiệm của Khanh",
    }) as HTMLInputElement;
    expect(leadInput.disabled).toBe(true);

    const memberInput = screen.getByRole("textbox", {
      name: "Trách nhiệm của Minh",
    });
    await user.clear(memberInput);
    await user.type(memberInput, "Video");
    await user.click(screen.getByRole("button", { name: "Lưu trách nhiệm" }));

    expect(onUpdateResponsibility).toHaveBeenCalledWith("member-1", "Video");
  });

  it("renders removal only for a lead targeting another member", async () => {
    const user = userEvent.setup();
    const onRemoveMember = vi.fn();
    render(
      <MembersPanel
        currentUserId="lead-1"
        members={members}
        onRemoveMember={onRemoveMember}
        onUpdateResponsibility={vi.fn()}
        trip={{ id: "trip-dalat", joinCode: "DALAT26" }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Xóa Khanh khỏi chuyến đi" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Xóa Minh khỏi chuyến đi" }),
    );

    expect(onRemoveMember).toHaveBeenCalledWith("member-1");
  });
});
