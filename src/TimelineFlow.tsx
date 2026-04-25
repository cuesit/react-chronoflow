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

type NodeSizeMap = Record<string, { width: number; height: number }>;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TimelineFlowProps {
  events: TimelinePointEvent[];
  bands?: TimelineBandEvent[];

  // ─── Layout options ────────────────────────────────────────────────────
  maxGapDays?: number;
  compressionRatio?: number;
  minCompressedGapWidth?: number;
  clusterGapDays?: number;
  /** How strongly event nodes resist horizontal drift from their marker. 0 = loose, 1 = stiff. Default: 0.9 */
  edgeStiffness?: number;
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
  /** Zoom into a node when it's clicked. Default: true */
  zoomOnNodeClick?: boolean;
  /** Zoom level when zooming into a clicked node. Default: 1 */
  zoomOnNodeClickZoom?: number;
  /** Duration (ms) of the zoom animation on node click. Default: 400 */
  zoomOnNodeClickDuration?: number;

  // ─── Callbacks ─────────────────────────────────────────────────────────
  onToggleGap?: (gapKey: string) => void;
  /** Called when the user confirms adding an event or band via the axis click flow. */
  onAddEvent?: (data: {
    title: string;
    date: Date;
    endDate?: Date;
    description?: string;
    lane?: string;
    tags?: string[];
    /** Band color (only for bands). */
    color?: string;
    /** Sub-events within the band. */
    subEvents?: Array<{ id: string; title: string; date: string }>;
    /** "event" for a point event, "band" if an end date was provided. */
    type: "event" | "band";
  }) => void;
  /** Called when the user deletes a user-created event or band (source === "user"). */
  onDeleteEvent?: (id: string) => void;
  /** Called when the user edits a user-created event. Receives the event ID and updated fields. */
  onEditEvent?: (id: string, updates: { title?: string; lane?: string; description?: string; tags?: string[] }) => void;
  /** Called when any node is clicked. Receives the node type, ID, and full data. */
  onNodeClick?: (nodeType: string, nodeId: string, data: Record<string, unknown>) => void;
  /** Called when mouse enters/leaves a node. Use to show custom overlays, tooltips, etc. */
  onNodeHover?: (nodeType: string, nodeId: string, data: Record<string, unknown>, hovered: boolean) => void;
  /** Render a custom overlay when a node is hovered. Rendered inside the node's DOM — no flash. */
  renderNodeOverlay?: (props: { nodeType: string; nodeId: string; data: Record<string, unknown> }) => ReactNode;

  // ─── Filtering ─────────────────────────────────────────────────────────
  /** Show the built-in filter bar. Default: false */
  showFilters?: boolean;
  /** Filter categories to show. Default: ["lane", "tag", "source"] */
  filterCategories?: Array<"lane" | "tag" | "source">;
  /** Externally controlled active filters. If provided, internal filter state is ignored. */
  activeFilters?: { lanes?: string[]; tags?: string[]; sources?: string[] };
  /** Called when filters change. */
  onFiltersChange?: (filters: { lanes: string[]; tags: string[]; sources: string[] }) => void;

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
  minCompressedGapWidth,
  clusterGapDays,
  edgeStiffness,
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
  zoomOnNodeClick = true,
  zoomOnNodeClickZoom = 1,
  zoomOnNodeClickDuration = 400,
  onToggleGap: onToggleGapProp,
  onAddEvent: onAddEventProp,
  onDeleteEvent: onDeleteEventProp,
  onEditEvent: onEditEventProp,
  onNodeClick: onNodeClickProp,
  onNodeHover: onNodeHoverProp,
  renderNodeOverlay,
  showFilters = false,
  filterCategories = ["lane", "tag", "source"],
  activeFilters: activeFiltersProp,
  onFiltersChange,
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

  // ReactFlow instance (for screenToFlowPosition, fitView, setCenter)
  let rfInstance: { fitView?: (opts?: Record<string, unknown>) => void; setCenter?: (x: number, y: number, opts?: Record<string, unknown>) => void; screenToFlowPosition?: (pos: { x: number; y: number }) => { x: number; y: number } } | null = null;
  try {
    if (useReactFlow) rfInstance = useReactFlow();
  } catch { /* not in provider */ }

  // ─── Filtering ──────────────────────────────────────────────────────────
  const [internalFilters, setInternalFilters] = useState<{ lanes: string[]; tags: string[]; sources: string[] }>({ lanes: [], tags: [], sources: [] });
  const filters = activeFiltersProp
    ? { lanes: activeFiltersProp.lanes ?? [], tags: activeFiltersProp.tags ?? [], sources: activeFiltersProp.sources ?? [] }
    : internalFilters;

  const setFilters = useCallback((next: { lanes: string[]; tags: string[]; sources: string[] }) => {
    if (!activeFiltersProp) setInternalFilters(next);
    onFiltersChange?.(next);
  }, [activeFiltersProp, onFiltersChange]);

  // Collect all unique filter values from events + bands
  const filterOptions = useMemo(() => {
    const lanes = new Set<string>();
    const tags = new Set<string>();
    const sources = new Set<string>();
    for (const e of events) {
      if (e.lane) lanes.add(e.lane);
      if (e.tags) e.tags.forEach((t) => tags.add(t));
      sources.add(e.source ?? "system");
    }
    for (const b of bands) {
      if (b.lane) lanes.add(b.lane);
      if (b.tags) b.tags.forEach((t) => tags.add(t));
      sources.add(b.source ?? "system");
    }
    return {
      lanes: Array.from(lanes).sort(),
      tags: Array.from(tags).sort(),
      sources: Array.from(sources).sort(),
    };
  }, [events, bands]);

  const toggleFilter = useCallback((category: "lanes" | "tags" | "sources", value: string) => {
    setFilters({
      ...filters,
      [category]: filters[category].includes(value)
        ? filters[category].filter((v) => v !== value)
        : [...filters[category], value],
    });
  }, [filters, setFilters]);

  // Apply filters — empty filter array = show all (no filtering)
  const hasActiveFilters = filters.lanes.length > 0 || filters.tags.length > 0 || filters.sources.length > 0;

  const filteredEvents = useMemo(() => {
    if (!hasActiveFilters) return events;
    return events.filter((e) => {
      if (filters.lanes.length > 0 && e.lane && !filters.lanes.includes(e.lane)) return false;
      if (filters.tags.length > 0 && (!e.tags || !e.tags.some((t) => filters.tags.includes(t)))) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(e.source ?? "system")) return false;
      return true;
    });
  }, [events, filters, hasActiveFilters]);

  const filteredBands = useMemo(() => {
    if (!hasActiveFilters) return bands;
    return bands.filter((b) => {
      if (filters.lanes.length > 0 && b.lane && !filters.lanes.includes(b.lane)) return false;
      if (filters.tags.length > 0 && (!b.tags || !b.tags.some((t) => filters.tags.includes(t)))) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(b.source ?? "system")) return false;
      return true;
    });
  }, [bands, filters, hasActiveFilters]);

  // Gap state
  const [expandedGapKeys, setExpandedGapKeys] = useState<Set<string>>(new Set());
  const [nodeSizes, setNodeSizes] = useState<NodeSizeMap>({});

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
    () => ({ maxGapDays, compressionRatio, minCompressedGapWidth, clusterGapDays, edgeStiffness, sectionGranularity, expandedGapKeys, allExpanded, left, right, axisY, bandSubEvents, nodeSizes }),
    [maxGapDays, compressionRatio, minCompressedGapWidth, clusterGapDays, edgeStiffness, sectionGranularity, expandedGapKeys, allExpanded, left, right, axisY, bandSubEvents, nodeSizes],
  );

  const graph = useMemo(() => buildTimelineFlow(filteredEvents, filteredBands, buildOptions), [filteredEvents, filteredBands, buildOptions]);

  // ─── Add-event state machine ────────────────────────────────────────────
  // null = idle, "ghost" = following cursor (DOM overlay, no re-renders),
  // "editing" = placed as real RF node with form
  const [addMode, setAddMode] = useState<null | "ghost" | "editing">(null);
  // Only used when addMode === "editing" — the confirmed placement position + date
  const [editPos, setEditPos] = useState<{ x: number; y: number; date: string; ts: number } | null>(null);

  const resolvedAxisY = graph.axisY;
  const axisLeft = graph.nodes.find((n) => n.id === "axis")?.position.x ?? 120;

  const containerRef = useRef<HTMLDivElement>(null);

  // Step 1: click axis → enter ghost mode
  const handleAxisClick = useCallback(
    (relativeX: number) => {
      if (!onAddEventProp) return;
      if (addMode != null) return;
      setAddMode("ghost");
    },
    [onAddEventProp, addMode],
  );

  // Step 2: ghost mode — inject into RF viewport (flow coordinate space = auto zoom/pan)
  useEffect(() => {
    if (addMode !== "ghost" || !containerRef.current) return;

    const container = containerRef.current;
    const viewport = container.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewport) return;

    // Build ghost elements via DOM API (inside viewport = flow coords = scales with zoom)
    const ghostCard = document.createElement("div");
    ghostCard.style.cssText = "position:absolute;left:0;top:0;display:none;pointer-events:none;z-index:60;";

    const cardInner = document.createElement("div");
    cardInner.className = "flex w-[160px] flex-col rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/80 px-3 py-2.5 shadow-sm backdrop-blur-sm";

    const dateDiv = document.createElement("div");
    dateDiv.className = "text-[10px] font-extrabold tracking-[0.08em] text-amber-700/60";
    dateDiv.textContent = "---";

    const rowDiv = document.createElement("div");
    rowDiv.className = "mt-1 flex items-center gap-1.5";

    const iconDiv = document.createElement("div");
    iconDiv.className = "flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/60 bg-white text-amber-500";
    const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    iconSvg.setAttribute("width", "10");
    iconSvg.setAttribute("height", "10");
    iconSvg.setAttribute("viewBox", "0 0 10 10");
    const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l1.setAttribute("x1", "5"); l1.setAttribute("y1", "1"); l1.setAttribute("x2", "5"); l1.setAttribute("y2", "9");
    l1.setAttribute("stroke", "currentColor"); l1.setAttribute("stroke-width", "1.8"); l1.setAttribute("stroke-linecap", "round");
    const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l2.setAttribute("x1", "1"); l2.setAttribute("y1", "5"); l2.setAttribute("x2", "9"); l2.setAttribute("y2", "5");
    l2.setAttribute("stroke", "currentColor"); l2.setAttribute("stroke-width", "1.8"); l2.setAttribute("stroke-linecap", "round");
    iconSvg.appendChild(l1);
    iconSvg.appendChild(l2);
    iconDiv.appendChild(iconSvg);

    const labelSpan = document.createElement("span");
    labelSpan.className = "text-[11px] font-semibold text-amber-700/50";
    labelSpan.textContent = "Click to place";

    rowDiv.appendChild(iconDiv);
    rowDiv.appendChild(labelSpan);
    cardInner.appendChild(dateDiv);
    cardInner.appendChild(rowDiv);
    ghostCard.appendChild(cardInner);

    const ghostDot = document.createElement("div");
    ghostDot.className = "pointer-events-none absolute rounded-full bg-amber-500";
    ghostDot.style.cssText = "width:8px;height:8px;display:none;z-index:60;";

    const ghostSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ghostSvg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:59;overflow:visible;width:1px;height:1px;";
    const ghostPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    ghostPath.setAttribute("stroke", "#d97706");
    ghostPath.setAttribute("stroke-width", "2");
    ghostPath.setAttribute("stroke-dasharray", "6 4");
    ghostPath.setAttribute("stroke-linecap", "round");
    ghostPath.setAttribute("opacity", "0.7");
    ghostPath.setAttribute("fill", "none");
    ghostSvg.appendChild(ghostPath);

    viewport.appendChild(ghostSvg);
    viewport.appendChild(ghostDot);
    viewport.appendChild(ghostCard);

    const axisYPx = resolvedAxisY + 3;
    const cardW = 160;
    const cardH = 70; // approximate ghost card height

    const onMouseMove = (e: MouseEvent) => {
      if (!rfInstance?.screenToFlowPosition) return;
      const flowPos = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const ts = graph.fromX(flowPos.x);
      const date = new Date(ts);
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

      // Cursor anchors to right corner of the card:
      // Above axis: cursor at bottom-right
      // Below axis: cursor at top-right
      const above = flowPos.y < axisYPx;
      const offsetX = -cardW;
      const offsetY = above ? -cardH : 0;

      ghostCard.style.transform = `translate(${flowPos.x + offsetX}px, ${flowPos.y + offsetY}px)`;
      ghostCard.style.display = "block";
      dateDiv.textContent = label;

      ghostDot.style.transform = `translate(${flowPos.x - 4}px, ${axisYPx - 4}px)`;
      ghostDot.style.display = "block";

      // Bezier connector from axis dot to the nearest card edge
      const endX = flowPos.x + offsetX + cardW / 2;
      const endY = above ? flowPos.y + offsetY + cardH : flowPos.y + offsetY;
      const dy = endY - axisYPx;
      const c1y = axisYPx + dy * 0.35;
      const c2y = endY - dy * 0.35;
      ghostPath.setAttribute("d", `M ${flowPos.x} ${axisYPx} C ${flowPos.x} ${c1y}, ${endX} ${c2y}, ${endX} ${endY}`);

      container.dataset.ghostFlowX = String(flowPos.x);
      container.dataset.ghostFlowY = String(flowPos.y);
      container.dataset.ghostDate = label;
      container.dataset.ghostTs = String(ts);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".react-flow__node") || target.closest("button") || target.closest("input")) return;

      const flowX = parseFloat(container.dataset.ghostFlowX ?? "0");
      const flowY = parseFloat(container.dataset.ghostFlowY ?? "0");
      const dateLabel = container.dataset.ghostDate ?? "";
      const ts = parseFloat(container.dataset.ghostTs ?? "0");

      setEditPos({ x: flowX, y: flowY, date: dateLabel, ts });
      setAddMode("editing");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAddMode(null); setEditPos(null); }
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      ghostCard.remove();
      ghostDot.remove();
      ghostSvg.remove();
    };
  }, [addMode, rfInstance, graph, resolvedAxisY]);

  // Escape during editing mode
  useEffect(() => {
    if (addMode !== "editing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAddMode(null); setEditPos(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMode]);

  // Track live date edits — use ref to avoid re-renders, update nodes imperatively
  const editDatesRef = useRef<{ startDate: string; endDate?: string } | null>(null);
  const setNodesRef = useRef<((updater: (prev: unknown[]) => unknown[]) => void) | null>(null);
  const setEdgesRef = useRef<((updater: (prev: unknown[]) => unknown[]) => void) | null>(null);

  const handleEditChange = useCallback((info: { startDate: string; endDate?: string }) => {
    editDatesRef.current = info;
    const setN = setNodesRef.current;
    const setE = setEdgesRef.current;
    if (!setN || !setE) return;

    // Imperatively update marker positions without triggering a full rebuild
    setN((prev: unknown[]) => {
      const nodes = prev as Array<Record<string, unknown>>;
      return nodes.map((node) => {
        if (node.id === "__add-event-marker__" && info.startDate) {
          const x = graph.toX(Date.parse(`${info.startDate}T00:00:00Z`));
          return { ...node, position: { x: x - 6, y: resolvedAxisY - 6 } };
        }
        if (node.id === "__add-event-marker-end__") {
          if (!info.endDate) return node; // will be removed separately
          const x = graph.toX(Date.parse(`${info.endDate}T00:00:00Z`));
          return { ...node, position: { x: x - 6, y: resolvedAxisY - 6 } };
        }
        return node;
      }) as never[];
    });

    // Add or remove the end marker + edge
    const hasEnd = !!info.endDate;
    setN((prev: unknown[]) => {
      const nodes = prev as Array<Record<string, unknown>>;
      const hasEndMarker = nodes.some((n) => n.id === "__add-event-marker-end__");
      if (hasEnd && !hasEndMarker) {
        const x = graph.toX(Date.parse(`${info.endDate!}T00:00:00Z`));
        return [...nodes, {
          id: "__add-event-marker-end__",
          type: "marker",
          position: { x: x - 6, y: resolvedAxisY - 6 },
          data: { side: editPos ? (editPos.y < resolvedAxisY ? "top" : "bottom") : "top" },
          draggable: false, selectable: false,
          style: { width: 12, height: 12, zIndex: 25 },
        }] as never[];
      }
      if (!hasEnd && hasEndMarker) {
        return nodes.filter((n) => n.id !== "__add-event-marker-end__") as never[];
      }
      return prev as never[];
    });

    setE((prev: unknown[]) => {
      const edges = prev as Array<Record<string, unknown>>;
      const hasEndEdge = edges.some((e) => e.id === "__add-event-edge-end__");
      if (hasEnd && !hasEndEdge) {
        return [...edges, {
          id: "__add-event-edge-end__",
          source: "__add-event-marker-end__",
          target: "__add-event-ghost__",
          sourceHandle: "timeline-source",
          targetHandle: "timeline-target",
          type: "default",
          animated: true,
          style: { stroke: "#2563eb", strokeWidth: 2, strokeDasharray: "6 4" },
        }] as never[];
      }
      if (!hasEnd && hasEndEdge) {
        return edges.filter((e) => e.id !== "__add-event-edge-end__") as never[];
      }
      return prev as never[];
    });
  }, [graph, resolvedAxisY, editPos]);

  // Build editing node — only rebuilt when entering edit mode, not on every date keystroke
  const addEventNodes = useMemo(() => {
    if (addMode !== "editing" || !editPos) return { nodes: [] as Record<string, unknown>[], edges: [] as Record<string, unknown>[] };

    const side = editPos.y < resolvedAxisY ? "top" : "bottom";
    const startMarkerX = editPos.x;

    const ghostNode = {
      id: "__add-event-ghost__",
      type: "addEvent",
      position: { x: editPos.x - 140, y: editPos.y - (side === "top" ? 80 : -10) },
      data: {
        mode: "editing",
        dateLabel: editPos.date,
        side,
        startTs: editPos.ts,
        onEditChange: handleEditChange,
        onConfirm: (title: string, description: string, lane: string, confirmedStartDate: string, endDate?: string, tags?: string[], color?: string, subEvts?: Array<{ id: string; title: string; date: string }>) => {
          const date = new Date(`${confirmedStartDate}T00:00:00Z`);
          const cleanTags = tags?.filter(Boolean);
          if (endDate) {
            onAddEventProp?.({ title, date, endDate: new Date(`${endDate}T00:00:00Z`), description: description || undefined, lane: lane || undefined, tags: cleanTags?.length ? cleanTags : undefined, color, subEvents: subEvts, type: "band" });
          } else {
            onAddEventProp?.({ title, date, description: description || undefined, lane: lane || undefined, tags: cleanTags?.length ? cleanTags : undefined, type: "event" });
          }
          setAddMode(null);
          setEditPos(null);
          editDatesRef.current = null;
        },
        onCancel: () => { setAddMode(null); setEditPos(null); editDatesRef.current = null; },
      },
      draggable: true,
      selectable: false,
      zIndex: 50,
      style: { width: 280, overflow: "visible" },
    };

    const startMarkerId = "__add-event-marker__";

    return {
      nodes: [
        ghostNode,
        {
          id: startMarkerId,
          type: "marker",
          position: { x: startMarkerX - 6, y: resolvedAxisY - 6 },
          data: { side },
          draggable: false, selectable: false,
          style: { width: 12, height: 12, zIndex: 25 },
        },
      ],
      edges: [
        {
          id: "__add-event-edge-start__",
          source: startMarkerId,
          target: "__add-event-ghost__",
          sourceHandle: "timeline-source",
          targetHandle: "timeline-target",
          type: "default",
          animated: true,
          style: { stroke: "#d97706", strokeWidth: 2, strokeDasharray: "6 4" },
        },
      ],
    };
  }, [addMode, editPos, resolvedAxisY, onAddEventProp, handleEditChange]);

  // Inject callbacks into node data
  const nodesWithCallbacks = useMemo(
    () => graph.nodes.map((node) => {
      const extra: Record<string, unknown> = {};

      if (node.type === "gapBreak") return { ...node, data: { ...node.data, onToggle: handleToggleGap } };
      if (node.type === "axis" && onAddEventProp) return { ...node, data: { ...node.data, onAxisClick: handleAxisClick, addModeActive: addMode != null } };

      // Inject renderNodeOverlay for event/eventStack/band nodes
      if (renderNodeOverlay && (node.type === "event" || node.type === "eventStack" || node.type === "band")) {
        extra.renderNodeOverlay = renderNodeOverlay;
        extra.nodeType = node.type;
        extra.nodeId = node.id;
      }

      // Inject edit + delete callbacks for user-created events
      if (node.type === "event" && node.data.source === "user") {
        if (onDeleteEventProp) extra.onDelete = () => onDeleteEventProp(node.data.eventId as string);
        if (onEditEventProp) extra.onEdit = (id: string, updates: Record<string, unknown>) => onEditEventProp(id, updates as { title?: string; lane?: string; description?: string; tags?: string[] });
      }
      if (node.type === "band" && node.data.source === "user" && onDeleteEventProp) {
        extra.onDelete = () => onDeleteEventProp(node.data.bandId as string);
      }

      return Object.keys(extra).length ? { ...node, data: { ...node.data, ...extra } } : node;
    }),
    [graph.nodes, handleToggleGap, handleAxisClick, onAddEventProp, onDeleteEventProp, onEditEventProp, renderNodeOverlay, addMode],
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
  setNodesRef.current = setNodes as unknown as (updater: (prev: unknown[]) => unknown[]) => void;
  setEdgesRef.current = setEdges as unknown as (updater: (prev: unknown[]) => unknown[]) => void;
  const prevGapSig = useRef("");
  const graphAxisY = graph.axisY;

  // Wrap onNodesChange to detect when event/stack nodes cross the axis
  const handleNodesChange = useCallback(
    (changes: unknown[]) => {
      onNodesChange(changes as never[]);

      // After applying changes, check if any event nodes crossed the axis
      setNodes((prevNodes: unknown[]) => {
        let edgesNeedUpdate = false;
        const updated = (prevNodes as Array<Record<string, unknown>>).map((node) => {
          if (node.type !== "event" && node.type !== "eventStack") return node;

          const pos = node.position as { x: number; y: number } | undefined;
          if (!pos) return node;

          const data = node.data as Record<string, unknown>;
          const currentSide = data.side as string;
          const nodeCenter = pos.y + 56; // approximate card half-height
          const newSide = nodeCenter < graphAxisY ? "top" : "bottom";

          if (newSide === currentSide) return node;

          edgesNeedUpdate = true;
          const targetPos = newSide === "top" ? "bottom" : "top";
          return {
            ...node,
            data: { ...data, side: newSide },
            targetPosition: targetPos,
          };
        });

        if (edgesNeedUpdate) {
          // Also flip the corresponding marker source handles
          const nodeIdToSide = new Map<string, string>();
          for (const n of updated as Array<Record<string, unknown>>) {
            if (n.type === "event" || n.type === "eventStack") {
              nodeIdToSide.set(n.id as string, (n.data as Record<string, unknown>).side as string);
            }
          }

          // Update markers: find markers whose edges target a flipped node
          const finalNodes = (updated as Array<Record<string, unknown>>).map((node) => {
            if (node.type !== "marker") return node;
            const markerId = node.id as string;
            // Find the edge from this marker
            const edge = (graph.edges as Array<{ source: string; target: string }>).find((e) => e.source === markerId);
            if (!edge) return node;
            const targetSide = nodeIdToSide.get(edge.target);
            if (!targetSide) return node;
            const data = node.data as Record<string, unknown>;
            if (data.side === targetSide) return node;
            const sourcePos = targetSide === "top" ? "top" : "bottom";
            return { ...node, data: { ...data, side: targetSide }, sourcePosition: sourcePos };
          });

          return finalNodes as never[];
        }

        return updated as never[];
      });
    },
    [onNodesChange, setNodes, graphAxisY, graph.edges],
  );

  const fitView = rfInstance?.fitView ?? null;

  const prevAddMode = useRef<string | null>(null);

  useEffect(() => {
    const allNodes = [...nodesWithCallbacks as unknown[], ...addEventNodes.nodes];
    const allEdges = [...graph.edges as unknown[], ...addEventNodes.edges];
    setNodes(allNodes);
    setEdges(allEdges);

    // Zoom to edit node when entering editing mode
    if (addMode === "editing" && prevAddMode.current !== "editing" && fitView && editPos) {
      const timer = setTimeout(() => {
        fitView({
          nodes: [{ id: "__add-event-ghost__" }],
          padding: 1.5,
          duration: 400,
          maxZoom: 1,
        });
      }, 80);
      prevAddMode.current = addMode;
      return () => clearTimeout(timer);
    }
    prevAddMode.current = addMode;

    const sig = graph.gaps.map((g: GapInfo) => `${g.key}:${g.compressed}`).join(",");
    if (prevGapSig.current && prevGapSig.current !== sig && fitView) {
      const timer = setTimeout(() => fitView({ padding: fitViewPadding, duration: fitViewDuration }), 50);
      prevGapSig.current = sig;
      return () => clearTimeout(timer);
    }
    prevGapSig.current = sig;
  }, [nodesWithCallbacks, graph.edges, graph.gaps, addEventNodes, addMode, editPos, setNodes, setEdges, fitView, fitViewPadding, fitViewDuration]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observed = new Map<Element, string>();
    const observer = new ResizeObserver((entries) => {
      setNodeSizes((prev) => {
        let changed = false;
        const next: NodeSizeMap = { ...prev };

        for (const entry of entries) {
          const id = observed.get(entry.target);
          if (!id) continue;

          const width = Math.round(entry.contentRect.width);
          const height = Math.round(entry.contentRect.height);
          if (width <= 0 || height <= 0) continue;

          const prior = next[id];
          if (!prior || Math.abs(prior.width - width) > 1 || Math.abs(prior.height - height) > 1) {
            next[id] = { width, height };
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    });

    const observeRenderedNodes = () => {
      const elements = container.querySelectorAll(".react-flow__node-event, .react-flow__node-eventStack");
      elements.forEach((el) => {
        if (observed.has(el)) return;
        const id = el.getAttribute("data-id");
        if (!id) return;
        observed.set(el, id);
        observer.observe(el);
      });
    };

    observeRenderedNodes();
    const mutationObserver = new MutationObserver(observeRenderedNodes);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [nodesWithCallbacks]);

  const dotsVariant = BackgroundVariant ? (BackgroundVariant as Record<string, string>).Dots : "dots";

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", overflow: "hidden", borderRadius: 12, border: className ? undefined : "1px solid #e2e8f0", background: className ? undefined : "#fff", height, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Filter bar */}
      {showFilters && (filterOptions.lanes.length > 0 || filterOptions.tags.length > 0 || filterOptions.sources.length > 1) && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, borderBottom: "1px solid #f1f5f9", padding: "8px 12px" }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8" }}>Filter</span>

          {filterCategories.includes("lane") && filterOptions.lanes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>Lane:</span>
              {filterOptions.lanes.map((lane) => {
                const active = filters.lanes.includes(lane);
                return (
                  <button key={`lane-${lane}`} type="button" onClick={() => toggleFilter("lanes", lane)}
                    style={{ borderRadius: 9999, padding: "2px 8px", fontSize: 10, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", border: `1px solid ${active ? "#60a5fa" : "#e2e8f0"}`, background: active ? "#eff6ff" : "#fff", color: active ? "#1d4ed8" : "#64748b" }}>
                    {lane}
                  </button>
                );
              })}
            </div>
          )}

          {filterCategories.includes("tag") && filterOptions.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>Tag:</span>
              {filterOptions.tags.map((tag) => {
                const active = filters.tags.includes(tag);
                return (
                  <button key={`tag-${tag}`} type="button" onClick={() => toggleFilter("tags", tag)}
                    style={{ borderRadius: 9999, padding: "2px 8px", fontSize: 10, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", border: `1px solid ${active ? "#34d399" : "#e2e8f0"}`, background: active ? "#ecfdf5" : "#fff", color: active ? "#047857" : "#64748b" }}>
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {filterCategories.includes("source") && filterOptions.sources.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>Source:</span>
              {filterOptions.sources.map((src) => {
                const active = filters.sources.includes(src);
                return (
                  <button key={`source-${src}`} type="button" onClick={() => toggleFilter("sources", src)}
                    style={{ borderRadius: 9999, padding: "2px 8px", fontSize: 10, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize", border: `1px solid ${active ? "#a78bfa" : "#e2e8f0"}`, background: active ? "#f5f3ff" : "#fff", color: active ? "#6d28d9" : "#64748b" }}>
                    {src}
                  </button>
                );
              })}
            </div>
          )}

          {hasActiveFilters && (
            <button type="button" onClick={() => setFilters({ lanes: [], tags: [], sources: [] })}
              style={{ borderRadius: 9999, border: "1px solid #e2e8f0", padding: "2px 8px", fontSize: 10, fontWeight: 500, color: "#94a3b8", cursor: "pointer", background: "transparent" }}>
              Clear all
            </button>
          )}
        </div>
      )}
      <div style={{ position: "relative", minHeight: 0, flex: 1 }}>
      <RF
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_: unknown, node: Record<string, unknown>) => {
          console.log("[TimelineFlow] onNodeClick fired", { id: node.id, type: node.type, position: node.position, style: node.style, hasSetCenter: !!rfInstance?.setCenter, zoomOnNodeClick });
          if (onNodeClickProp) {
            onNodeClickProp(node.type as string, node.id as string, node.data as Record<string, unknown>);
          }
          if (zoomOnNodeClick && rfInstance?.setCenter) {
            const pos = node.position as { x: number; y: number } | undefined;
            const style = node.style as { width?: number | string; height?: number | string } | undefined;
            const w = typeof style?.width === "number" ? style.width : 160;
            const h = typeof style?.height === "number" ? style.height : 80;
            if (pos) {
              rfInstance.setCenter(pos.x + w / 2, pos.y + h / 2, {
                zoom: zoomOnNodeClickZoom,
                duration: zoomOnNodeClickDuration,
              });
            }
          }
        }}
        onNodeMouseEnter={onNodeHoverProp ? (_: unknown, node: Record<string, unknown>) => {
          onNodeHoverProp(node.type as string, node.id as string, node.data as Record<string, unknown>, true);
        } : undefined}
        onNodeMouseLeave={onNodeHoverProp ? (_: unknown, node: Record<string, unknown>) => {
          onNodeHoverProp(node.type as string, node.id as string, node.data as Record<string, unknown>, false);
        } : undefined}
        nodeTypes={mergedNodeTypes}
        fitView
        fitViewOptions={{ padding: fitViewPadding, minZoom: 0.22 }}
        minZoom={minZoom}
        maxZoom={maxZoom}
        defaultEdgeOptions={{ type: "default" }}
        proOptions={{ hideAttribution: true }}
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
                  if (node.type === "todayMarker") return "#ef4444";
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
    </div>
  );
}
