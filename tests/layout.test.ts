import { describe, expect, it } from "vitest";
import { buildTimelineFlow, buildSections } from "../src/reactflow-builder";

describe("buildTimelineFlow", () => {
  it("creates nodes and edges for events", () => {
    const events = [
      { id: "1", title: "A", date: "2021-01-01" },
      { id: "2", title: "B", date: "2021-06-15" },
      { id: "3", title: "C", date: "2021-12-01" },
    ];

    const result = buildTimelineFlow(events, [], { clusterGapDays: 7 });

    // Events are far apart (>7 days) so no clustering — 3 individual nodes
    const eventNodes = result.nodes.filter((n) => n.type === "event");
    const markerNodes = result.nodes.filter((n) => n.type === "marker");
    expect(eventNodes.length).toBe(3);
    expect(markerNodes.length).toBe(3);
    expect(result.edges.length).toBe(3);
  });

  it("compresses large gaps", () => {
    const events = [
      { id: "1", title: "Early", date: "2020-01-01" },
      { id: "2", title: "Late", date: "2023-06-01" },
    ];

    const result = buildTimelineFlow(events, [], { maxGapDays: 90 });
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps[0].compressed).toBe(true);
  });

  it("creates bands with edges", () => {
    const events = [{ id: "1", title: "A", date: "2021-01-01" }];
    const bands = [{ id: "b1", title: "Phase 1", start: "2021-01-01", end: "2021-06-01" }];

    const result = buildTimelineFlow(events, bands);
    const bandNodes = result.nodes.filter((n) => n.type === "band");
    const bandEdges = result.edges.filter((e) => e.id.startsWith("band-edge-"));
    expect(bandNodes.length).toBe(1);
    expect(bandEdges.length).toBeGreaterThan(0);
  });

  it("clusters nearby events into stacks", () => {
    const events = [
      { id: "1", title: "A", date: "2021-03-01" },
      { id: "2", title: "B", date: "2021-03-05" },
      { id: "3", title: "C", date: "2021-03-10" },
    ];

    const result = buildTimelineFlow(events, [], { clusterGapDays: 18 });
    const stackNodes = result.nodes.filter((n) => n.type === "eventStack");
    expect(stackNodes.length).toBe(1);
  });
});

describe("buildSections", () => {
  it("builds year sections", () => {
    const min = Date.UTC(2020, 0, 1);
    const max = Date.UTC(2022, 6, 1);
    const sections = buildSections(min, max, "year");
    expect(sections.length).toBe(3);
    expect(sections[0].label).toBe("2020");
    expect(sections[2].label).toBe("2022");
  });

  it("builds month sections", () => {
    const min = Date.UTC(2021, 0, 1);
    const max = Date.UTC(2021, 2, 15);
    const sections = buildSections(min, max, "month");
    expect(sections.length).toBe(3);
  });
});
