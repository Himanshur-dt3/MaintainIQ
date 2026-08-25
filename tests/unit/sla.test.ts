import { describe, expect, it } from "vitest";
import { Priority, TicketStatus } from "@prisma/client";

import {
  calculateSlaDeadline,
  getSlaStatus,
  getSlaTargetHours,
} from "@/src/server/services/sla";

describe("SLA service", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");

  it("returns the configured SLA target for each priority", () => {
    expect(getSlaTargetHours(Priority.CRITICAL)).toBe(4);
    expect(getSlaTargetHours(Priority.HIGH)).toBe(8);
    expect(getSlaTargetHours(Priority.MEDIUM)).toBe(24);
    expect(getSlaTargetHours(Priority.LOW)).toBe(72);
  });

  it("calculates the SLA deadline from creation time and priority", () => {
    expect(
      calculateSlaDeadline(createdAt, Priority.CRITICAL),
    ).toEqual(new Date("2026-01-01T04:00:00.000Z"));

    expect(
      calculateSlaDeadline(createdAt, Priority.HIGH),
    ).toEqual(new Date("2026-01-01T08:00:00.000Z"));

    expect(
      calculateSlaDeadline(createdAt, Priority.MEDIUM),
    ).toEqual(new Date("2026-01-02T00:00:00.000Z"));

    expect(
      calculateSlaDeadline(createdAt, Priority.LOW),
    ).toEqual(new Date("2026-01-04T00:00:00.000Z"));
  });

  it("returns NO_DEADLINE when no SLA deadline exists", () => {
    expect(
      getSlaStatus(
        TicketStatus.REPORTED,
        Priority.HIGH,
        null,
        null,
        createdAt,
      ),
    ).toBe("NO_DEADLINE");
  });

  it("marks an unresolved ticket ON_TRACK when sufficient time remains", () => {
    const deadline = calculateSlaDeadline(createdAt, Priority.HIGH);

    expect(
      getSlaStatus(
        TicketStatus.REPORTED,
        Priority.HIGH,
        deadline,
        null,
        new Date("2026-01-01T01:00:00.000Z"),
      ),
    ).toBe("ON_TRACK");
  });

  it("marks an unresolved ticket AT_RISK inside the final quarter of its SLA window", () => {
    const deadline = calculateSlaDeadline(createdAt, Priority.HIGH);

    expect(
      getSlaStatus(
        TicketStatus.ASSIGNED,
        Priority.HIGH,
        deadline,
        null,
        new Date("2026-01-01T07:00:00.000Z"),
      ),
    ).toBe("AT_RISK");
  });

  it("marks an unresolved ticket BREACHED after its deadline", () => {
    const deadline = calculateSlaDeadline(createdAt, Priority.HIGH);

    expect(
      getSlaStatus(
        TicketStatus.IN_PROGRESS,
        Priority.HIGH,
        deadline,
        null,
        new Date("2026-01-01T08:01:00.000Z"),
      ),
    ).toBe("BREACHED");
  });

  it("marks a resolved ticket within SLA when resolved before the deadline", () => {
    const deadline = calculateSlaDeadline(createdAt, Priority.HIGH);

    expect(
      getSlaStatus(
        TicketStatus.RESOLVED,
        Priority.HIGH,
        deadline,
        new Date("2026-01-01T07:59:59.000Z"),
      ),
    ).toBe("RESOLVED_WITHIN_SLA");
  });

  it("marks a resolved ticket late when resolved after the deadline", () => {
    const deadline = calculateSlaDeadline(createdAt, Priority.HIGH);

    expect(
      getSlaStatus(
        TicketStatus.RESOLVED,
        Priority.HIGH,
        deadline,
        new Date("2026-01-01T08:00:01.000Z"),
      ),
    ).toBe("RESOLVED_LATE");
  });

  it("does not treat an unresolved ticket with a future deadline as resolved", () => {
    const deadline = calculateSlaDeadline(createdAt, Priority.CRITICAL);

    expect(
      getSlaStatus(
        TicketStatus.IN_PROGRESS,
        Priority.CRITICAL,
        deadline,
        null,
        new Date("2026-01-01T02:00:00.000Z"),
      ),
    ).toBe("ON_TRACK");
  });
});
