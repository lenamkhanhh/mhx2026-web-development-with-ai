import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  CreateEventInput,
  EventRecord,
  FirestoreEventCategory,
  FirestoreEventStatus,
  FirestoreMemberRole,
  MemberRecord,
} from "../../firebase/contracts";
import styles from "./EventsWorkbench.module.css";

const CATEGORY_LABELS: Record<FirestoreEventCategory, string> = {
  transport: "Transport", stay: "Stay", food: "Food & drinks", activity: "Activity", other: "Other",
};
const STATUS_LABELS: Record<FirestoreEventStatus, string> = {
  pending: "In review", approved: "Open", happening: "In progress", completed: "Done", cancelled: "Cancelled",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as FirestoreEventCategory[];
type Feedback = { kind: "saving" | "success" | "error"; message: string } | null;

export interface EventsWorkbenchProps {
  currentUserId: string;
  events: EventRecord[];
  initialSelectedEventId?: string;
  members: MemberRecord[];
  role: FirestoreMemberRole;
  onCreate: (input: CreateEventInput) => Promise<void>;
  onApprove: (eventId: string) => Promise<void>;
  onCancel: (eventId: string) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  onMove: (eventId: string, direction: "up" | "down") => Promise<void>;
  onSync: () => Promise<void>;
  onUpdate: (eventId: string, patch: Partial<CreateEventInput>) => Promise<void>;
}

export function EventsWorkbench(props: EventsWorkbenchProps) {
  const { currentUserId, events, initialSelectedEventId, members, role, onApprove, onCancel, onCreate, onDelete, onMove, onSync, onUpdate } = props;
  const [draft, setDraft] = useState({ title: "", category: "activity" as FirestoreEventCategory, startAt: "", endAt: "", participantIds: [] as string[] });
  const [composerOpen, setComposerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FirestoreEventStatus | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [optimisticState, setOptimisticState] = useState<{
    order: string[];
  } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const isLead = role === "lead";
  const optimisticOrder = optimisticState?.order ?? null;
  const timeline = useMemo(() => orderEvents(events, optimisticOrder), [events, optimisticOrder]);
  const visibleTimeline = useMemo(
    () => timeline.filter((event) => {
      const eventDate = event.startAt.slice(0, 10);
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (fromDate && eventDate < fromDate) return false;
      if (toDate && eventDate > toDate) return false;
      return true;
    }),
    [fromDate, statusFilter, timeline, toDate],
  );
  const reorderPending = optimisticOrder !== null;
  const selectedEvent = useMemo(
    () => timeline.find((item) => item.id === selectedEventId)
      ?? timeline.find((item) => item.id === initialSelectedEventId)
      ?? timeline[0]
      ?? null,
    [initialSelectedEventId, selectedEventId, timeline],
  );

  useEffect(() => {
    if (!optimisticOrder) return;
    const canonicalOrder = orderEvents(events, null).map((event) => event.id);
    // The events prop is the external realtime signal that confirms persistence.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (confirmsRequestedOrder(canonicalOrder, optimisticOrder)) setOptimisticState(null);
  }, [events, optimisticOrder]);

  function toggleParticipant(uid: string) {
    setDraft((current) => ({ ...current, participantIds: current.participantIds.includes(uid) ? current.participantIds.filter((id) => id !== uid) : [...current.participantIds, uid] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || !draft.startAt || !draft.endAt || draft.participantIds.length === 0) {
      setFeedback({ kind: "error", message: "Provide a title, time range, and at least one participant." });
      return;
    }
    const input: CreateEventInput = { title, category: draft.category, startAt: new Date(draft.startAt).toISOString(), endAt: new Date(draft.endAt).toISOString(), participantIds: draft.participantIds };
    setSaving(true);
    setFeedback({ kind: "saving", message: `Adding “${title}” to the timeline…` });
    try {
      await onCreate(input);
      setDraft({ title: "", category: "activity", startAt: "", endAt: "", participantIds: [] });
      setFeedback({ kind: "success", message: "Item sent. Waiting for the realtime update." });
    } catch (error) {
      setFeedback({ kind: "error", message: rollbackMessage(error, "Unable to save the item.") });
    } finally { setSaving(false); }
  }

  async function runAction(action: string, success: string, operation: () => Promise<void>) {
    setRunningAction(action); setFeedback(null);
    try { await operation(); setFeedback({ kind: "success", message: success }); }
    catch (error) { setFeedback({ kind: "error", message: rollbackMessage(error, "The action did not complete.") }); }
    finally { setRunningAction(null); }
  }

  async function move(eventId: string, direction: "up" | "down") {
    if (reorderPending) return;
    const nextOrder = moveEvent(timeline.map((event) => event.id), eventId, direction);
    if (!nextOrder) return;
    setMovingId(eventId);
    setOptimisticState({ order: nextOrder });
    setFeedback({ kind: "saving", message: "Updating the timeline position…" });
    try { await onMove(eventId, direction); setFeedback({ kind: "success", message: "Reorder requested. Waiting for the realtime update." }); }
    catch (error) { setOptimisticState(null); setFeedback({ kind: "error", message: rollbackMessage(error, "Unable to reorder the item.") }); }
    finally { setMovingId(null); }
  }

  return <section className={styles.workbench} data-reduced-motion={reducedMotion} data-testid="events-workbench">
    <header className={styles.header}>
      <div><p className={styles.kicker}>Trip timeline · realtime workspace</p><h2>Timeline</h2><p className={styles.intro}>Keep the trip moving together; member proposals wait for lead review.</p></div>
      <div className={styles.headerActions}>
        {isLead ? <button className={styles.syncButton} disabled={runningAction === "sync"} onClick={() => void runAction("sync", "Status sync requested.", onSync)} type="button">Sync statuses</button> : null}
        <button aria-expanded={composerOpen} className={styles.addButton} data-testid="events-add-button" onClick={() => setComposerOpen((open) => !open)} type="button">Add item</button>
      </div>
    </header>
    {feedback ? <p className={`${styles.feedback} ${styles[feedback.kind]}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    {composerOpen ? <form aria-label="Create a timeline item" className={styles.composer} onSubmit={(event) => void submit(event)}>
      <div className={styles.composerHeader}><span>+</span><div><strong>Add a trip touchpoint</strong><small>{isLead ? "New items are approved immediately" : "New items enter the review queue"}</small></div><button aria-label="Close item composer" disabled={saving} onClick={() => setComposerOpen(false)} type="button">×</button></div>
      <label>Item title<input disabled={saving} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="For example: Sunrise view" required value={draft.title} /></label>
      <label>Category<select disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as FirestoreEventCategory }))} value={draft.category}>{CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
      <label>Start<input disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, startAt: event.target.value }))} required type="datetime-local" value={draft.startAt} /></label>
      <label>End<input disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, endAt: event.target.value }))} required type="datetime-local" value={draft.endAt} /></label>
      <fieldset className={styles.participants} disabled={saving}><legend>Participants</legend>{members.map((member) => <label key={member.uid}><input checked={draft.participantIds.includes(member.uid)} disabled={saving} onChange={() => toggleParticipant(member.uid)} type="checkbox" />{member.displayName}</label>)}</fieldset>
      <button className={styles.createButton} disabled={saving} type="submit">{saving ? "Saving item…" : "Add to timeline"}</button>
    </form> : null}
    <div className={styles.timelineWorkspace}>
    <div className={styles.timelineToolbar}>
      <div className={styles.timelineHeader}><span>01</span><strong>Actionable timeline</strong><small>{visibleTimeline.length}/{timeline.length} items</small></div>
      <div className={styles.filters}>
        <label>Status<select aria-label="Filter status" onChange={(event) => setStatusFilter(event.target.value as FirestoreEventStatus | "all")} value={statusFilter}><option value="all">All statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>From<input aria-label="From date" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} /></label>
        <label>To<input aria-label="To date" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} /></label>
      </div>
    </div>
    {timeline.length === 0 ? <div className={styles.empty}><strong>Timeline is empty</strong><p>No items have been added to this trip yet.</p></div> : visibleTimeline.length === 0 ? <div className={styles.empty}><strong>No matching items</strong><p>Change the active status or date range filter.</p></div> : <ol aria-label="Trip timeline" className={styles.timeline}>{visibleTimeline.map((item) => {
      const index = timeline.findIndex((event) => event.id === item.id);
      const canDelete = isLead || (item.createdBy === currentUserId && item.status === "pending");
      const moving = movingId === item.id;
      return <li className={styles.timelineItem} data-event-id={item.id} data-motion={moving ? "reordering" : "idle"} data-testid={`event-${item.id}`} key={item.id}>
        <span aria-hidden="true" className={styles.railMarker}>{String(index + 1).padStart(2, "0")}</span>
        <article className={styles.eventCard}><div className={styles.eventContent}><span className={`${styles.status} ${styles[`status_${item.status}`]}`}>{STATUS_LABELS[item.status]}</span><h3>{item.title}</h3><p>{CATEGORY_LABELS[item.category]} · {formatDateTime(item.startAt)} — {formatDateTime(item.endAt)}</p><small>{item.participantIds.length} participants</small></div>
          <div className={styles.rightControls}>
            <div aria-label={`Actions for ${item.title}`} className={styles.actions}>
              {isLead ? <><button aria-label={`Move ${item.title} up`} disabled={index === 0 || runningAction !== null || reorderPending} onClick={() => void move(item.id, "up")} type="button">↑</button><button aria-label={`Move ${item.title} down`} disabled={index === timeline.length - 1 || runningAction !== null || reorderPending} onClick={() => void move(item.id, "down")} type="button">↓</button></> : null}
              {isLead && item.status === "pending" ? <button disabled={runningAction !== null} onClick={() => void runAction(`approve-${item.id}`, "Approval requested.", () => onApprove(item.id))} type="button">Approve</button> : null}
              {isLead && item.status !== "cancelled" ? <button disabled={runningAction !== null} onClick={() => void runAction(`cancel-${item.id}`, "Cancellation requested.", () => onCancel(item.id))} type="button">Cancel</button> : null}
              {canDelete ? <button disabled={runningAction !== null} onClick={() => void runAction(`delete-${item.id}`, "Deletion requested.", () => onDelete(item.id))} type="button">Delete</button> : null}
            </div>
            <button aria-label={`Open ${item.title} details`} className={styles.detailButton} onClick={() => setSelectedEventId(item.id)} type="button">Details</button>
          </div>
        </article>
      </li>;
    })}</ol>}
      {selectedEvent ? <EventDetailPanel
        canEdit={isLead || (selectedEvent.createdBy === currentUserId && selectedEvent.status === "pending")}
        event={selectedEvent}
        members={members}
        onUpdate={onUpdate}
      /> : null}
    </div>
  </section>;
}

interface EventDetailPanelProps {
  canEdit: boolean;
  event: EventRecord;
  members: MemberRecord[];
  onUpdate: (eventId: string, patch: Partial<CreateEventInput>) => Promise<void>;
}

function EventDetailPanel({ canEdit, event, members, onUpdate }: EventDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const participants = event.participantIds
    .map((uid) => members.find((member) => member.uid === uid)?.displayName ?? uid)
    .join(", ") || "Unassigned";

  function beginEdit() {
    setTitle(event.title);
    setFeedback(null);
    setEditing(true);
  }

  async function save(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setFeedback({ kind: "error", message: "Item title is required." });
      return;
    }
    if (nextTitle === event.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setFeedback({ kind: "saving", message: "Saving changes…" });
    try {
      await onUpdate(event.id, { title: nextTitle });
      setEditing(false);
      setFeedback({ kind: "success", message: "Changes sent. Waiting for the realtime update." });
    } catch (error) {
      setFeedback({ kind: "error", message: rollbackMessage(error, "Unable to update the item.") });
    } finally {
      setSaving(false);
    }
  }

  return <aside aria-label="Event details" className={styles.detailPanel}>
    <div className={styles.detailHeader}>
      <div><p className={styles.detailKicker}>Item details</p><h3>{event.title}</h3></div>
      <span className={`${styles.status} ${styles[`status_${event.status}`]}`}>{STATUS_LABELS[event.status]}</span>
    </div>
    <div aria-label="Item details" className={styles.detailTabs} role="tablist">
      <button aria-selected="true" role="tab" type="button">Details</button>
      <button aria-selected="false" disabled role="tab" type="button">Notes</button>
      <button aria-selected="false" disabled role="tab" type="button">Files</button>
      <button aria-selected="false" disabled role="tab" type="button">Sub-items</button>
    </div>
    <dl className={styles.detailList}>
      <div><dt>Category</dt><dd>{CATEGORY_LABELS[event.category]}</dd></div>
      <div><dt>Time</dt><dd>{formatDateTime(event.startAt)} — {formatDateTime(event.endAt)}</dd></div>
      <div><dt>Participants</dt><dd>{participants}</dd></div>
      <div><dt>Edit access</dt><dd>{canEdit ? "You can update this item." : "Only the lead or author of a pending item can edit it."}</dd></div>
    </dl>
    {feedback ? <p className={`${styles.detailFeedback} ${styles[feedback.kind]}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    {canEdit ? editing ? <form className={styles.editForm} onSubmit={(eventForm) => void save(eventForm)}>
      <label>Activity title<input aria-label="Activity title" disabled={saving} maxLength={120} onChange={(eventInput) => setTitle(eventInput.target.value)} required value={title} /></label>
      <div className={styles.detailActions}>
        <button className={styles.saveButton} disabled={saving} type="submit">{saving ? "Saving changes…" : "Save changes"}</button>
        <button disabled={saving} onClick={() => { setEditing(false); setFeedback(null); }} type="button">Cancel edit</button>
      </div>
    </form> : <button className={styles.editButton} onClick={beginEdit} type="button">Edit event</button> : null}
    <p className={styles.detailAudit}>Synced from the realtime snapshot. A change is complete only when the updated record appears in the timeline.</p>
  </aside>;
}

// Exported for deterministic reorder tests; it does not hold React state.
// eslint-disable-next-line react-refresh/only-export-components
export function moveEvent(ids: string[], eventId: string, direction: "up" | "down"): string[] | null {
  const index = ids.indexOf(eventId); const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const next = [...ids]; [next[index], next[target]] = [next[target], next[index]]; return next;
}

function orderEvents(events: EventRecord[], optimisticOrder: string[] | null): EventRecord[] {
  const sorted = [...events].sort((left, right) => left.order - right.order || Date.parse(left.startAt) - Date.parse(right.startAt) || left.id.localeCompare(right.id));
  if (!optimisticOrder) return sorted;
  const byId = new Map(sorted.map((event) => [event.id, event]));
  const optimisticEvents = optimisticOrder.map((id) => byId.get(id)).filter((item): item is EventRecord => Boolean(item));
  const optimisticIds = new Set(optimisticEvents.map((event) => event.id));
  let optimisticIndex = 0;
  return sorted.map((event) => optimisticIds.has(event.id) ? optimisticEvents[optimisticIndex++] : event);
}

function confirmsRequestedOrder(canonicalOrder: string[], requestedOrder: string[]): boolean {
  const liveIds = new Set(canonicalOrder);
  const liveRequestedOrder = requestedOrder.filter((id) => liveIds.has(id));
  const requestedIds = new Set(liveRequestedOrder);
  return sameOrder(canonicalOrder.filter((id) => requestedIds.has(id)), liveRequestedOrder);
}

function sameOrder(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function useReducedMotion(): boolean {
  const preference = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [reduced, setReduced] = useState(preference);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function rollbackMessage(error: unknown, fallback: string): string { const detail = error instanceof Error && error.message ? error.message : fallback; return `${detail} The form or timeline was rolled back so you can try again.`; }
