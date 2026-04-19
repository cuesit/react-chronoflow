import { describe, expect, it } from "vitest";
import { compileDomainToReactFlow } from "../src/reactflow-adapter";

describe("compileDomainToReactFlow", () => {
  it("keeps node->node links unchanged", () => {
    const result = compileDomainToReactFlow({
      nodes: [
        { id: "a", position: { x: 0, y: 0 } },
        { id: "b", position: { x: 100, y: 100 } },
      ],
      links: [
        {
          id: "e1",
          source: { kind: "node", id: "a" },
          target: { kind: "node", id: "b" },
        },
      ],
    });

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe("a");
    expect(result.edges[0].target).toBe("b");
  });

  it("creates anchor node for node->edge links", () => {
    const result = compileDomainToReactFlow({
      nodes: [
        { id: "a", position: { x: 0, y: 0 } },
        { id: "b", position: { x: 100, y: 0 } },
        { id: "c", position: { x: 50, y: 100 } },
      ],
      links: [
        {
          id: "e1",
          source: { kind: "node", id: "a" },
          target: { kind: "node", id: "b" },
        },
        {
          id: "e2",
          source: { kind: "node", id: "c" },
          target: { kind: "edge", id: "e1" },
        },
      ],
    });

    const anchorId = result.edgeAnchorNodeIds.e1;
    expect(anchorId).toBeDefined();

    const e2 = result.edges.find((e) => e.id === "e2");
    expect(e2?.source).toBe("c");
    expect(e2?.target).toBe(anchorId);
  });

  it("creates anchors for edge->edge links", () => {
    const result = compileDomainToReactFlow({
      nodes: [
        { id: "a", position: { x: 0, y: 0 } },
        { id: "b", position: { x: 120, y: 0 } },
        { id: "c", position: { x: 0, y: 80 } },
        { id: "d", position: { x: 120, y: 80 } },
      ],
      links: [
        { id: "e1", source: { kind: "node", id: "a" }, target: { kind: "node", id: "b" } },
        { id: "e2", source: { kind: "node", id: "c" }, target: { kind: "node", id: "d" } },
        { id: "e3", source: { kind: "edge", id: "e1" }, target: { kind: "edge", id: "e2" } },
      ],
    });

    const a1 = result.edgeAnchorNodeIds.e1;
    const a2 = result.edgeAnchorNodeIds.e2;
    expect(a1).toBeDefined();
    expect(a2).toBeDefined();

    const e3 = result.edges.find((e) => e.id === "e3");
    expect(e3?.source).toBe(a1);
    expect(e3?.target).toBe(a2);
  });
});
