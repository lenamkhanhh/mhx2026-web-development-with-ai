import { AirplaneTilt, Bed, ForkKnife, MapPinLine, SquaresFour } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import type {
  CreateEventInput,
  EventNote,
  EventRecord,
  EventSubitem,
  FirestoreEventCategory,
  FirestoreEventPriority,
  FirestoreEventStatus,
  FirestoreMemberRole,
  MemberRecord,
  TripActivity,
  UpdateEventInput,
} from "../../firebase/contracts";
import styles from "./EventsWorkbench.module.css";

const CATEGORY_LABELS: Record<FirestoreEventCategory, string> = {
  transport: "Transport", stay: "Stay", food: "Food & drinks", activity: "Activity", other: "Other",
};
const CATEGORY_ICONS: Record<FirestoreEventCategory, ComponentType<{ "aria-hidden"?: boolean; size?: number }>> = {
  transport: AirplaneTilt,
  stay: Bed,
  food: ForkKnife,
  activity: MapPinLine,
  other: SquaresFour,
};
const STATUS_LABELS: Record<FirestoreEventStatus, string> = {
  pending: "In review", approved: "Open", happening: "In progress", completed: "Done", cancelled: "Cancelled", paused: "Paused",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as FirestoreEventCategory[];
const PRIORITIES: Array<FirestoreEventPriority> = ["low", "medium", "high"];
type Feedback = { kind: "saving" | "success" | "error"; message: string } | null;

export interface EventsWorkbenchProps {
  currentUserId: string;
  events: EventRecord[];
  initialSelectedEventId?: string;
  members: MemberRecord[];
  role: FirestoreMemberRole;
  onCreate: (input: CreateEventInput) => Promise<void>;
  onApprove: (eventId: string) => Promise<void>;
  onPause: (eventId: string) => Promise<void>;
  onResume: (eventId: string) => Promise<void>;
  onComplete: (eventId: string) => Promise<void>;
  onCancel: (eventId: string) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  onMove: (eventId: string, direction: "up" | "down") => Promise<void>;
  onSync: () => Promise<void>;
  onUpdate: (eventId: string, patch: UpdateEventInput) => Promise<void>;
  notes: EventNote[];
  subitems: EventSubitem[];
  activity?: TripActivity[];
  onCreateNote: (eventId: string, body: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onCreateSubitem: (eventId: string, title: string) => Promise<void>;
  onToggleSubitem: (subitemId: string, completed: boolean) => Promise<void>;
  onDeleteSubitem: (subitemId: string) => Promise<void>;
}

export function EventsWorkbench(props: EventsWorkbenchProps) {
  const { currentUserId, events, initialSelectedEventId, members, role, onApprove, onPause, onResume, onComplete, onCancel, onCreate, onDelete, onMove, onSync, onUpdate, notes, subitems, activity = [], onCreateNote, onDeleteNote, onCreateSubitem, onToggleSubitem, onDeleteSubitem } = props;
  const [draft, setDraft] = useState({ title: "", description: "", category: "activity" as FirestoreEventCategory, startAt: "", endAt: "", participantIds: [] as string[], location: "", assigneeUid: "", priority: "" as FirestoreEventPriority | "" });
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
  const [actionMenuEventId, setActionMenuEventId] = useState<string | null>(null);
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
    const description = draft.description.trim();
    if (!title || !description || !draft.startAt || !draft.endAt || draft.participantIds.length === 0) {
      setFeedback({ kind: "error", message: "Provide a title, description, time range, and at least one participant." });
      return;
    }
    const input: CreateEventInput = {
      title,
      description,
      category: draft.category,
      startAt: new Date(draft.startAt).toISOString(),
      endAt: new Date(draft.endAt).toISOString(),
      participantIds: draft.participantIds,
      ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
      ...(draft.assigneeUid ? { assigneeUid: draft.assigneeUid } : {}),
      ...(draft.priority ? { priority: draft.priority } : {}),
    };
    setSaving(true);
    setFeedback({ kind: "saving", message: `Adding “${title}” to the timeline…` });
    try {
      await onCreate(input);
      setDraft({ title: "", description: "", category: "activity", startAt: "", endAt: "", participantIds: [], location: "", assigneeUid: "", priority: "" });
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
      <label>Description<textarea disabled={saving} maxLength={1000} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What should the team know or prepare?" required value={draft.description} /></label>
      <label>Category<select disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as FirestoreEventCategory }))} value={draft.category}>{CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
      <label>Start<input disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, startAt: event.target.value }))} required type="datetime-local" value={draft.startAt} /></label>
      <label>End<input disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, endAt: event.target.value }))} required type="datetime-local" value={draft.endAt} /></label>
      <label>Location<input disabled={saving} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Optional place or address" value={draft.location} /></label>
      <label>Assignee<select disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, assigneeUid: event.target.value }))} value={draft.assigneeUid}><option value="">Unassigned</option>{members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}</select></label>
      <label>Priority<select disabled={saving} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as FirestoreEventPriority | "" }))} value={draft.priority}><option value="">Not set</option>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
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
    {timeline.length === 0 ? <div className={styles.empty}><strong>Timeline is empty</strong><p>No items have been added to this trip yet.</p></div> : visibleTimeline.length === 0 ? <div className={styles.empty}><strong>No matching items</strong><p>Change the active status or date range filter.</p></div> : <ol aria-label="Trip timeline" className={styles.timeline}>{visibleTimeline.map((item, itemIndex) => {
      const index = timeline.findIndex((event) => event.id === item.id);
      const canDelete = isLead || (item.createdBy === currentUserId && item.status === "pending");
      const moving = movingId === item.id;
      const actionMenuOpen = actionMenuEventId === item.id;
      const assignee = item.assigneeUid ? members.find((member) => member.uid === item.assigneeUid) : undefined;
      const isSelected = selectedEvent?.id === item.id;
      const previousItem = visibleTimeline[itemIndex - 1];
      const showDayHeading = !previousItem || previousItem.startAt.slice(0, 10) !== item.startAt.slice(0, 10);
      const itemNotes = notes.filter((note) => note.eventId === item.id);
      const CategoryIcon = CATEGORY_ICONS[item.category];
      return <li className={`${styles.timelineItem} ${isSelected ? styles.timelineItemSelected : ""}`} data-event-id={item.id} data-motion={moving ? "reordering" : "idle"} data-selected={isSelected} data-testid={`event-${item.id}`} key={item.id}>
        {showDayHeading ? <div className={styles.dayHeading} data-testid="timeline-day"><strong>{formatTimelineDay(item.startAt)}</strong><span>{new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(item.startAt))}</span></div> : null}
        <span aria-hidden="true" className={styles.railMarker}>{formatTimelineTime(item.startAt)}</span>
        <article className={`${styles.eventCard} ${isSelected ? styles.eventCardSelected : ""}`}><div className={styles.eventContent}><span className={`${styles.status} ${styles[`status_${item.status}`]}`}>{STATUS_LABELS[item.status]}</span><h3 data-event-category={item.category}><CategoryIcon aria-hidden={true} size={15} />{item.title}</h3><p>{CATEGORY_LABELS[item.category]}</p><small>{formatTimelineTime(item.startAt)}–{formatTimelineTime(item.endAt)} · {item.participantIds.length} participants</small>{itemNotes[0] ? <span className={styles.notePreview}>Notes: {itemNotes[0].body}</span> : null}</div>
          <div className={styles.eventMeta}><span>Location</span><strong>{item.location || "—"}</strong></div>
          <div className={styles.eventMeta}><span>Assignee</span><strong>{assignee?.displayName ?? "Unassigned"}</strong></div>
          <div className={styles.eventMeta}><span>Participants</span><strong>{item.participantIds.length}</strong></div>
          <div className={styles.rightControls}>
            <div className={styles.actionMenu}>
              <button aria-controls={`event-actions-${item.id}`} aria-expanded={actionMenuOpen} aria-label={`Open actions for ${item.title}`} className={styles.actionMenuButton} onClick={() => setActionMenuEventId((current) => current === item.id ? null : item.id)} type="button">•••</button>
              {actionMenuOpen ? <div aria-label={`Actions for ${item.title}`} className={styles.actions} id={`event-actions-${item.id}`}>
              {isLead ? <><button aria-label={`Move ${item.title} up`} disabled={index === 0 || runningAction !== null || reorderPending} onClick={() => void move(item.id, "up")} type="button">↑</button><button aria-label={`Move ${item.title} down`} disabled={index === timeline.length - 1 || runningAction !== null || reorderPending} onClick={() => void move(item.id, "down")} type="button">↓</button></> : null}
              {isLead && item.status === "pending" ? <button disabled={runningAction !== null} onClick={() => void runAction(`approve-${item.id}`, "Approval requested.", () => onApprove(item.id))} type="button">Approve</button> : null}
              {isLead && (item.status === "approved" || item.status === "happening") ? <button disabled={runningAction !== null} onClick={() => void runAction(`pause-${item.id}`, "Pause requested.", () => onPause(item.id))} type="button">Pause</button> : null}
              {isLead && item.status === "paused" ? <button disabled={runningAction !== null} onClick={() => void runAction(`resume-${item.id}`, "Resume requested.", () => onResume(item.id))} type="button">Resume</button> : null}
              {isLead && (item.status === "approved" || item.status === "happening" || item.status === "paused") ? <button disabled={runningAction !== null} onClick={() => void runAction(`complete-${item.id}`, "Completion requested.", () => onComplete(item.id))} type="button">Mark complete</button> : null}
              {isLead && item.status !== "cancelled" ? <button disabled={runningAction !== null} onClick={() => void runAction(`cancel-${item.id}`, "Cancellation requested.", () => onCancel(item.id))} type="button">Cancel</button> : null}
              {canDelete ? <button disabled={runningAction !== null} onClick={() => void runAction(`delete-${item.id}`, "Deletion requested.", () => onDelete(item.id))} type="button">Delete</button> : null}
              </div> : null}
            </div>
            <button aria-label={`Open ${item.title} details`} className={styles.detailButton} onClick={() => setSelectedEventId(item.id)} type="button">Details</button>
          </div>
        </article>
      </li>;
    })}</ol>}
      {selectedEvent ? <EventDetailPanel
        canEdit={isLead || (selectedEvent.createdBy === currentUserId && selectedEvent.status === "pending")}
        canManageCollaboration={isLead}
        currentUserId={currentUserId}
        event={selectedEvent}
        members={members}
        activity={activity.filter((item) => item.eventId === selectedEvent.id)}
        notes={notes.filter((note) => note.eventId === selectedEvent.id)}
        subitems={subitems.filter((subitem) => subitem.eventId === selectedEvent.id)}
        onCreateNote={onCreateNote}
        onDeleteNote={onDeleteNote}
        onCreateSubitem={onCreateSubitem}
        onDeleteSubitem={onDeleteSubitem}
        onToggleSubitem={onToggleSubitem}
        onUpdate={onUpdate}
      /> : null}
    </div>
  </section>;
}

