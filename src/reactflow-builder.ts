import type { TimelineBandEvent, TimelinePointEvent, TimelineDate } from "./types";

// ─── Public types ────────────────────────────────────────────────────────────

export type SectionGranularity = "year" | "month";

export interface TimelineFlowOptions {
  /** Gaps longer than this (days) get a compress/expand break marker. Default: 90 */
  maxGapDays?: number;
  /** How much to shrink compressed gaps (0 = fully collapsed, 1 = no compression). Default: 0.06 */
  compressionRatio?: number;
  /** Minimum rendered width for a compressed gap in pixels. Default: 100 */
  minCompressedGapWidth?: number;
  /** Events within this many days cluster into a stack node. Default: 18 */
  clusterGapDays?: number;
  /** How strongly event nodes resist horizontal drift from their marker. 0 = loose, 1 = stiff. Default: 0.9 */
  edgeStiffness?: number;
  /** Section granularity for dividers/labels. Default: "year" */
  sectionGranularity?: SectionGranularity;
  /** Gap keys that are forced expanded (overrides compression). */
  expandedGapKeys?: Set<string>;
  /** When true, all gaps are expanded (no compression). Default: false */
  allExpanded?: boolean;
  /** Left pixel bound of the timeline. Default: 120 */
  left?: number;
  /** Right pixel bound of the timeline. Default: 3320 */
  right?: number;
  /** Y position of the timeline axis. Default: 520 */
  axisY?: number;
  /** Sub-events keyed by band ID. */
  bandSubEvents?: Record<string, Array<{ id: string; title: string; date: TimelineDate }>>;
  /** Measured ReactFlow node sizes keyed by node ID. Used to refine event placement after first render. */
  nodeSizes?: Record<string, { width: number; height: number }>;
}

export interface GapInfo {
  key: string;
  startTs: number;
  endTs: number;
  gapDays: number;
  compressed: boolean;
}

export interface Section {
  id: string;
  start: number;
  end: number;
  label: string;
}

export interface TimelineFlowCluster {
  id: string;
  preferredSide: "top" | "bottom";
  markerX: number;
  events: Array<ParsedEvent>;
  cardW: number;
  cardH: number;
  minTs: number;
  maxTs: number;
}

export interface ParsedEvent extends Omit<TimelinePointEvent, "side" | "style"> {
  side: "top" | "bottom";
  ts: number;
  style?: Record<string, unknown>;
}

export interface ParsedBand extends Omit<TimelineBandEvent, "style"> {
  startMs: number;
  endMs: number;
  style?: Record<string, unknown>;
}

/** Fully positioned node ready for ReactFlow. */
export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  draggable: boolean;
  selectable: boolean;
  zIndex?: number;
  style?: Record<string, unknown>;
  sourcePosition?: "top" | "bottom" | "left" | "right";
  targetPosition?: "top" | "bottom" | "left" | "right";
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  markerEnd?: Record<string, unknown>;
}

export interface TimelineFlowResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  gaps: GapInfo[];
  sections: Section[];
  /** Timestamp → X pixel mapping function */
  toX: (ts: number) => number;
  /** X pixel → timestamp inverse mapping function */
  fromX: (x: number) => number;
  minTs: number;
  maxTs: number;
  /** Y position of the timeline axis in pixels. */
  axisY: number;
}

// ─── Internals ───────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMs(dateValue: TimelineDate): number {
  if (typeof dateValue === "number") return dateValue;
  if (dateValue instanceof Date) return dateValue.getTime();
  return Date.parse(`${dateValue}T00:00:00Z`);
}

