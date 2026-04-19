// ─── TimelineFlow component ──────────────────────────────────────────────────
export { TimelineFlow } from "./TimelineFlow";
export type { TimelineFlowProps } from "./TimelineFlow";

// ─── Layout builder (headless) ───────────────────────────────────────────────
export { buildTimelineFlow, buildSections } from "./reactflow-builder";
export type {
  TimelineFlowOptions,
  TimelineFlowResult,
  SectionGranularity,
  GapInfo,
  Section,
  FlowNode,
  FlowEdge,
  TimelineFlowCluster,
  ParsedEvent,
  ParsedBand,
} from "./reactflow-builder";

// ─── Default node components ─────────────────────────────────────────────────
export {
  EventNode,
  EventStackNode,
  GapBreakNode,
  SectionDividerNode,
  SectionLabelNode,
  AxisNode,
  MarkerNode,
  BandNode,
  createDefaultNodeTypes,
} from "./reactflow-nodes";
export type {
  EventNodeProps,
  EventStackNodeProps,
  GapBreakNodeProps,
  SectionDividerNodeProps,
  SectionLabelNodeProps,
  AxisNodeProps,
  MarkerNodeProps,
  BandNodeProps,
} from "./reactflow-nodes";

// ─── Domain graph → ReactFlow adapter ────────────────────────────────────────
export { compileDomainToReactFlow } from "./reactflow-adapter";
export type {
  DomainGraph,
  DomainNode,
  DomainLink,
  DomainEndpoint,
  ReactFlowAdapterOptions,
  ReactFlowAdapterResult,
  ReactFlowNodeLike,
  ReactFlowEdgeLike,
} from "./reactflow-adapter";

// ─── Core types ──────────────────────────────────────────────────────────────
export type {
  TimelinePointEvent,
  TimelineBandEvent,
  TimelineDate,
  EventSide,
} from "./types";