interface EventDetailPanelProps {
  canEdit: boolean;
  canManageCollaboration: boolean;
  currentUserId: string;
  event: EventRecord;
  members: MemberRecord[];
  activity: TripActivity[];
  notes: EventNote[];
  subitems: EventSubitem[];
  onCreateNote: (eventId: string, body: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onCreateSubitem: (eventId: string, title: string) => Promise<void>;
  onToggleSubitem: (subitemId: string, completed: boolean) => Promise<void>;
  onDeleteSubitem: (subitemId: string) => Promise<void>;
  onUpdate: (eventId: string, patch: UpdateEventInput) => Promise<void>;
}

function EventDetailPanel({ canEdit, canManageCollaboration, currentUserId, event, members, activity, notes, subitems, onCreateNote, onDeleteNote, onCreateSubitem, onToggleSubitem, onDeleteSubitem, onUpdate }: EventDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location ?? "");
  const [assigneeUid, setAssigneeUid] = useState(event.assigneeUid ?? "");
  const [priority, setPriority] = useState<FirestoreEventPriority | "">(event.priority ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "subitems">("details");
  const [noteBody, setNoteBody] = useState("");
  const [subitemTitle, setSubitemTitle] = useState("");
  const [collaborationSaving, setCollaborationSaving] = useState<string | null>(null);
  const [collaborationFeedback, setCollaborationFeedback] = useState<Feedback>(null);
  const participants = event.participantIds
    .map((uid) => members.find((member) => member.uid === uid)?.displayName ?? uid)
    .join(", ") || "Unassigned";

  function beginEdit() {
    setTitle(event.title);
    setLocation(event.location ?? "");
    setAssigneeUid(event.assigneeUid ?? "");
    setPriority(event.priority ?? "");
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
    const nextLocation = location.trim();
    const patch: UpdateEventInput = {
      ...(nextTitle !== event.title ? { title: nextTitle } : {}),
      ...(nextLocation !== (event.location ?? "") ? { location: nextLocation || null } : {}),
      ...(assigneeUid !== (event.assigneeUid ?? "") ? { assigneeUid: assigneeUid || null } : {}),
      ...(priority !== (event.priority ?? "") ? { priority: priority || null } : {}),
    };
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setFeedback({ kind: "saving", message: "Saving changes…" });
    try {
      await onUpdate(event.id, patch);
      setEditing(false);
      setFeedback({ kind: "success", message: "Changes sent. Waiting for the realtime update." });
    } catch (error) {
      setFeedback({ kind: "error", message: rollbackMessage(error, "Unable to update the item.") });
    } finally {
      setSaving(false);
    }
  }

  async function runCollaborationAction(action: string, success: string, operation: () => Promise<void>) {
    setCollaborationSaving(action);
    setCollaborationFeedback({ kind: "saving", message: "Saving collaboration change..." });
    try {
      await operation();
      setCollaborationFeedback({ kind: "success", message: success });
    } catch (error) {
      setCollaborationFeedback({ kind: "error", message: rollbackMessage(error, "Unable to save the collaboration change.") });
    } finally {
      setCollaborationSaving(null);
    }
  }

  async function submitNote(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    const body = noteBody.trim();
    if (!body) {
      setCollaborationFeedback({ kind: "error", message: "A note cannot be blank." });
      return;
    }
    await runCollaborationAction("create-note", "Note saved. Waiting for the realtime update.", async () => {
      await onCreateNote(event.id, body);
      setNoteBody("");
    });
  }

  async function submitSubitem(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    const nextTitle = subitemTitle.trim();
    if (!nextTitle) {
      setCollaborationFeedback({ kind: "error", message: "A sub-item title cannot be blank." });
      return;
    }
    await runCollaborationAction("create-subitem", "Sub-item saved. Waiting for the realtime update.", async () => {
      await onCreateSubitem(event.id, nextTitle);
      setSubitemTitle("");
    });
  }

  return <aside aria-label="Event details" className={styles.detailPanel}>
    <div className={styles.detailHeader}>
      <div><p className={styles.detailKicker}>Item details</p><h3>{event.title}</h3></div>
      <span className={`${styles.status} ${styles[`status_${event.status}`]}`}>{STATUS_LABELS[event.status]}</span>
    </div>
    <div aria-label="Item details" className={styles.detailTabs} role="tablist">
      <button aria-selected={activeTab === "details"} onClick={() => setActiveTab("details")} role="tab" type="button">Details</button>
      <button aria-selected={activeTab === "notes"} onClick={() => setActiveTab("notes")} role="tab" type="button">Notes</button>
      <button aria-selected="false" disabled role="tab" type="button">Files</button>
      <button aria-selected={activeTab === "subitems"} onClick={() => setActiveTab("subitems")} role="tab" type="button">Sub-items</button>
    </div>
    {activeTab === "details" ? <>
    <dl className={styles.detailList}>
      <div><dt>Category</dt><dd>{CATEGORY_LABELS[event.category]}</dd></div>
      <div><dt>Time</dt><dd>{formatDateTime(event.startAt)} — {formatDateTime(event.endAt)}</dd></div>
      <div><dt>Participants</dt><dd>{participants}</dd></div>
      <div><dt>Location</dt><dd>{event.location ?? "Not set"}</dd></div>
      <div><dt>Assignee</dt><dd>{event.assigneeUid ? members.find((member) => member.uid === event.assigneeUid)?.displayName ?? event.assigneeUid : "Unassigned"}</dd></div>
      <div><dt>Priority</dt><dd>{event.priority ?? "Not set"}</dd></div>
      <div><dt>Edit access</dt><dd>{canEdit ? "You can update this item." : "Only the lead or author of a pending item can edit it."}</dd></div>
    </dl>
    {feedback ? <p className={`${styles.detailFeedback} ${styles[feedback.kind]}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    {canEdit ? editing ? <form className={styles.editForm} onSubmit={(eventForm) => void save(eventForm)}>
      <label>Activity title<input aria-label="Activity title" disabled={saving} maxLength={120} onChange={(eventInput) => setTitle(eventInput.target.value)} required value={title} /></label>
      <label>Location<input aria-label="Location" disabled={saving} maxLength={160} onChange={(eventInput) => setLocation(eventInput.target.value)} value={location} /></label>
      <label>Assignee<select aria-label="Assignee" disabled={saving} onChange={(eventInput) => setAssigneeUid(eventInput.target.value)} value={assigneeUid}><option value="">Unassigned</option>{members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName}</option>)}</select></label>
      <label>Priority<select aria-label="Priority" disabled={saving} onChange={(eventInput) => setPriority(eventInput.target.value as FirestoreEventPriority | "")} value={priority}><option value="">Not set</option>{PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <div className={styles.detailActions}>
        <button className={styles.saveButton} disabled={saving} type="submit">{saving ? "Saving changes…" : "Save changes"}</button>
        <button disabled={saving} onClick={() => { setEditing(false); setFeedback(null); }} type="button">Cancel edit</button>
      </div>
    </form> : <button className={styles.editButton} onClick={beginEdit} type="button">Edit event</button> : null}
    </> : null}
    {activeTab === "notes" ? <section aria-label="Event notes" className={styles.collaborationPanel}>
      <form aria-label="Add note" className={styles.collaborationComposer} onSubmit={(eventForm) => void submitNote(eventForm)}>
        <label>New note<textarea aria-label="New note" disabled={collaborationSaving !== null} maxLength={1000} onChange={(eventInput) => setNoteBody(eventInput.target.value)} placeholder="Add a useful update for the team" required value={noteBody} /></label>
        <button className={styles.saveButton} disabled={collaborationSaving !== null} type="submit">Add note</button>
      </form>
      {notes.length ? <ul className={styles.collaborationList}>{notes.map((note) => {
        const canManage = canManageCollaboration || note.createdBy === currentUserId;
        return <li key={note.id}><p>{note.body}</p><small>{members.find((member) => member.uid === note.createdBy)?.displayName ?? note.createdBy}</small>{canManage ? <button disabled={collaborationSaving !== null} onClick={() => void runCollaborationAction(`delete-note-${note.id}`, "Note removed. Waiting for the realtime update.", () => onDeleteNote(note.id))} type="button">Delete</button> : null}</li>;
      })}</ul> : <p className={styles.collaborationEmpty}>No notes yet. Add the first shared update.</p>}
    </section> : null}
    {activeTab === "subitems" ? <section aria-label="Event sub-items" className={styles.collaborationPanel}>
      <form aria-label="Add sub-item" className={styles.collaborationComposer} onSubmit={(eventForm) => void submitSubitem(eventForm)}>
        <label>New sub-item<input aria-label="New sub-item" disabled={collaborationSaving !== null} maxLength={160} onChange={(eventInput) => setSubitemTitle(eventInput.target.value)} placeholder="Add a concrete next step" required value={subitemTitle} /></label>
        <button className={styles.saveButton} disabled={collaborationSaving !== null} type="submit">Add sub-item</button>
      </form>
      {subitems.length ? <ul className={styles.subitemList}>{subitems.map((subitem) => {
        const canManage = canManageCollaboration || subitem.createdBy === currentUserId;
        return <li key={subitem.id}><label><input aria-label={`Mark ${subitem.title} ${subitem.completed ? "open" : "complete"}`} checked={subitem.completed} disabled={!canManage || collaborationSaving !== null} onChange={(eventInput) => void runCollaborationAction(`toggle-subitem-${subitem.id}`, "Sub-item updated. Waiting for the realtime update.", () => onToggleSubitem(subitem.id, eventInput.target.checked))} type="checkbox" /><span>{subitem.title}</span></label>{canManage ? <button disabled={collaborationSaving !== null} onClick={() => void runCollaborationAction(`delete-subitem-${subitem.id}`, "Sub-item removed. Waiting for the realtime update.", () => onDeleteSubitem(subitem.id))} type="button">Delete</button> : null}</li>;
      })}</ul> : <p className={styles.collaborationEmpty}>No sub-items yet. Break the work into an actionable step.</p>}
    </section> : null}
    {collaborationFeedback ? <p className={`${styles.detailFeedback} ${styles[collaborationFeedback.kind]}`} role={collaborationFeedback.kind === "error" ? "alert" : "status"}>{collaborationFeedback.message}</p> : null}
    {activity.length ? <section aria-label="Audit activity" className={styles.auditActivity}><div><span>Audit activity</span><b>{activity.length}</b></div><ul>{activity.slice(0, 5).map((item) => <li key={item.id}><strong>{item.label}</strong><small>{members.find((member) => member.uid === item.actorId)?.displayName ?? "Trip member"} · {formatDateTime(item.createdAt)}</small></li>)}</ul></section> : null}
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
function formatTimelineTime(value: string): string { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function formatTimelineDay(value: string): string { return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date(value)); }
function rollbackMessage(error: unknown, fallback: string): string { const detail = error instanceof Error && error.message ? error.message : fallback; return `${detail} The form or timeline was rolled back so you can try again.`; }
