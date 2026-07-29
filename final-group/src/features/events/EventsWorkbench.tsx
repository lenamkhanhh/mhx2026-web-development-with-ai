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
  transport: "Di chuyển", stay: "Lưu trú", food: "Ăn uống", activity: "Hoạt động", other: "Khác",
};
const STATUS_LABELS: Record<FirestoreEventStatus, string> = {
  pending: "Chờ duyệt", approved: "Đã duyệt", happening: "Đang diễn ra", completed: "Đã hoàn thành", cancelled: "Đã hủy",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as FirestoreEventCategory[];
type Feedback = { kind: "saving" | "success" | "error"; message: string } | null;

export interface EventsWorkbenchProps {
  currentUserId: string;
  events: EventRecord[];
  members: MemberRecord[];
  role: FirestoreMemberRole;
  onCreate: (input: CreateEventInput) => Promise<void>;
  onApprove: (eventId: string) => Promise<void>;
  onCancel: (eventId: string) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  onMove: (eventId: string, direction: "up" | "down") => Promise<void>;
  onSync: () => Promise<void>;
}

export function EventsWorkbench(props: EventsWorkbenchProps) {
  const { currentUserId, events, members, role, onApprove, onCancel, onCreate, onDelete, onMove, onSync } = props;
  const [draft, setDraft] = useState({ title: "", category: "activity" as FirestoreEventCategory, startAt: "", endAt: "", participantIds: [] as string[] });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);
  const reducedMotion = useReducedMotion();
  const isLead = role === "lead";
  const timeline = useMemo(() => orderEvents(events, optimisticOrder), [events, optimisticOrder]);

  useEffect(() => setOptimisticOrder(null), [events]);

  function toggleParticipant(uid: string) {
    setDraft((current) => ({ ...current, participantIds: current.participantIds.includes(uid) ? current.participantIds.filter((id) => id !== uid) : [...current.participantIds, uid] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || !draft.startAt || !draft.endAt || draft.participantIds.length === 0) {
      setFeedback({ kind: "error", message: "Hãy điền đủ tên, thời gian và ít nhất một thành viên." });
      return;
    }
    const input: CreateEventInput = { title, category: draft.category, startAt: new Date(draft.startAt).toISOString(), endAt: new Date(draft.endAt).toISOString(), participantIds: draft.participantIds };
    setSaving(true);
    setFeedback({ kind: "saving", message: `Đang thêm “${title}” vào lịch trình…` });
    try {
      await onCreate(input);
      setDraft({ title: "", category: "activity", startAt: "", endAt: "", participantIds: [] });
      setFeedback({ kind: "success", message: "Đã gửi hoạt động. Chờ bản cập nhật thời gian thực." });
    } catch (error) {
      setFeedback({ kind: "error", message: rollbackMessage(error, "Không thể lưu hoạt động.") });
    } finally { setSaving(false); }
  }

  async function runAction(action: string, success: string, operation: () => Promise<void>) {
    setRunningAction(action); setFeedback(null);
    try { await operation(); setFeedback({ kind: "success", message: success }); }
    catch (error) { setFeedback({ kind: "error", message: rollbackMessage(error, "Thao tác không thành công.") }); }
    finally { setRunningAction(null); }
  }

  async function move(eventId: string, direction: "up" | "down") {
    const nextOrder = moveEvent(timeline.map((event) => event.id), eventId, direction);
    if (!nextOrder) return;
    setMovingId(eventId); setOptimisticOrder(nextOrder);
    setFeedback({ kind: "saving", message: "Đang cập nhật vị trí trong timeline…" });
    try { await onMove(eventId, direction); setFeedback({ kind: "success", message: "Đã gửi yêu cầu sắp xếp. Chờ bản cập nhật thời gian thực." }); }
    catch (error) { setOptimisticOrder(null); setFeedback({ kind: "error", message: rollbackMessage(error, "Không thể đổi thứ tự.") }); }
    finally { setMovingId(null); }
  }

  return <section className={styles.workbench} data-reduced-motion={reducedMotion} data-testid="events-workbench">
    <header className={styles.header}>
      <div><p className={styles.kicker}>Trip timeline · realtime workspace</p><h2>Lịch trình</h2><p className={styles.intro}>Tạo một nhịp đi chung; đề xuất của member sẽ chờ Lead duyệt.</p></div>
      {isLead ? <button className={styles.syncButton} disabled={runningAction === "sync"} onClick={() => void runAction("sync", "Đã yêu cầu đồng bộ trạng thái.", onSync)} type="button">Đồng bộ trạng thái</button> : null}
    </header>
    {feedback ? <p className={`${styles.feedback} ${styles[feedback.kind]}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    <form className={styles.composer} onSubmit={(event) => void submit(event)}>
      <div className={styles.composerHeader}><span>01</span><div><strong>Thêm một điểm chạm</strong><small>{isLead ? "Tạo mới sẽ được duyệt ngay" : "Tạo mới sẽ vào hàng chờ duyệt"}</small></div></div>
      <label>Tên hoạt động<input maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Ngắm bình minh" required value={draft.title} /></label>
      <label>Loại<select onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as FirestoreEventCategory }))} value={draft.category}>{CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
      <label>Bắt đầu<input onChange={(event) => setDraft((current) => ({ ...current, startAt: event.target.value }))} required type="datetime-local" value={draft.startAt} /></label>
      <label>Kết thúc<input onChange={(event) => setDraft((current) => ({ ...current, endAt: event.target.value }))} required type="datetime-local" value={draft.endAt} /></label>
      <fieldset className={styles.participants}><legend>Ai tham gia?</legend>{members.map((member) => <label key={member.uid}><input checked={draft.participantIds.includes(member.uid)} onChange={() => toggleParticipant(member.uid)} type="checkbox" />{member.displayName}</label>)}</fieldset>
      <button className={styles.createButton} disabled={saving} type="submit">{saving ? "Đang lưu hoạt động…" : "Thêm vào lịch trình"}</button>
    </form>
    <div className={styles.timelineHeader}><span>02</span><strong>Timeline có thể hành động</strong><small>{timeline.length} hoạt động</small></div>
    {timeline.length === 0 ? <div className={styles.empty}><strong>Timeline còn trống</strong><p>Chưa có hoạt động nào trong hành trình này.</p></div> : <ol aria-label="Timeline hoạt động" className={styles.timeline}>{timeline.map((item, index) => {
      const canDelete = isLead || (item.createdBy === currentUserId && item.status === "pending");
      const moving = movingId === item.id;
      return <li className={styles.timelineItem} data-event-id={item.id} data-motion={moving ? "reordering" : "idle"} data-testid={`event-${item.id}`} key={item.id}>
        <span aria-hidden="true" className={styles.railMarker}>{String(index + 1).padStart(2, "0")}</span>
        <article className={styles.eventCard}><div className={styles.eventContent}><span className={`${styles.status} ${styles[`status_${item.status}`]}`}>{STATUS_LABELS[item.status]}</span><h3>{item.title}</h3><p>{CATEGORY_LABELS[item.category]} · {formatDateTime(item.startAt)} — {formatDateTime(item.endAt)}</p><small>{item.participantIds.length} người tham gia</small></div>
          <div aria-label={`Thao tác ${item.title}`} className={styles.actions}>
            {isLead ? <><button aria-label={`Đưa ${item.title} lên`} disabled={index === 0 || runningAction !== null} onClick={() => void move(item.id, "up")} type="button">↑</button><button aria-label={`Đưa ${item.title} xuống`} disabled={index === timeline.length - 1 || runningAction !== null} onClick={() => void move(item.id, "down")} type="button">↓</button></> : null}
            {isLead && item.status === "pending" ? <button disabled={runningAction !== null} onClick={() => void runAction(`approve-${item.id}`, "Đã gửi yêu cầu duyệt hoạt động.", () => onApprove(item.id))} type="button">Duyệt</button> : null}
            {isLead && item.status !== "cancelled" ? <button disabled={runningAction !== null} onClick={() => void runAction(`cancel-${item.id}`, "Đã gửi yêu cầu hủy hoạt động.", () => onCancel(item.id))} type="button">Hủy</button> : null}
            {canDelete ? <button disabled={runningAction !== null} onClick={() => void runAction(`delete-${item.id}`, "Đã gửi yêu cầu xóa hoạt động.", () => onDelete(item.id))} type="button">Xóa</button> : null}
          </div>
        </article>
      </li>;
    })}</ol>}
  </section>;
}

export function moveEvent(ids: string[], eventId: string, direction: "up" | "down"): string[] | null {
  const index = ids.indexOf(eventId); const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const next = [...ids]; [next[index], next[target]] = [next[target], next[index]]; return next;
}

function orderEvents(events: EventRecord[], optimisticOrder: string[] | null): EventRecord[] {
  const sorted = [...events].sort((left, right) => left.order - right.order || Date.parse(left.startAt) - Date.parse(right.startAt) || left.id.localeCompare(right.id));
  if (!optimisticOrder) return sorted;
  const byId = new Map(sorted.map((event) => [event.id, event]));
  return optimisticOrder.map((id) => byId.get(id)).filter((item): item is EventRecord => Boolean(item));
}

function useReducedMotion(): boolean {
  const preference = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [reduced, setReduced] = useState(preference);
  useEffect(() => { const query = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(query.matches); query.addEventListener?.("change", update); return () => query.removeEventListener?.("change", update); }, []);
  return reduced;
}
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function rollbackMessage(error: unknown, fallback: string): string { const detail = error instanceof Error && error.message ? error.message : fallback; return `${detail} Biểu mẫu/timeline đã được hoàn tác để bạn thử lại.`; }
