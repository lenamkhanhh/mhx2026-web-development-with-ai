import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  statusLabel,
} from "./App";

describe("TripFlow integration mappings", () => {
  it("labels every persisted event category without using the legacy UI vocabulary", () => {
    expect(categoryLabel("transport")).toBe("Di chuyển");
    expect(categoryLabel("stay")).toBe("Lưu trú");
    expect(categoryLabel("food")).toBe("Ăn uống");
    expect(categoryLabel("activity")).toBe("Hoạt động");
    expect(categoryLabel("other")).toBe("Khác");
  });

  it("labels every persisted event status without silently coercing it", () => {
    expect(statusLabel("pending")).toBe("Chờ duyệt");
    expect(statusLabel("approved")).toBe("Đã duyệt");
    expect(statusLabel("happening")).toBe("Đang diễn ra");
    expect(statusLabel("completed")).toBe("Đã hoàn thành");
    expect(statusLabel("cancelled")).toBe("Đã huỷ");
  });
});
