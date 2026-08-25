import { describe, expect, it } from "vitest";
import { IssueType, Priority } from "@prisma/client";

import {
  recommendTechnicianDispatch,
} from "@/src/server/services/ai-assistant";

describe("technician dispatch", () => {
  it("returns null when there are no technicians", () => {
    expect(
      recommendTechnicianDispatch(
        IssueType.ELECTRICAL,
        Priority.HIGH,
        [],
      ),
    ).toBeNull();
  });

  it("prefers the technician with lower workload", () => {
    const result = recommendTechnicianDispatch(
      IssueType.ELECTRICAL,
      Priority.MEDIUM,
      [
        {
          id: "busy",
          name: "Busy Technician",
          jobTitle: null,
          _count: { assignedTickets: 5 },
        },
        {
          id: "available",
          name: "Available Technician",
          jobTitle: null,
          _count: { assignedTickets: 1 },
        },
      ],
    );

    expect(result).not.toBeNull();
    expect(result?.technicianId).toBe("available");
  });

  it("uses job title as a specialization signal", () => {
    const result = recommendTechnicianDispatch(
      IssueType.ELECTRICAL,
      Priority.MEDIUM,
      [
        {
          id: "general",
          name: "General Technician",
          jobTitle: "Maintenance Technician",
          _count: { assignedTickets: 0 },
        },
        {
          id: "specialist",
          name: "Specialist Technician",
          jobTitle: "ELECTRICAL Technician",
          _count: { assignedTickets: 0 },
        },
      ],
    );

    expect(result).not.toBeNull();
    expect(result?.technicianId).toBe("specialist");
    expect(result?.rationale).toContain("role matches");
  });

  it("produces an explainable match score", () => {
    const result = recommendTechnicianDispatch(
      IssueType.PLUMBING,
      Priority.CRITICAL,
      [
        {
          id: "tech-1",
          name: "Technician One",
          jobTitle: "Maintenance Technician",
          _count: { assignedTickets: 2 },
        },
      ],
    );

    expect(result).not.toBeNull();
    expect(result?.matchScore).toBeGreaterThanOrEqual(10);
    expect(result?.matchScore).toBeLessThanOrEqual(99);
    expect(result?.rationale.length).toBeGreaterThan(20);
  });
});