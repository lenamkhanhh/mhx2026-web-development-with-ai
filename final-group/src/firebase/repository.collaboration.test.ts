import { describe, expect, it } from "vitest";
import { decodeEventNote, decodeEventSubitem, decodeTripActivity } from "./repository";

describe("collaboration Firestore decoders", () => {
  const createdAt = new Date("2026-08-01T08:00:00.000Z");
  const timestamp = {
    toDate() { return new Date(this.toMillis()); },
    toMillis() { return createdAt.getTime(); },
  };

  it("decodes server timestamps for notes, sub-items, and activity", () => {
    expect(decodeEventNote("note-1", { eventId: "event-1", body: "Meet at exit 4.", createdBy: "user-1", createdAt: timestamp })).toMatchObject({ createdAt: createdAt.toISOString() });
    expect(decodeEventSubitem("subitem-1", { eventId: "event-1", title: "Confirm pickup", completed: false, createdBy: "user-1", createdAt: timestamp, updatedAt: timestamp })).toMatchObject({ createdAt: createdAt.toISOString(), updatedAt: createdAt.toISOString() });
    expect(decodeTripActivity("activity-1", { kind: "note_added", eventId: "event-1", actorId: "user-1", label: "Added a note", createdAt: timestamp })).toMatchObject({ createdAt: createdAt.toISOString() });
  });
});
