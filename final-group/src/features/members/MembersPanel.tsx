import { useState } from "react";
import type { MemberRecord, TripRecord } from "../../firebase/contracts";
import { canEditResponsibility, canRemoveMember } from "./authorization";
import "./MembersPanel.css";

export type MembersPanelState = "ready" | "loading" | "error";

export interface MembersPanelProps {
  trip: Pick<TripRecord, "id" | "joinCode">;
  members: MemberRecord[];
  currentUserId: string;
  state?: MembersPanelState;
  errorMessage?: string;
  onUpdateResponsibility: (memberId: string, responsibility: string) => void | Promise<void>;
  onRemoveMember: (memberId: string) => void | Promise<void>;
}

type Feedback = "idle" | "saving" | "saved" | "error";

export function MembersPanel({ trip, members, currentUserId, state = "ready", errorMessage, onUpdateResponsibility, onRemoveMember }: MembersPanelProps) {
  const currentMember = members.find((member) => member.uid === currentUserId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyStateCode, setCopyStateCode] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<MemberRecord | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const displayedCopyState =
    copyStateCode === trip.joinCode ? copyState : "idle";

  const updateResponsibility = async (member: MemberRecord) => {
    if (!canEditResponsibility(currentUserId, member)) return;
    const responsibility = (drafts[member.uid] ?? member.responsibility).trim();
    if (responsibility === member.responsibility) return;
    setFeedback((value) => ({ ...value, [member.uid]: "saving" }));
    try {
      await onUpdateResponsibility(member.uid, responsibility);
      setFeedback((value) => ({ ...value, [member.uid]: "saved" }));
    } catch {
      setFeedback((value) => ({ ...value, [member.uid]: "error" }));
    }
  };

  const copyJoinCode = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(trip.joinCode);
      setCopyStateCode(trip.joinCode);
      setCopyState("copied");
    } catch {
      setCopyStateCode(trip.joinCode);
      setCopyState("error");
    }
  };

  const confirmRemoval = async () => {
    if (
      !pendingRemoval ||
      removingMemberId ||
      !canRemoveMember(currentUserId, currentMember?.role, pendingRemoval)
    ) return;
    const member = pendingRemoval;
    setRemovingMemberId(member.uid);
    setFeedback((value) => ({ ...value, [member.uid]: "saving" }));
    try {
      await onRemoveMember(member.uid);
      setPendingRemoval(null);
    } catch {
      setFeedback((value) => ({ ...value, [member.uid]: "error" }));
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <section aria-labelledby="members-heading" className="members-panel" data-reduced-motion="true">
      <header className="members-panel__header">
        <div>
          <p className="members-panel__eyebrow">TripFlow / crew workbench</p>
          <h2 id="members-heading">Thành viên</h2>
          <p>Phân vai rõ ràng, cập nhật trách nhiệm của bạn và giữ nhóm đồng bộ.</p>
        </div>
        <aside aria-label="Thông tin gia nhập" className="members-panel__join-card">
          <span>Trip ID</span><strong>{trip.id}</strong>
          <span>Mã gia nhập</span><code>{trip.joinCode}</code>
          <button aria-label="Copy join code" className="members-panel__copy" onClick={() => void copyJoinCode()} type="button">Sao chép mã</button>
           <p data-state={displayedCopyState} data-testid="join-code-status" role="status">
             {displayedCopyState === "copied" ? "Đã sao chép mã tham gia" : displayedCopyState === "error" ? "Không thể sao chép mã" : "Chỉ chia sẻ với người bạn tin cậy"}
          </p>
        </aside>
      </header>

      {state === "loading" ? <div className="members-panel__state" data-state="loading" data-testid="members-state" role="status">Đang tải thành viên…</div> : null}
      {state === "error" ? <div className="members-panel__state members-panel__state--error" data-state="error" data-testid="members-state" role="alert">{errorMessage || "Không thể tải nhóm. Hãy thử lại."}</div> : null}
      {state === "ready" && members.length === 0 ? <div className="members-panel__state" data-state="empty" data-testid="members-state">Chưa có thành viên nào khác trong chuyến đi.</div> : null}

      {state === "ready" && members.length > 0 ? <ul aria-label="Danh sách thành viên" className="members-panel__list">
        {members.map((member) => {
          const mayEdit = canEditResponsibility(currentUserId, member);
          const mayRemove = canRemoveMember(currentUserId, currentMember?.role, member);
          const draft = drafts[member.uid] ?? member.responsibility;
          const memberFeedback = feedback[member.uid] ?? "idle";
          return <li key={member.uid} className="members-panel__card">
            <div className="members-panel__identity">
              <span aria-hidden="true" className="members-panel__avatar">{member.displayName.slice(0, 1).toUpperCase()}</span>
              <div><h3>{member.displayName}</h3><p>{member.email}</p></div>
              <span className={`members-panel__role members-panel__role--${member.role}`}>{member.role === "lead" ? "Lead" : "Member"}</span>
            </div>
            <label className="members-panel__responsibility">Trách nhiệm
              <input aria-label={`Trách nhiệm của ${member.displayName}`} disabled={!mayEdit || memberFeedback === "saving"} onChange={(event) => setDrafts((value) => ({ ...value, [member.uid]: event.target.value }))} value={draft} />
            </label>
            <div className="members-panel__actions">
              {mayEdit ? <button disabled={memberFeedback === "saving" || draft.trim() === member.responsibility} onClick={() => void updateResponsibility(member)} type="button">Lưu trách nhiệm</button> : <span className="members-panel__locked">Chỉ thành viên này có thể sửa</span>}
              {mayRemove ? <button aria-label={`Xóa ${member.displayName} khỏi chuyến đi`} className="members-panel__remove" disabled={memberFeedback === "saving"} onClick={() => setPendingRemoval(member)} type="button">Gỡ khỏi nhóm</button> : null}
            </div>
            {memberFeedback !== "idle" ? <p className="members-panel__feedback" data-state={memberFeedback} data-testid={`responsibility-status-${member.uid}`} role="status">{memberFeedback === "saving" ? "Đang lưu trách nhiệm…" : memberFeedback === "saved" ? "Đã lưu trách nhiệm" : "Không thể lưu trách nhiệm. Thử lại nhé."}</p> : null}
          </li>;
        })}
      </ul> : null}

      {pendingRemoval ? <div aria-label="Confirm member removal" aria-modal="true" className="members-panel__dialog-backdrop" role="dialog"><section className="members-panel__dialog"><h3>Xóa {pendingRemoval.displayName} khỏi chuyến đi?</h3><p>Người này sẽ mất quyền truy cập vào lịch trình và chi phí của chuyến đi.</p><div><button disabled={Boolean(removingMemberId)} onClick={() => setPendingRemoval(null)} type="button">Hủy</button><button aria-label="Confirm removal" className="members-panel__remove" disabled={Boolean(removingMemberId)} onClick={() => void confirmRemoval()} type="button">Xác nhận xóa</button></div></section></div> : null}
    </section>
  );
}