function formatEventDate(dateValue: TimelineDate): string {
  const d = new Date(toUtcMs(dateValue));
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

function formatSectionLabel(startMs: number, granularity: SectionGranularity): string {
  const d = new Date(startMs);
  if (granularity === "year") return `${d.getUTCFullYear()}`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

function estimatePillRows(width: number, labels: string[]): number {
  const innerWidth = Math.max(1, width - 24);
  let rows = 1;
  let rowWidth = 0;

  for (const label of labels) {
    const pillWidth = Math.min(innerWidth, Math.max(44, label.length * 6 + 18));
    const nextWidth = rowWidth === 0 ? pillWidth : rowWidth + 4 + pillWidth;
    if (nextWidth > innerWidth) {
      rows += 1;
      rowWidth = pillWidth;
    } else {
      rowWidth = nextWidth;
    }
  }

  return rows;
}

function estimateEventCardHeight(event: Pick<TimelinePointEvent, "title" | "lane" | "tags">, width: number): number {
  const innerWidth = Math.max(1, width - 24);
  const titleCharsPerLine = Math.max(12, Math.floor(innerWidth / 7.2));
  const titleLines = Math.max(1, Math.ceil(event.title.length / titleCharsPerLine));
  const pillLabels = [event.lane, ...(event.tags ?? [])].filter((label): label is string => Boolean(label));
  const pillRows = pillLabels.length > 0 ? estimatePillRows(width, pillLabels) : 0;

  return 16 + 12 + 4 + titleLines * 17 + (pillRows > 0 ? 8 + pillRows * 24 : 0);
}

function estimateStackCardHeight(event: Pick<TimelinePointEvent, "title" | "lane">, width: number): number {
  const innerWidth = Math.max(1, width - 24);
  const titleCharsPerLine = Math.max(12, Math.floor(innerWidth / 7.2));
  const titleLines = Math.max(1, Math.ceil(event.title.length / titleCharsPerLine));

  return 16 + 18 + 4 + titleLines * 17 + (event.lane ? 8 + 24 : 0);
}

export function buildSections(minMs: number, maxMs: number, granularity: SectionGranularity): Section[] {
  const sections: Section[] = [];

  if (granularity === "year") {
    const startYear = new Date(minMs).getUTCFullYear();
    const endYear = new Date(maxMs).getUTCFullYear();
    for (let y = startYear; y <= endYear; y += 1) {
      sections.push({ id: `sec-year-${y}`, start: Date.UTC(y, 0, 1), end: Date.UTC(y + 1, 0, 1), label: String(y) });
    }
    return sections;
  }

  const startDate = new Date(minMs);
  const endDate = new Date(maxMs);
  let y = startDate.getUTCFullYear();
  let m = startDate.getUTCMonth();

  while (y < endDate.getUTCFullYear() || (y === endDate.getUTCFullYear() && m <= endDate.getUTCMonth())) {
    const start = Date.UTC(y, m, 1);
    const nextM = m === 11 ? 0 : m + 1;
    const nextY = m === 11 ? y + 1 : y;
    const end = Date.UTC(nextY, nextM, 1);
    sections.push({ id: `sec-month-${y}-${m + 1}`, start, end, label: formatSectionLabel(start, "month") });
    y = nextY;
    m = nextM;
  }

  return sections;
}

// ─── Main builder ────────────────────────────────────────────────────────────

export function buildTimelineFlow(
  events: TimelinePointEvent[],
  bands: TimelineBandEvent[],
  options: TimelineFlowOptions = {},
): TimelineFlowResult {
  const maxGapDays = options.maxGapDays ?? 90;
  const compressionRatio = options.compressionRatio ?? 0.02;
  const minCompressedGapWidth = options.minCompressedGapWidth ?? 100;
  const clusterGapDays = options.clusterGapDays ?? 18;
  const edgeStiffness = Math.max(0, Math.min(1, options.edgeStiffness ?? 0.9));
  const sectionGranularity = options.sectionGranularity ?? "year";
  const expandedGapKeys = options.expandedGapKeys ?? new Set<string>();
  const allExpanded = options.allExpanded ?? false;
  const left = options.left ?? 120;
  const right = options.right ?? 3320;
  const axisY = options.axisY ?? 520;
  const bandSubEvents = options.bandSubEvents ?? {};
  const nodeSizes = options.nodeSizes ?? {};

  // Parse events
  const parsedEvents: ParsedEvent[] = events.map((event, idx) => {
    const { style, ...rest } = event;
    return {
      ...rest,
      ts: toUtcMs(event.date),
      side: event.side === "top" || event.side === "bottom" ? event.side : idx % 2 === 0 ? "top" : "bottom",
      style: style as Record<string, unknown> | undefined,
    };
  });

  // Parse bands
  const parsedBands: ParsedBand[] = bands.map((band) => {
    const { style, ...rest } = band;
    const startMs = toUtcMs(band.start);
    const endMs = toUtcMs(band.end);
    return { ...rest, startMs: Math.min(startMs, endMs), endMs: Math.max(startMs, endMs), style: style as Record<string, unknown> | undefined };
  });

  const nowTs = Date.now();
  const allTs = [
    ...parsedEvents.map((e) => e.ts),
    ...parsedBands.flatMap((b) => [b.startMs, b.endMs]),
  ];
  // Include today so the timeline always extends to cover it
  if (allTs.length > 0 && nowTs >= Math.min(...allTs)) {
    allTs.push(nowTs);
  }
  const rawMinTs = Math.min(...allTs);
  const rawMaxTs = Math.max(...allTs);
  const rawSpan = Math.max(DAY_MS, rawMaxTs - rawMinTs);
  const domainPad = Math.min(90 * DAY_MS, Math.max(7 * DAY_MS, rawSpan * 0.01));
  const minTs = rawMinTs - domainPad;
  const maxTs = rawMaxTs + domainPad;

  // Anchor timestamps
  const anchorTs = Array.from(
    new Set<number>([minTs, maxTs + DAY_MS, ...parsedEvents.map((e) => e.ts), ...parsedBands.flatMap((b) => [b.startMs, b.endMs]), nowTs]),
  ).sort((a, b) => a - b);

  // Build segments with gap compression
  const gaps: GapInfo[] = [];
  const segments: Array<{ start: number; end: number; vStart: number; vSpan: number; compressed: boolean }> = [];
  let virtualCursor = 0;

  for (let i = 1; i < anchorTs.length; i += 1) {
    const start = anchorTs[i - 1];
    const end = anchorTs[i];
    const gapDays = Math.max(0, (end - start) / DAY_MS);
    const gapKey = `${start}-${end}`;
    const isCandidate = gapDays > maxGapDays;
    const expanded = allExpanded || expandedGapKeys.has(gapKey);
    const compressed = isCandidate && !expanded;

    const vSpan = compressed ? gapDays * compressionRatio : gapDays;

    if (isCandidate) {
      gaps.push({ key: gapKey, startTs: start, endTs: end, gapDays, compressed });
    }

    segments.push({ start, end, vStart: virtualCursor, vSpan, compressed });
    virtualCursor += vSpan;
  }

  if (minCompressedGapWidth > 0 && segments.some((segment) => segment.compressed)) {
    const timelineWidth = Math.max(1, right - left);

    for (let pass = 0; pass < 8; pass += 1) {
      const domain = Math.max(1, segments.reduce((sum, segment) => sum + segment.vSpan, 0));
      const minVirtualSpan = (minCompressedGapWidth / timelineWidth) * domain;
      let changed = false;

      for (const segment of segments) {
        if (segment.compressed && segment.vSpan < minVirtualSpan) {
          segment.vSpan = minVirtualSpan;
          changed = true;
        }
      }

      if (!changed) break;
    }

    virtualCursor = 0;
    for (const segment of segments) {
      segment.vStart = virtualCursor;
      virtualCursor += segment.vSpan;
    }
  }

  const virtualDomain = Math.max(1, virtualCursor);

  const toVirtual = (ts: number): number => {
    if (segments.length === 0) return 0;
    if (ts <= segments[0].start) return 0;
    const last = segments[segments.length - 1];
    if (ts >= last.end) return last.vStart + last.vSpan;
    for (const seg of segments) {
      if (ts <= seg.end) {
        const ratio = seg.end === seg.start ? 0 : (ts - seg.start) / (seg.end - seg.start);
        return seg.vStart + seg.vSpan * ratio;
      }
    }
    return last.vStart + last.vSpan;
  };

  const toX = (ts: number): number => left + (toVirtual(ts) / virtualDomain) * (right - left);

  // Inverse: pixel X → timestamp
  const fromX = (x: number): number => {
    const vPos = ((x - left) / (right - left)) * virtualDomain;
    // Find the segment containing this virtual position
    for (const seg of segments) {
      const segEnd = seg.vStart + seg.vSpan;
      if (vPos <= segEnd || seg === segments[segments.length - 1]) {
        const ratio = seg.vSpan === 0 ? 0 : (vPos - seg.vStart) / seg.vSpan;
        return seg.start + Math.max(0, Math.min(1, ratio)) * (seg.end - seg.start);
      }
    }
    return minTs;
  };

  const rfNodes: FlowNode[] = [];
  const rfEdges: FlowEdge[] = [];

  // ─── Sections (merge compressed spans) ─────────────────────────────────

  const rawSections = buildSections(minTs, maxTs, sectionGranularity);
  const dividerTop = 72;
  const dividerHeight = 760;
  const sectionLabelY = 858;

  // Determine if a section falls entirely within a compressed gap.
  const isSectionCompressed = (section: Section): boolean =>
    gaps.some((g) => g.compressed && g.startTs <= section.start && g.endTs >= section.end);

  // Merge consecutive compressed sections into a single range label.
  const mergedSections: Section[] = [];
  let mergeRun: Section[] = [];

  const flushMerge = () => {
    if (mergeRun.length === 0) return;
    if (mergeRun.length === 1) {
      mergedSections.push(mergeRun[0]);
    } else {
      const firstLabel = mergeRun[0].label;
      const lastLabel = mergeRun[mergeRun.length - 1].label;
      mergedSections.push({
        id: `${mergeRun[0].id}--${mergeRun[mergeRun.length - 1].id}`,
        start: mergeRun[0].start,
        end: mergeRun[mergeRun.length - 1].end,
        label: firstLabel === lastLabel ? firstLabel : `${firstLabel} – ${lastLabel}`,
      });
    }
    mergeRun = [];
  };

  for (const section of rawSections) {
    if (isSectionCompressed(section)) {
      mergeRun.push(section);
    } else {
      flushMerge();
      mergedSections.push(section);
    }
  }
  flushMerge();

  // Render dividers at merged section boundaries.
  const boundaries = [...mergedSections.map((s) => s.start), mergedSections.length > 0 ? mergedSections[mergedSections.length - 1].end : maxTs + DAY_MS];

  boundaries.forEach((boundaryTs, idx) => {
    const bx = toX(Math.max(minTs, Math.min(maxTs + DAY_MS, boundaryTs)));
    rfNodes.push({
      id: `section-boundary-${idx}`,
      type: "sectionDivider",
      position: { x: bx - 1, y: dividerTop },
      data: {},
      draggable: false,
      selectable: false,
      zIndex: 3,
      style: { width: 2, height: dividerHeight },
    });
  });

  // Build label positions first, then stagger any that overlap
  const labelHeight = 20;
  const labelGap = 3;
  const labelEntries: Array<{ section: Section; x: number; w: number; y: number }> = [];

  mergedSections.forEach((section) => {
    const x1 = toX(Math.max(minTs, section.start));
    const x2 = toX(Math.min(maxTs + DAY_MS, section.end));
    const centerX = (x1 + x2) / 2;
    const labelWidth = section.label.length > 6 ? 116 : 76;
    const lx = centerX - labelWidth / 2;

    // Check if this label overlaps any already-placed label at the same Y row
    let row = 0;
    let placed = false;
    while (!placed) {
      const y = sectionLabelY + row * (labelHeight + labelGap);
      const collides = labelEntries.some(
        (e) => e.y === y && lx < e.x + e.w + labelGap && lx + labelWidth > e.x - labelGap,
      );
      if (!collides) {
        labelEntries.push({ section, x: lx, w: labelWidth, y });
        placed = true;
      } else {
        row += 1;
      }
    }
  });

  labelEntries.forEach(({ section, x, w, y }) => {
    rfNodes.push({
      id: `${section.id}-label`,
      type: "sectionLabel",
      position: { x, y },
      data: { label: section.label },
      draggable: false,
      selectable: false,
      zIndex: 12,
      style: { width: w, pointerEvents: "none" },
    });
  });

  // ─── Axis ──────────────────────────────────────────────────────────────

  rfNodes.push({
    id: "axis",
    type: "axis",
    position: { x: left, y: axisY },
    data: { left, right, axisY },
    draggable: false,
    selectable: false,
    style: { width: right - left, height: 6, zIndex: 5, pointerEvents: "all", overflow: "visible" },
  });

  // ─── Today indicator ────────────────────────────────────────────────────

  // Today indicator — always show if today is within the timeline range
  if (nowTs >= minTs) {
    const todayX = toX(nowTs);
    rfNodes.push({
      id: "__today__",
      type: "todayMarker",
      position: { x: todayX - 1, y: dividerTop },
      data: { label: "Today" },
      draggable: false,
      selectable: false,
      zIndex: 45,
      style: { width: 2, height: dividerHeight, overflow: "visible", pointerEvents: "none" },
    });
  }

  // ─── Gap breaks ────────────────────────────────────────────────────────

  const breakSize = 28;
  for (const gap of gaps) {
    const gapCenterX = (toX(gap.startTs) + toX(gap.endTs)) / 2;
    const fromDate = formatEventDate(gap.startTs);
    const toDate = formatEventDate(gap.endTs);
    const daysLabel = Math.round(gap.gapDays);

    rfNodes.push({
      id: `gap-break-${gap.key}`,
      type: "gapBreak",
      position: { x: gapCenterX - breakSize / 2, y: axisY - breakSize / 2 + 3 },
      data: {
        compressed: gap.compressed,
        gapKey: gap.key,
        label: `${fromDate} — ${toDate} (${daysLabel} days)`,
        startTs: gap.startTs,
        endTs: gap.endTs,
        gapDays: gap.gapDays,
      },
      draggable: false,
      selectable: false,
      zIndex: 35,
      style: { width: breakSize, height: breakSize, pointerEvents: "all" },
    });
  }

  // ─── Bands ─────────────────────────────────────────────────────────────

  const sortedBands = [...parsedBands].sort((a, b) => a.startMs - b.startMs);
  const bandHeight = 84;
  const bandGap = 14;
  const bandOffsetFromAxis = 112;
  const bandBounds: Array<{ x1: number; x2: number; y: number; side: "top" | "bottom" }> = [];

  // Track occupied X ranges per row, separately for top and bottom
  const topRowLastX2: number[] = [];
  const bottomRowLastX2: number[] = [];

  sortedBands.forEach((band) => {
    const x1 = toX(band.startMs);
    const x2 = toX(band.endMs);
    const startLabel = formatEventDate(band.start);
    const endLabel = formatEventDate(band.end);
    const subEvents = bandSubEvents[band.id] ?? [];
    const subEventPoints = subEvents.map((sub) => ({ ...sub, ts: toUtcMs(sub.date) }));
    const connectorPoints = [
      { id: "start", ts: band.startMs },
      { id: "end", ts: band.endMs },
      ...subEventPoints.map((sub) => ({ id: `sub-${sub.id}`, ts: sub.ts })),
    ];
    const connectorHandles = connectorPoints.map((point) => {
      const ratio = band.endMs === band.startMs ? 0.5 : (point.ts - band.startMs) / (band.endMs - band.startMs);
      return { id: `band-handle-${band.id}-${point.id}`, ratio, ts: point.ts, pointId: point.id };
    });

    // Find the best row: try top first (row 0), then bottom (row 0), then top row 1, etc.
    let bestSide: "top" | "bottom" = "top";
    let bestRow = 0;
    let placed = false;

    for (let tryRow = 0; tryRow < 10 && !placed; tryRow++) {
      // Try top
      if (topRowLastX2[tryRow] === undefined || x1 > topRowLastX2[tryRow] + 24) {
        bestSide = "top";
        bestRow = tryRow;
        topRowLastX2[tryRow] = x2;
        placed = true;
        break;
      }
      // Try bottom
      if (bottomRowLastX2[tryRow] === undefined || x1 > bottomRowLastX2[tryRow] + 24) {
        bestSide = "bottom";
        bestRow = tryRow;
        bottomRowLastX2[tryRow] = x2;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Fallback: stack on top
      bestSide = "top";
      bestRow = topRowLastX2.length;
      topRowLastX2[bestRow] = x2;
    }

    const bandY = bestSide === "top"
      ? axisY - bandOffsetFromAxis - bestRow * (bandHeight + bandGap)
      : axisY + bandOffsetFromAxis - bandHeight + bestRow * (bandHeight + bandGap);

    bandBounds.push({ x1, x2, y: bandY, side: bestSide });

    rfNodes.push({
      id: `band-${band.id}`,
      type: "band",
      position: { x: x1, y: bandY },
      data: {
        bandId: band.id,
        label: band.title,
        subtitle: band.lane ? `${band.lane} • ${startLabel} -> ${endLabel}` : `${startLabel} -> ${endLabel}`,
        color: band.color,
        source: band.source,
        tags: band.tags,
        subEvents: subEventPoints.map((sub) => ({
          ...sub,
          date: formatEventDate(sub.date),
          ratio: band.endMs === band.startMs ? 0.5 : (sub.ts - band.startMs) / (band.endMs - band.startMs),
        })),
        connectorHandles: connectorHandles.map((h) => ({ id: h.id, ratio: h.ratio })),
        bandSide: bestSide,
      },
      draggable: false,
      selectable: true,
      style: { width: Math.max(220, x2 - x1), height: bandHeight, zIndex: 20, pointerEvents: "all", overflow: "visible" },
    });

    connectorHandles.forEach((handle) => {
      const markerId = `band-marker-${band.id}-${handle.pointId}`;
      const markerX = toX(handle.ts);
      rfNodes.push({
        id: markerId,
        type: "marker",
        position: { x: markerX - 6, y: axisY - 6 },
        data: { side: bestSide },
        draggable: false,
        selectable: false,
        style: { width: 12, height: 12, zIndex: 25 },
      });

      rfEdges.push({
        id: `band-edge-${band.id}-${handle.pointId}`,
        source: markerId,
        target: `band-${band.id}`,
        sourceHandle: "timeline-source",
        targetHandle: handle.id,
        type: "default",
        animated: false,
        style: { stroke: band.color ?? "#0ea5e9", strokeWidth: 2, strokeDasharray: "4 5" },
        markerEnd: { type: "arrowclosed", width: 12, height: 12, color: band.color ?? "#0ea5e9" },
      });
    });
  });

  // ─── Event clustering ──────────────────────────────────────────────────

  const sorted = [...parsedEvents].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
  const clusters: TimelineFlowCluster[] = [];
  const concentrationGapMs = clusterGapDays * DAY_MS;

  let current: TimelineFlowCluster | null = null;
  for (const event of sorted) {
    const markerX = toX(event.ts);
    const cardW = Math.max(180, Math.min(280, 120 + event.title.length * 4.2));
    const cardH = estimateEventCardHeight(event, cardW);

    if (current && event.ts - current.minTs <= concentrationGapMs) {
      const nextCount = current.events.length + 1;
      current.events.push(event);
      current.markerX = (current.markerX * (nextCount - 1) + markerX) / nextCount;
      current.cardW = Math.max(current.cardW, cardW);
      current.cardH = Math.max(current.cardH, cardH);
      current.maxTs = event.ts;
      const topCount = current.events.filter((e) => e.side === "top").length;
      current.preferredSide = topCount >= current.events.length - topCount ? "top" : "bottom";
    } else {
      current = {
        id: `cluster-${event.id}`,
        preferredSide: event.side,
        markerX,
        events: [event],
        cardW,
        cardH: cardH,
        minTs: event.ts,
        maxTs: event.ts,
      };
      clusters.push(current);
    }
  }

  clusters.sort((a, b) => a.minTs - b.minTs || a.id.localeCompare(b.id));

  // ─── Event placement (collision avoidance) ─────────────────────────────

  const placedCards: Array<{ side: "top" | "bottom"; x1: number; x2: number; y1: number; y2: number }> = [];

  for (const cluster of clusters) {
    const markerX = cluster.markerX;
    const isStack = cluster.events.length > 1;
    const nodeId = isStack ? `event-stack-${cluster.id}` : `event-${cluster.events[0].id}`;
    const measuredSize = nodeSizes[nodeId];
    const cardW = measuredSize?.width ?? cluster.cardW;
    const cardH = measuredSize?.height ?? (
      isStack
        ? estimateStackCardHeight(cluster.events[0], cardW)
        : cluster.cardH
    );
    const preferredSides: Array<"top" | "bottom"> =
      cluster.preferredSide === "top" ? ["top", "bottom"] : ["bottom", "top"];

    const layerGap = 28;
    const maxLevels = 9;
    const offsetSteps = [0, -28, 28, -56, 56, -84, 84, -120, 120, -160, 160, -220, 220, -300, 300, -400, 400];
    let placed: { side: "top" | "bottom"; xCenter: number; y: number } | null = null;

    const collides = (c: { side: "top" | "bottom"; x1: number; x2: number; y1: number; y2: number }) =>
      placedCards.some((card) => {
        if (card.side !== c.side) return false;
        return c.x1 <= card.x2 + 14 && c.x2 >= card.x1 - 14 && c.y1 <= card.y2 + 8 && c.y2 >= card.y1 - 8;
      });

    // Compute safe Y positions based on bands that overlap this card's X range
    const localBaseY = (x1: number, x2: number, side: "top" | "bottom") => {
      let topBandMinY = Number.POSITIVE_INFINITY;
      let bottomBandMaxY = -Number.POSITIVE_INFINITY;
      for (const b of bandBounds) {
        if (x1 <= b.x2 + 12 && x2 >= b.x1 - 12) {
          if (b.side === "top") topBandMinY = Math.min(topBandMinY, b.y);
          else bottomBandMaxY = Math.max(bottomBandMaxY, b.y + bandHeight);
        }
      }
      if (side === "top") {
        return topBandMinY === Number.POSITIVE_INFINITY ? axisY - cardH - 28 : topBandMinY - cardH - 18;
      }
      return bottomBandMaxY === -Number.POSITIVE_INFINITY ? axisY + 28 : bottomBandMaxY + 18;
    };

    const stackedY = (x1: number, x2: number, side: "top" | "bottom", baseY: number) => {
      const xCenter = (x1 + x2) / 2;
      const overlappingCards = placedCards
        .filter((card) => {
          if (card.side !== side) return false;
          const cardCenter = (card.x1 + card.x2) / 2;
          const hasOverlap = x1 <= card.x2 + 14 && x2 >= card.x1 - 14;
          const nearColumn = Math.abs(xCenter - cardCenter) <= Math.max(card.x2 - card.x1, x2 - x1) * 0.72;
          return hasOverlap || nearColumn;
        })
        .sort((a, b) => side === "top" ? b.y1 - a.y1 : a.y2 - b.y2);

      let y = baseY;
      for (const card of overlappingCards) {
        if (side === "top") {
          const nextY = card.y1 - cardH - layerGap;
          if (y + cardH + layerGap > card.y1) y = nextY;
        } else {
          const nextY = card.y2 + layerGap;
          if (y < card.y2 + layerGap) y = nextY;
        }
      }

      return y;
    };

    const candidates: Array<{
      side: "top" | "bottom";
      xCenter: number;
      y: number;
      box: { side: "top" | "bottom"; x1: number; x2: number; y1: number; y2: number };
      score: number;
    }> = [];

    preferredSides.forEach((side, sideIndex) => {
      for (const offset of offsetSteps) {
        const rawXCenter = markerX + offset;
        const xCenter = Math.max(left + cardW / 2, Math.min(right - cardW / 2, rawXCenter));
        const actualOffset = xCenter - markerX;
        const x1 = xCenter - cardW / 2;
        const x2 = xCenter + cardW / 2;
        const baseY = localBaseY(x1, x2, side);
        const y = stackedY(x1, x2, side, baseY);
        const verticalDistance = Math.abs(y - baseY);

        candidates.push({
          side,
          xCenter,
          y,
          box: { side, x1, x2, y1: y, y2: y + cardH },
          score: Math.abs(actualOffset) * (0.45 + edgeStiffness * 1.95) + verticalDistance * 0.9 + sideIndex * 18,
        });
      }
    });

    candidates.sort((a, b) => a.score - b.score || Math.abs(a.xCenter - markerX) - Math.abs(b.xCenter - markerX));

    for (const candidate of candidates) {
      if (!collides(candidate.box)) {
        placed = { side: candidate.side, xCenter: candidate.xCenter, y: candidate.y };
        placedCards.push(candidate.box);
        break;
      }
    }

    if (!placed) {
      const side = preferredSides[0];
      const fallbackY = localBaseY(markerX - cardW / 2, markerX + cardW / 2, side);
      const fallbackStep = cardH + layerGap;
      const y = side === "top" ? fallbackY - (maxLevels + 1) * fallbackStep : fallbackY + (maxLevels + 1) * fallbackStep;
      const xCenter = Math.max(left + cardW / 2, Math.min(right - cardW / 2, markerX));
      placed = { side, xCenter, y };
      placedCards.push({ side, x1: xCenter - cardW / 2, x2: xCenter + cardW / 2, y1: y, y2: y + cardH });
    }

    rfNodes.push({
      id: nodeId,
      type: isStack ? "eventStack" : "event",
      position: { x: placed.xCenter - cardW / 2, y: placed.y },
      sourcePosition: placed.side === "top" ? "bottom" : "top",
      targetPosition: placed.side === "top" ? "bottom" : "top",
      data: isStack
        ? {
            side: placed.side,
            events: cluster.events.map((e) => ({ id: e.id, date: formatEventDate(e.date), title: e.title, lane: e.lane, tags: e.tags, source: e.source })),
          }
        : {
            eventId: cluster.events[0].id,
            date: formatEventDate(cluster.events[0].date),
            title: cluster.events[0].title,
            lane: cluster.events[0].lane,
            description: cluster.events[0].description,
            tags: cluster.events[0].tags,
            source: cluster.events[0].source,
            side: placed.side,
          },
      draggable: true,
      selectable: true,
      style: { width: cardW, zIndex: 30, overflow: "visible" },
    });

    for (const event of cluster.events) {
      const eventMarkerX = toX(event.ts);
      const markerId = `marker-${event.id}`;
      rfNodes.push({
        id: markerId,
        type: "marker",
        position: { x: eventMarkerX - 6, y: axisY - 6 },
        data: { side: placed.side },
        draggable: false,
        selectable: false,
        style: { width: 12, height: 12, zIndex: 25 },
      });

      rfEdges.push({
        id: `edge-${event.id}`,
        source: markerId,
        target: nodeId,
        sourceHandle: "timeline-source",
        targetHandle: "timeline-target",
        type: "default",
        animated: false,
        style: { stroke: "#334155", strokeWidth: 2.4, strokeDasharray: "7 6" },
        markerEnd: { type: "arrowclosed", width: 14, height: 14, color: "#334155" },
      });
    }
  }

  return { nodes: rfNodes, edges: rfEdges, gaps, sections: mergedSections, toX, fromX, minTs, maxTs, axisY };
}
