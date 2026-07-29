// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MemberRecord } from "../../firebase/contracts";
import { MembersPanel, type MembersPanelProps } from "./MembersPanel";

const members: MemberRecord[] = [
  { uid: "lead-1", displayName: "Khanh", email: "lead@example.com", role: "lead", responsibility: "Coordination", isDemo: true },
  { uid: "member-1", displayName: "Minh", email: "minh@example.com", role: "member", responsibility: "Photography", isDemo: true },
];

function panel(overrides: Partial<MembersPanelProps> = {}) {
  return <MembersPanel currentUserId="lead-1" members={members} onRemoveMember={vi.fn()} onUpdateResponsibility={vi.fn()} trip={{ id: "trip-dalat", joinCode: "DALAT26" }} {...overrides} />;
}

afterEach(cleanup);

describe("MembersPanel workbench", () => {
  it("copies the displayed join code and reports success", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(panel());
    await user.click(screen.getByRole("button", { name: "Copy join code" }));
    expect(writeText).toHaveBeenCalledWith("DALAT26");
    expect((screen.getByTestId("join-code-status") as HTMLElement).dataset.state).toBe("copied");
  });

  it("waits for a lead confirmation before removing a member", async () => {
    const user = userEvent.setup();
    const onRemoveMember = vi.fn();
    render(panel({ onRemoveMember }));
    await user.click(screen.getByRole("button", { name: /Minh/ }));
    expect(onRemoveMember).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Confirm member removal" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));
    expect(onRemoveMember).toHaveBeenCalledWith("member-1");
  });

  it("shows saving, saved, and error feedback for an inline responsibility edit", async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const onUpdateResponsibility = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    render(panel({ currentUserId: "member-1", onUpdateResponsibility }));
    const input = screen.getByRole("textbox", { name: /Minh/ });
    await user.clear(input);
    await user.type(input, "Video");
    await user.click(screen.getByRole("button", { name: /L.u tr.ch nhi.m/ }));
    expect((screen.getByTestId("responsibility-status-member-1") as HTMLElement).dataset.state).toBe("saving");
    resolveSave?.();
    expect((await screen.findByTestId("responsibility-status-member-1") as HTMLElement).dataset.state).toBe("saved");
    cleanup();
    render(panel({ currentUserId: "member-1", onUpdateResponsibility: vi.fn().mockRejectedValue(new Error("offline")) }));
    const retryInput = screen.getByRole("textbox", { name: /Minh/ });
    await user.clear(retryInput);
    await user.type(retryInput, "Retry");
    await user.click(screen.getByRole("button", { name: /L.u tr.ch nhi.m/ }));
    expect((await screen.findByTestId("responsibility-status-member-1") as HTMLElement).dataset.state).toBe("error");
  });

  it("renders loading, empty, and recoverable error states", () => {
    const { rerender } = render(panel({ state: "loading" } as Partial<MembersPanelProps>));
    expect((screen.getByTestId("members-state") as HTMLElement).dataset.state).toBe("loading");
    rerender(panel({ members: [], state: "ready" } as Partial<MembersPanelProps>));
    expect((screen.getByTestId("members-state") as HTMLElement).dataset.state).toBe("empty");
    rerender(panel({ members: [], state: "error", errorMessage: "load failed" } as Partial<MembersPanelProps>));
    expect((screen.getByTestId("members-state") as HTMLElement).dataset.state).toBe("error");
  });
});