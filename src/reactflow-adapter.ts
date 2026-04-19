export type DomainEndpoint = {
  kind: "node" | "edge";
  id: string;
};

export interface DomainNode {
  id: string;
  position: { x: number; y: number };
  type?: string;
  data?: Record<string, unknown>;
  draggable?: boolean;
  selectable?: boolean;
}

export interface DomainLink {
  id: string;
  source: DomainEndpoint;
  target: DomainEndpoint;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export interface DomainGraph {
  nodes: DomainNode[];
  links: DomainLink[];
}

export interface ReactFlowNodeLike {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  hidden?: boolean;
  style?: Record<string, unknown>;
}

export interface ReactFlowEdgeLike {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export interface ReactFlowAdapterOptions {
  edgeType?: string;
  edgeAnimated?: boolean;
  hiddenAnchorNodes?: boolean;
  anchorNodeType?: string;
  anchorNodeSize?: number;
  anchorNodeStyle?: Record<string, unknown>;
}

export interface ReactFlowAdapterResult {
  nodes: ReactFlowNodeLike[];
  edges: ReactFlowEdgeLike[];
  edgeAnchorNodeIds: Record<string, string>;
}

type ResolvedEndpoint =
  | { kind: "node"; nodeId: string }
  | { kind: "edge"; nodeId: string; edgeId: string };

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Compile a domain graph (supports edge->edge links) into React Flow compatible nodes/edges.
 * Edge endpoints are represented by generated anchor nodes, hidden by default.
 */
export function compileDomainToReactFlow(
  graph: DomainGraph,
  options: ReactFlowAdapterOptions = {},
): ReactFlowAdapterResult {
  const edgeType = options.edgeType ?? "default";
  const edgeAnimated = options.edgeAnimated ?? false;
  const hiddenAnchorNodes = options.hiddenAnchorNodes ?? true;
  const anchorNodeType = options.anchorNodeType ?? "__edge_anchor";
  const anchorSize = options.anchorNodeSize ?? 10;

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const linkById = new Map(graph.links.map((l) => [l.id, l]));

  const nodes: ReactFlowNodeLike[] = graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
    draggable: n.draggable,
    selectable: n.selectable,
  }));

  const edges: ReactFlowEdgeLike[] = [];
  const edgeById = new Map<string, ReactFlowEdgeLike>();
  const anchorByEdge = new Map<string, string>();

  const resolvingAnchors = new Set<string>();

  function ensureAnchorNodeForEdge(edgeId: string): string {
    const existing = anchorByEdge.get(edgeId);
    if (existing) return existing;

    if (resolvingAnchors.has(edgeId)) {
      throw new Error(`Cycle detected while resolving edge anchor for edge '${edgeId}'`);
    }
    resolvingAnchors.add(edgeId);

    const edge = edgeById.get(edgeId);
    const link = linkById.get(edgeId);
    if (!edge || !link) {
      resolvingAnchors.delete(edgeId);
      throw new Error(`Cannot create anchor for unresolved edge '${edgeId}'`);
    }

    const sourcePos = resolveEndpointPosition(link.source);
    const targetPos = resolveEndpointPosition(link.target);
    const pos = midpoint(sourcePos, targetPos);

    const anchorNodeId = `__anchor__${edgeId}`;
    anchorByEdge.set(edgeId, anchorNodeId);
    nodes.push({
      id: anchorNodeId,
      type: anchorNodeType,
      position: { x: pos.x - anchorSize / 2, y: pos.y - anchorSize / 2 },
      hidden: hiddenAnchorNodes,
      draggable: false,
      selectable: !hiddenAnchorNodes,
      connectable: true,
      style: {
        width: anchorSize,
        height: anchorSize,
        borderRadius: anchorSize,
        opacity: hiddenAnchorNodes ? 0 : 1,
        pointerEvents: hiddenAnchorNodes ? "none" : "auto",
        background: "#475569",
        border: "1px solid #0f172a",
        ...(options.anchorNodeStyle ?? {}),
      },
      data: { __anchorForEdge: edgeId },
    });

    resolvingAnchors.delete(edgeId);
    return anchorNodeId;
  }

  function resolveEndpoint(endpoint: DomainEndpoint): ResolvedEndpoint {
    if (endpoint.kind === "node") {
      if (!nodeById.has(endpoint.id)) {
        throw new Error(`Unknown node endpoint '${endpoint.id}'`);
      }
      return { kind: "node", nodeId: endpoint.id };
    }

    if (!linkById.has(endpoint.id)) {
      throw new Error(`Unknown edge endpoint '${endpoint.id}'`);
    }

    const anchorNodeId = ensureAnchorNodeForEdge(endpoint.id);
    return { kind: "edge", nodeId: anchorNodeId, edgeId: endpoint.id };
  }

  function resolveEndpointPosition(endpoint: DomainEndpoint): { x: number; y: number } {
    if (endpoint.kind === "node") {
      const node = nodeById.get(endpoint.id);
      if (!node) throw new Error(`Unknown node '${endpoint.id}'`);
      return node.position;
    }

    const anchorNodeId = ensureAnchorNodeForEdge(endpoint.id);
    const anchor = nodes.find((n) => n.id === anchorNodeId);
    if (anchor) {
      return {
        x: anchor.position.x + anchorSize / 2,
        y: anchor.position.y + anchorSize / 2,
      };
    }

    // Fallback path if anchor not yet created.
    const link = linkById.get(endpoint.id);
    if (!link) throw new Error(`Unknown edge '${endpoint.id}'`);
    return midpoint(resolveEndpointPosition(link.source), resolveEndpointPosition(link.target));
  }

  for (const link of graph.links) {
    const source = resolveEndpoint(link.source);
    const target = resolveEndpoint(link.target);

    const rfEdge: ReactFlowEdgeLike = {
      id: link.id,
      source: source.nodeId,
      target: target.nodeId,
      type: link.type ?? edgeType,
      animated: link.animated ?? edgeAnimated,
      label: link.label,
      style: link.style,
      data: {
        ...(link.data ?? {}),
        __domainSource: link.source,
        __domainTarget: link.target,
      },
    };

    edges.push(rfEdge);
    edgeById.set(rfEdge.id, rfEdge);
  }

  return {
    nodes,
    edges,
    edgeAnchorNodeIds: Object.fromEntries(anchorByEdge.entries()),
  };
}
