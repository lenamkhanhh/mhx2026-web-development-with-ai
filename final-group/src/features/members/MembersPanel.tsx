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
          <p className="members-panel__eyebrow">TripFlow / shared workspace</p>
          <h2 id="members-heading">Members</h2>
          <p>Clarify ownership, update your responsibility, and keep the group aligned.</p>
        </div>
        <aside aria-label="Join information" className="members-panel__join-card">
          <span>Trip ID</span><strong>{trip.id}</strong>
          <span>Join code</span><code>{trip.joinCode}</code>
          <p className="members-panel__verification" data-state="required" data-testid="join-code-verification">Server verification required — this code does not prove membership by itself.</p>
          <button aria-label="Copy join code" className="members-panel__copy" onClick={() => void copyJoinCode()} type="button">Copy code</button>
           <p data-state={displayedCopyState} data-testid="join-code-status" role="status">
             {displayedCopyState === "copied" ? "Join code copied" : displayedCopyState === "error" ? "Unable to copy the code" : "Only share with people you trust"}
          </p>
        </aside>
      </header>

      <div className="members-panel__toolbar">
        <label>
          <span>Search members</span>
          <input
            aria-label="Search members"
            onChange={(event) => setMemberQuery(event.target.value)}
            placeholder="Name, email, or responsibility…"
            type="search"
            value={memberQuery}
          />
        </label>
        <label>
          <span>Role</span>
          <select
            aria-label="Filter role"
            onChange={(event) =>
              setRoleFilter(event.target.value as "all" | MemberRecord["role"])
            }
            value={roleFilter}
          >
            <option value="all">All roles</option>
            <option value="lead">Trip lead</option>
            <option value="member">Member</option>
          </select>
        </label>
        <strong>{visibleMembers.length} / {members.length} members</strong>
      </div>

      {state === "loading" ? <div className="members-panel__state" data-state="loading" data-testid="members-state" role="status">Loading members…</div> : null}
      {state === "error" ? <div className="members-panel__state members-panel__state--error" data-state="error" data-testid="members-state" role="alert">{errorMessage || "Unable to load members. Try again."}</div> : null}
      {state === "ready" && members.length === 0 ? <div className="members-panel__state" data-state="empty" data-testid="members-state">No other members are in this trip yet.</div> : null}

      {state === "ready" && members.length > 0 ? <div className="members-panel__table-wrap" role="region" aria-label="Member list">
        <div className="members-panel__table-head" aria-hidden="true"><span>Member</span><span>Responsibility</span><span>Actions</span></div>
        <ul aria-label="Member list" className="members-panel__list">
        {visibleMembers.map((member) => {
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
            <label className="members-panel__responsibility">Responsibility
              <input aria-label={`${member.displayName}'s responsibility`} disabled={!mayEdit || memberFeedback === "saving"} onChange={(event) => setDrafts((value) => ({ ...value, [member.uid]: event.target.value }))} value={draft} />
            </label>
            <div className="members-panel__actions">
              {mayEdit ? <button disabled={memberFeedback === "saving" || draft.trim() === member.responsibility} onClick={() => void updateResponsibility(member)} type="button">Save responsibility</button> : <span className="members-panel__locked">Only this member can edit it</span>}
              {mayRemove ? <button aria-label={`Remove ${member.displayName} from this trip`} className="members-panel__remove" disabled={memberFeedback === "saving"} onClick={() => setPendingRemoval(member)} type="button">Remove from trip</button> : null}
            </div>
            {memberFeedback !== "idle" ? <p className="members-panel__feedback" data-state={memberFeedback} data-testid={`responsibility-status-${member.uid}`} role="status">{memberFeedback === "saving" ? "Saving responsibility…" : memberFeedback === "saved" ? "Responsibility saved" : "Unable to save responsibility. Try again."}</p> : null}
          </li>;
        })}
        {visibleMembers.length === 0 ? (
          <li className="members-panel__filtered-empty">
            No members match this filter.
          </li>
        ) : null}
        </ul>
      </div> : null}

      <aside aria-label="Member context" className="members-panel__context">
        <div>
          <span className="members-panel__eyebrow">Workspace context</span>
          <h3>Member context</h3>
          <p>Only real records in this trip are shown; no fabricated activity is added.</p>
        </div>
        <dl className="members-panel__context-metrics">
          <div><dt>Total members</dt><dd>{members.length}</dd></div>
          <div><dt>Leads</dt><dd>{members.filter((member) => member.role === "lead").length}</dd></div>
        </dl>
        <section>
          <div className="members-panel__context-heading">
            <span>Recent expenses</span>
            <b>{recentExpenses.length}</b>
          </div>
          {recentExpenses.length > 0 ? (
            <ul>
              {recentExpenses.map((expense) => (
                <li key={expense.id}>
                  <div>
                    <strong>{expense.title}</strong>
                    <span>
                      {expense.status === "settled" ? "Settled" : "Pending"} ·{" "}
                      {members.find((member) => member.uid === expense.paidBy)?.displayName ??
                        expense.paidBy}
                    </span>
                  </div>
                  <b>{formatVnd(expense.amount)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p>No expenses to display yet.</p>
          )}
        </section>
      </aside>

      {state === "ready" && members.length > 0 ? <PermissionMatrix /> : null}

      {pendingRemoval ? <div aria-label="Confirm member removal" aria-modal="true" className="members-panel__dialog-backdrop" role="dialog"><section className="members-panel__dialog"><h3>Remove {pendingRemoval.displayName} from this trip?</h3><p>They will lose access to this trip’s timeline and expenses.</p><div><button disabled={Boolean(removingMemberId)} onClick={() => setPendingRemoval(null)} type="button">Cancel</button><button aria-label="Confirm removal" className="members-panel__remove" disabled={Boolean(removingMemberId)} onClick={() => void confirmRemoval()} type="button">Confirm removal</button></div></section></div> : null}
    </section>
  );
}

function PermissionMatrix() {
  const rows = [
    ["Approve / cancel items", "Lead only", "Not allowed"],
    ["Reorder timeline", "Lead", "Not allowed"],
    ["Settle expenses", "Lead", "Not allowed"],
    ["Edit own responsibility", "Self", "Self"],
    ["Edit / delete expenses", "All expenses", "Expenses you created"],
  ] as const;

  return <section className="members-panel__permissions">
    <div className="members-panel__permissions-heading"><div><span className="members-panel__eyebrow">Permissions</span><h3>Workspace permission matrix</h3></div><p>Firebase Security Rules are the final authority; this table only describes the UI workflow.</p></div>
    <div aria-label="Permission matrix" className="members-panel__permission-table" role="table">
      <div className="members-panel__permission-row members-panel__permission-row--head" role="row"><span role="columnheader">Action</span><span role="columnheader">Lead</span><span role="columnheader">Member</span></div>
      {rows.map(([action, lead, member]) => <div className="members-panel__permission-row" key={action} role="row"><span role="cell">{action}</span><span role="cell">{lead}</span><span role="cell">{member}</span></div>)}
    </div>
  </section>;
}
