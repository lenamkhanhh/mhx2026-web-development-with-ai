import { useState } from "react";
import type { MemberRecord, TripRecord } from "../../firebase/contracts";
import { canEditResponsibility, canRemoveMember } from "./authorization";

export interface MembersPanelProps {
  trip: Pick<TripRecord, "id" | "joinCode">;
  members: MemberRecord[];
  currentUserId: string;
  onUpdateResponsibility: (
    memberId: string,
    responsibility: string,
  ) => void | Promise<void>;
  onRemoveMember: (memberId: string) => void | Promise<void>;
}

export function MembersPanel({
  trip,
  members,
  currentUserId,
  onUpdateResponsibility,
  onRemoveMember,
}: MembersPanelProps) {
  const currentMember = members.find((member) => member.uid === currentUserId);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const updateResponsibility = async (member: MemberRecord) => {
    if (!canEditResponsibility(currentUserId, member)) return;

    const responsibility = drafts[member.uid] ?? member.responsibility;
    if (responsibility === member.responsibility) return;

    setSavingMemberId(member.uid);
    try {
      await onUpdateResponsibility(member.uid, responsibility);
    } finally {
      setSavingMemberId(null);
    }
  };

  const removeMember = async (member: MemberRecord) => {
    if (!canRemoveMember(currentUserId, currentMember?.role, member)) return;

    setSavingMemberId(member.uid);
    try {
      await onRemoveMember(member.uid);
    } finally {
      setSavingMemberId(null);
    }
  };

  return (
    <section aria-labelledby="members-heading" className="members-panel">
      <header>
        <p>Nhóm chuyến đi</p>
        <h2 id="members-heading">Thành viên</h2>
        <p>Chỉ mỗi thành viên mới có thể cập nhật trách nhiệm của mình.</p>
      </header>

      <aside aria-label="Thông tin gia nhập" className="join-code-card">
        <span>Trip ID</span>
        <strong>{trip.id}</strong>
        <span>Mã gia nhập</span>
        <strong>{trip.joinCode}</strong>
      </aside>

      <ul aria-label="Danh sách thành viên" className="member-list">
        {members.map((member) => {
          const mayEdit = canEditResponsibility(currentUserId, member);
          const mayRemove = canRemoveMember(
            currentUserId,
            currentMember?.role,
            member,
          );
          const draft = drafts[member.uid] ?? member.responsibility;
          const isSaving = savingMemberId === member.uid;

          return (
            <li key={member.uid}>
              <article>
                <div>
                  <h3>{member.displayName}</h3>
                  <p>{member.email}</p>
                  <p>{member.role === "lead" ? "Lead" : "Member"}</p>
                </div>

                <label>
                  Trách nhiệm
                  <input
                    aria-label={`Trách nhiệm của ${member.displayName}`}
                    disabled={!mayEdit || isSaving}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [member.uid]: event.target.value,
                      }))
                    }
                    value={draft}
                  />
                </label>

                {mayEdit ? (
                  <button
                    disabled={isSaving || draft.trim() === member.responsibility}
                    onClick={() => void updateResponsibility(member)}
                    type="button"
                  >
                    Lưu trách nhiệm
                  </button>
                ) : null}

                {mayRemove ? (
                  <button
                    aria-label={`Xóa ${member.displayName} khỏi chuyến đi`}
                    disabled={isSaving}
                    onClick={() => void removeMember(member)}
                    type="button"
                  >
                    Xóa thành viên
                  </button>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
