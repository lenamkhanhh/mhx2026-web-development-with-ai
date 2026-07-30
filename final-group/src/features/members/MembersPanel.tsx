import { useState } from "react";
import type {
  ExpenseRecord,
  MemberRecord,
  TripRecord,
} from "../../firebase/contracts";
import { formatVnd } from "../expenses/expense-calculations";
import { canEditResponsibility, canRemoveMember } from "./authorization";
import "./MembersPanel.css";

export type MembersPanelState = "ready" | "loading" | "error";

export interface MembersPanelProps {
  trip: Pick<TripRecord, "id" | "joinCode">;
  members: MemberRecord[];
  expenses?: ExpenseRecord[];
  currentUserId: string;
  state?: MembersPanelState;
  errorMessage?: string;
  onUpdateResponsibility: (memberId: string, responsibility: string) => void | Promise<void>;
  onRemoveMember: (memberId: string) => void | Promise<void>;
}

type Feedback = "idle" | "saving" | "saved" | "error";

export function MembersPanel({
  trip,
  members,
  expenses = [],
  currentUserId,
  state = "ready",
  errorMessage,
  onUpdateResponsibility,
  onRemoveMember,
}: MembersPanelProps) {
  const currentMember = members.find((member) => member.uid === currentUserId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyStateCode, setCopyStateCode] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<MemberRecord | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | MemberRecord["role"]>("all");
  const displayedCopyState =
    copyStateCode === trip.joinCode ? copyState : "idle";
  const normalizedQuery = memberQuery.trim().toLocaleLowerCase("vi");
  const visibleMembers = members.filter((member) => {
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      member.displayName.toLocaleLowerCase("vi").includes(normalizedQuery) ||
      member.email.toLocaleLowerCase("vi").includes(normalizedQuery) ||
      member.responsibility.toLocaleLowerCase("vi").includes(normalizedQuery);
    return matchesRole && matchesQuery;
  });
  const recentExpenses = expenses.slice(-4).reverse();

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
    <section aria-labelledby="members-heading" className="members-panel">
      <header className="members-panel__header">
        <div>
          <p className="members-panel__eyebrow">TripFlow / nhóm đồng hành</p>
          <h2 id="members-heading">Thành viên</h2>
          <p>Phân vai rõ ràng, cập nhật trách nhiệm của bạn và giữ nhóm đồng bộ.</p>
        </div>
        <aside aria-label="Thông tin gia nhập" className="members-panel__join-card">
          <span>Trip ID</span><strong>{trip.id}</strong>
          <span>Mã gia nhập</span><code>{trip.joinCode}</code>
          <p className="members-panel__verification" data-state="required" data-testid="join-code-verification">Server verification required — mã này chưa tự chứng minh quyền tham gia.</p>
          <button aria-label="Sao chép mã gia nhập" className="members-panel__copy" onClick={() => void copyJoinCode()} type="button">Sao chép mã</button>
           <p data-state={displayedCopyState} data-testid="join-code-status" role="status">
             {displayedCopyState === "copied" ? "Đã sao chép mã tham gia" : displayedCopyState === "error" ? "Không thể sao chép mã" : "Chỉ chia sẻ với người bạn tin cậy"}
          </p>
        </aside>
      </header>

      <div className="members-panel__toolbar">
        <label>
          <span>Tìm trong nhóm</span>
          <input
            aria-label="Tìm thành viên"
            onChange={(event) => setMemberQuery(event.target.value)}
            placeholder="Tên, email hoặc trách nhiệm…"
            type="search"
            value={memberQuery}
          />
        </label>
        <label>
          <span>Vai trò</span>
          <select
            aria-label="Lọc vai trò"
            onChange={(event) =>
              setRoleFilter(event.target.value as "all" | MemberRecord["role"])
            }
            value={roleFilter}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="lead">Trưởng nhóm (Lead)</option>
            <option value="member">Thành viên</option>
          </select>
        </label>
        <strong>{visibleMembers.length} / {members.length} thành viên</strong>
      </div>

      {state === "loading" ? <div className="members-panel__state" data-state="loading" data-testid="members-state" role="status">Đang tải thành viên…</div> : null}
      {state === "error" ? <div className="members-panel__state members-panel__state--error" data-state="error" data-testid="members-state" role="alert">{errorMessage || "Không thể tải nhóm. Hãy thử lại."}</div> : null}
      {state === "ready" && members.length === 0 ? <div className="members-panel__state" data-state="empty" data-testid="members-state">Chưa có thành viên nào khác trong chuyến đi.</div> : null}

      {state === "ready" && members.length > 0 ? <div className="members-panel__table-wrap" role="region" aria-label="Danh sách thành viên">
        <div className="members-panel__table-head" aria-hidden="true"><span>Thành viên</span><span>Trách nhiệm</span><span>Thao tác</span></div>
        <ul aria-label="Danh sách thành viên" className="members-panel__list">
        {visibleMembers.map((member) => {
          const mayEdit = canEditResponsibility(currentUserId, member);
          const mayRemove = canRemoveMember(currentUserId, currentMember?.role, member);
          const draft = drafts[member.uid] ?? member.responsibility;
          const memberFeedback = feedback[member.uid] ?? "idle";
          return <li key={member.uid} className="members-panel__card">
            <div className="members-panel__identity">
              <span aria-hidden="true" className="members-panel__avatar">{member.displayName.slice(0, 1).toUpperCase()}</span>
              <div><h3>{member.displayName}</h3><p>{member.email}</p></div>
              <span className={`members-panel__role members-panel__role--${member.role}`}>{member.role === "lead" ? "Lead" : "Thành viên"}</span>
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
        {visibleMembers.length === 0 ? (
          <li className="members-panel__filtered-empty">
            Không có thành viên phù hợp bộ lọc.
          </li>
        ) : null}
        </ul>
      </div> : null}

      <aside aria-label="Ngữ cảnh thành viên" className="members-panel__context">
        <div>
          <span className="members-panel__eyebrow">Workspace context</span>
          <h3>Ngữ cảnh thành viên</h3>
          <p>Dữ liệu thật đang có trong chuyến đi, không tạo activity giả.</p>
        </div>
        <dl className="members-panel__context-metrics">
          <div><dt>Tổng thành viên</dt><dd>{members.length}</dd></div>
          <div><dt>Số Lead</dt><dd>{members.filter((member) => member.role === "lead").length}</dd></div>
        </dl>
        <section>
          <div className="members-panel__context-heading">
            <span>Khoản chi gần đây</span>
            <b>{recentExpenses.length}</b>
          </div>
          {recentExpenses.length > 0 ? (
            <ul>
              {recentExpenses.map((expense) => (
                <li key={expense.id}>
                  <div>
                    <strong>{expense.title}</strong>
                    <span>
                      {expense.status === "settled" ? "Đã chốt" : "Chờ chốt"} ·{" "}
                      {members.find((member) => member.uid === expense.paidBy)?.displayName ??
                        expense.paidBy}
                    </span>
                  </div>
                  <b>{formatVnd(expense.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa có khoản chi để hiển thị.</p>
          )}
        </section>
      </aside>

      {state === "ready" && members.length > 0 ? <PermissionMatrix /> : null}

      {pendingRemoval ? <div aria-label="Xác nhận xóa thành viên" aria-modal="true" className="members-panel__dialog-backdrop" role="dialog"><section className="members-panel__dialog"><h3>Xóa {pendingRemoval.displayName} khỏi chuyến đi?</h3><p>Người này sẽ mất quyền truy cập vào lịch trình và chi phí của chuyến đi.</p><div><button disabled={Boolean(removingMemberId)} onClick={() => setPendingRemoval(null)} type="button">Hủy</button><button aria-label="Xác nhận xóa" className="members-panel__remove" disabled={Boolean(removingMemberId)} onClick={() => void confirmRemoval()} type="button">Xác nhận xóa</button></div></section></div> : null}
    </section>
  );
}

function PermissionMatrix() {
  const rows = [
    ["Duyệt / hủy activity", "Lead only", "Không cho phép"],
    ["Sắp xếp timeline", "Trưởng nhóm", "Không cho phép"],
    ["Chốt khoản chi", "Trưởng nhóm", "Không cho phép"],
    ["Sửa trách nhiệm cá nhân", "Bản thân", "Bản thân"],
    ["Sửa / xoá khoản chi", "Mọi khoản", "Khoản do mình tạo"],
  ] as const;

  return <section className="members-panel__permissions">
    <div className="members-panel__permissions-heading"><div><span className="members-panel__eyebrow">Quyền thao tác</span><h3>Ma trận quyền trong workspace</h3></div><p>Firebase Security Rules là lớp quyết định cuối cùng; bảng này chỉ mô tả luồng giao diện.</p></div>
    <div aria-label="Permission matrix" className="members-panel__permission-table" role="table">
      <div className="members-panel__permission-row members-panel__permission-row--head" role="row"><span role="columnheader">Hành động</span><span role="columnheader">Trưởng nhóm</span><span role="columnheader">Member</span></div>
      {rows.map(([action, lead, member]) => <div className="members-panel__permission-row" key={action} role="row"><span role="cell">{action}</span><span role="cell">{lead}</span><span role="cell">{member}</span></div>)}
    </div>
  </section>;
}
