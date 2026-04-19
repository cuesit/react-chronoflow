import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTimelineFlow } from "./reactflow-builder";
import type { TimelineFlowOptions, GapInfo } from "./reactflow-builder";
import { createDefaultNodeTypes } from "./reactflow-nodes";
import type {
  EventNodeProps,
  EventStackNodeProps,
  GapBreakNodeProps,
  SectionDividerNodeProps,
  SectionLabelNodeProps,
  AxisNodeProps,
  MarkerNodeProps,
  BandNodeProps,
} from "./reactflow-nodes";
import type { TimelineBandEvent, TimelinePointEvent, TimelineDate } from "./types";
import type { ReactNode } from "react";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TimelineFlowProps {
  events: TimelinePointEvent[];
  bands?: TimelineBandEvent[];

  // ─── Layout options ────────────────────────────────────────────────────
  maxGapDays?: number;
  compressionRatio?: number;
  clusterGapDays?: number;
  sectionGranularity?: "year" | "month";
  allExpanded?: boolean;
  left?: number;
  right?: number;
  axisY?: number;
  bandSubEvents?: Record<string, Array<{ id: string; title: string; date: TimelineDate }>>;

  // ─── Node customization ────────────────────────────────────────────────
  eventNodeProps?: Omit<EventNodeProps, "data">;
  eventStackNodeProps?: Omit<EventStackNodeProps, "data">;
  gapBreakNodeProps?: Omit<GapBreakNodeProps, "data">;
  sectionDividerNodeProps?: Omit<SectionDividerNodeProps, "data">;
  sectionLabelNodeProps?: Omit<SectionLabelNodeProps, "data">;
  axisNodeProps?: Omit<AxisNodeProps, "data">;
  markerNodeProps?: Omit<MarkerNodeProps, "data">;
  bandNodeProps?: Omit<BandNodeProps, "data">;
  /** Fully replace any node type with a custom component. */
  nodeTypes?: Record<string, React.ComponentType<{ data: Record<string, unknown> }>>;

  // ─── Container ─────────────────────────────────────────────────────────
  className?: string;
  height?: string | number;

  // ─── ReactFlow config ──────────────────────────────────────────────────
  minZoom?: number;
  maxZoom?: number;
  fitViewPadding?: number;
  fitViewDuration?: number;

  // ─── Callbacks ─────────────────────────────────────────────────────────
  onToggleGap?: (gapKey: string) => void;

  /**
   * Pass the @xyflow/react module. This avoids a hard import so the library
   * doesn't need @xyflow/react at build time.
   *
   * ```tsx
   * import * as xyflow from "@xyflow/react";
   * <TimelineFlow events={events} xyflow={xyflow} />
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  xyflow: Record<string, any>;

  /** Render extra children inside the ReactFlow (e.g., custom MiniMap, Controls). */
  children?: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TimelineFlow({
  events,
  bands = [],
  maxGapDays,
  compressionRatio,
  clusterGapDays,
  sectionGranularity,
  allExpanded,
  left,
  right,
  axisY,
  bandSubEvents,
  eventNodeProps,
  eventStackNodeProps,
  gapBreakNodeProps,
  sectionDividerNodeProps,
  sectionLabelNodeProps,
  axisNodeProps,
  markerNodeProps,
  bandNodeProps,
  nodeTypes: nodeTypeOverrides,
  className,
  height = "820px",
  minZoom = 0.1,
  maxZoom = 1.6,
  fitViewPadding = 0.12,
  fitViewDuration = 400,
  onToggleGap: onToggleGapProp,
  xyflow,
  children,
}: TimelineFlowProps) {
  const {
    ReactFlow: RF,
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    useReactFlow,
  } = xyflow;

  // Gap state
  const [expandedGapKeys, setExpandedGapKeys] = useState<Set<string>>(new Set());

  const handleToggleGap = useCallback(
    (gapKey: string) => {
      setExpandedGapKeys((prev) => {
        const next = new Set(prev);
        if (next.has(gapKey)) next.delete(gapKey);
        else next.add(gapKey);
        return next;
      });
      onToggleGapProp?.(gapKey);
    },
    [onToggleGapProp],
  );

  // Build layout
  const buildOptions: TimelineFlowOptions = useMemo(
    () => ({ maxGapDays, compressionRatio, clusterGapDays, sectionGranularity, expandedGapKeys, allExpanded, left, right, axisY, bandSubEvents }),
    [maxGapDays, compressionRatio, clusterGapDays, sectionGranularity, expandedGapKeys, allExpanded, left, right, axisY, bandSubEvents],
  );

  const graph = useMemo(() => buildTimelineFlow(events, bands, buildOptions), [events, bands, buildOptions]);

  // Inject onToggle into gap break node data
  const nodesWithCallbacks = useMemo(
    () => graph.nodes.map((node) => node.type === "gapBreak" ? { ...node, data: { ...node.data, onToggle: handleToggleGap } } : node),
    [graph.nodes, handleToggleGap],
  );

  // Node types
  const mergedNodeTypes = useMemo(() => {
    const Handle = xyflow.Handle;
    const defaults = createDefaultNodeTypes(Handle, {
      event: eventNodeProps as EventNodeProps,
      eventStack: eventStackNodeProps as EventStackNodeProps,
      gapBreak: { ...(gapBreakNodeProps as GapBreakNodeProps), onToggle: handleToggleGap },
      sectionDivider: sectionDividerNodeProps as SectionDividerNodeProps,
      sectionLabel: sectionLabelNodeProps as SectionLabelNodeProps,
      axis: axisNodeProps as AxisNodeProps,
      marker: markerNodeProps as MarkerNodeProps,
      band: bandNodeProps as BandNodeProps,
    });
    return { ...defaults, ...nodeTypeOverrides };
  }, [eventNodeProps, eventStackNodeProps, gapBreakNodeProps, sectionDividerNodeProps, sectionLabelNodeProps, axisNodeProps, markerNodeProps, bandNodeProps, nodeTypeOverrides, handleToggleGap]);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks as unknown[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges as unknown[]);
  const prevGapSig = useRef("");

  let fitView: ((opts?: Record<string, unknown>) => void) | null = null;
  try {
    if (useReactFlow) {
      const rf = useReactFlow();
      fitView = rf.fitView;
    }
  } catch {
    // Not inside ReactFlowProvider
  }

  useEffect(() => {
    setNodes(nodesWithCallbacks as unknown[]);
    setEdges(graph.edges as unknown[]);

    const sig = graph.gaps.map((g: GapInfo) => `${g.key}:${g.compressed}`).join(",");
    if (prevGapSig.current && prevGapSig.current !== sig && fitView) {
      const timer = setTimeout(() => fitView!({ padding: fitViewPadding, duration: fitViewDuration }), 50);
      prevGapSig.current = sig;
      return () => clearTimeout(timer);
    }
    prevGapSig.current = sig;
  }, [nodesWithCallbacks, graph.edges, graph.gaps, setNodes, setEdges, fitView, fitViewPadding, fitViewDuration]);

  const dotsVariant = BackgroundVariant ? (BackgroundVariant as Record<string, string>).Dots : "dots";

  return (
    <div className={className ?? "w-full overflow-hidden rounded-xl border border-slate-200 bg-white"} style={{ height }}>
      <RF
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={mergedNodeTypes}
        fitView
        fitViewOptions={{ padding: fitViewPadding, minZoom: 0.22 }}
        minZoom={minZoom}
        maxZoom={maxZoom}
        defaultEdgeOptions={{ type: "default" }}
      >
        {children ?? (
          <>
            {MiniMap && (
              <MiniMap
                pannable
                zoomable
                bgColor="#e2e8f0"
                maskColor="rgba(15, 23, 42, 0.14)"
                nodeColor={(node: { type?: string }) => {
                  if (node.type === "axis") return "#2563eb";
                  if (node.type === "band") return "#0ea5e9";
                  if (node.type === "sectionDivider") return "#94a3b8";
                  if (node.type === "sectionLabel") return "#64748b";
                  if (node.type === "marker") return "#1e293b";
                  if (node.type === "gapBreak") return "#94a3b8";
                  return "#f59e0b";
                }}
                nodeStrokeColor="#0f172a"
                nodeStrokeWidth={1}
              />
            )}
            {Controls && <Controls />}
            {Background && <Background variant={dotsVariant} gap={22} size={1.6} color="#94a3b8" />}
          </>
        )}
      </RF>
    </div>
  );
}
