import type { TimelineBandEvent, TimelinePointEvent, TimelineDate } from "./types";

// ─── Public types ────────────────────────────────────────────────────────────

export type SectionGranularity = "year" | "month";

export interface TimelineFlowOptions {
  /** Gaps longer than this (days) get a compress/expand break marker. Default: 90 */
  maxGapDays?: number;
  /** How much to shrink compressed gaps (0 = fully collapsed, 1 = no compression). Default: 0.06 */
  compressionRatio?: number;
  /** Events within this many days cluster into a stack node. Default: 18 */
  clusterGapDays?: number;
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
  const clusterGapDays = options.clusterGapDays ?? 18;
  const sectionGranularity = options.sectionGranularity ?? "year";
  const expandedGapKeys = options.expandedGapKeys ?? new Set<string>();
  const allExpanded = options.allExpanded ?? false;
  const left = options.left ?? 120;
  const right = options.right ?? 3320;
  const axisY = options.axisY ?? 520;
  const bandSubEvents = options.bandSubEvents ?? {};

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

  const allTs = [
    ...parsedEvents.map((e) => e.ts),
    ...parsedBands.flatMap((b) => [b.startMs, b.endMs]),
  ];
  const minTs = Math.min(...allTs);
  const maxTs = Math.max(...allTs);

  // Anchor timestamps
  const anchorTs = Array.from(
    new Set<number>([minTs, maxTs + DAY_MS, ...parsedEvents.map((e) => e.ts), ...parsedBands.flatMap((b) => [b.startMs, b.endMs])]),
  ).sort((a, b) => a - b);

  // Build segments with gap compression
  const gaps: GapInfo[] = [];
  const segments: Array<{ start: number; end: number; vStart: number; vSpan: number }> = [];
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

    segments.push({ start, end, vStart: virtualCursor, vSpan });
    virtualCursor += vSpan;
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
  const sectionLabelY = 846;

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
  const labelHeight = 24;
  const labelGap = 4;
  const labelEntries: Array<{ section: Section; x: number; w: number; y: number }> = [];

  mergedSections.forEach((section) => {
    const x1 = toX(Math.max(minTs, section.start));
    const x2 = toX(Math.min(maxTs + DAY_MS, section.end));
    const centerX = (x1 + x2) / 2;
    const labelWidth = section.label.length > 6 ? 140 : 104;
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
      zIndex: 40,
      style: { width: w },
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
  const bandRowLastX2: number[] = [];
  const bandHeight = 84;
  const bandBaseY = axisY - 112;
  const bandRowGap = 14;
  let highestBandTopY = Number.POSITIVE_INFINITY;

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

    let row = 0;
    while (bandRowLastX2[row] !== undefined && x1 <= bandRowLastX2[row] + 24) row += 1;
    bandRowLastX2[row] = x2;
    const bandY = bandBaseY - row * (bandHeight + bandRowGap);
    highestBandTopY = Math.min(highestBandTopY, bandY);

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
      },
      draggable: false,
      selectable: false,
      style: { width: Math.max(220, x2 - x1), height: bandHeight, zIndex: 20, pointerEvents: "all" },
    });

    connectorHandles.forEach((handle) => {
      const markerId = `band-marker-${band.id}-${handle.pointId}`;
      const markerX = toX(handle.ts);
      rfNodes.push({
        id: markerId,
        type: "marker",
        position: { x: markerX - 6, y: axisY - 6 },
        data: { side: "top" },
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
        type: "bezier",
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

    if (current && event.ts - current.minTs <= concentrationGapMs) {
      const nextCount = current.events.length + 1;
      current.events.push(event);
      current.markerX = (current.markerX * (nextCount - 1) + markerX) / nextCount;
      current.cardW = Math.max(current.cardW, cardW);
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
        cardH: 112,
        minTs: event.ts,
        maxTs: event.ts,
      };
      clusters.push(current);
    }
  }

  clusters.sort((a, b) => a.minTs - b.minTs || a.id.localeCompare(b.id));

  // ─── Event placement (collision avoidance) ─────────────────────────────

  const placedCards: Array<{ side: "top" | "bottom"; x1: number; x2: number; y1: number; y2: number }> = [];
  const rowLastRight = new Map<string, number>();

  for (const cluster of clusters) {
    const markerX = cluster.markerX;
    const cardW = cluster.cardW;
    const cardH = 112;
    const preferredSides: Array<"top" | "bottom"> =
      cluster.preferredSide === "top" ? ["top", "bottom"] : ["bottom", "top"];

    const offsetSteps = [0, ...Array.from({ length: 10 }, (_, i) => (i + 1) * 36)];
    let placed: { side: "top" | "bottom"; xCenter: number; y: number } | null = null;

    const collides = (c: { side: "top" | "bottom"; x1: number; x2: number; y1: number; y2: number }) =>
      placedCards.some((card) => {
        if (card.side !== c.side) return false;
        return c.x1 <= card.x2 + 18 && c.x2 >= card.x1 - 18 && c.y1 <= card.y2 + 18 && c.y2 >= card.y1 - 18;
      });

    const topBaseY = parsedBands.length > 0 ? Math.min(axisY - 146, highestBandTopY - cardH - 20) : axisY - 146;

    for (let level = 0; level <= 6 && !placed; level += 1) {
      for (const side of preferredSides) {
        const y = side === "top" ? topBaseY - level * 78 : axisY + 62 + level * 78;
        const rowKey = `${side}:${level}`;
        const minLeftInRow = (rowLastRight.get(rowKey) ?? left - 24) + 24;
        for (const offset of offsetSteps) {
          let xCenter = Math.max(left + cardW / 2, Math.min(right - cardW / 2, markerX + offset));
          let x1 = xCenter - cardW / 2;
          if (x1 < minLeftInRow) { x1 = minLeftInRow; xCenter = x1 + cardW / 2; }
          if (xCenter > right - cardW / 2) continue;
          const candidate = { side, x1, x2: xCenter + cardW / 2, y1: y, y2: y + cardH };
          if (!collides(candidate)) {
            placed = { side, xCenter, y };
            placedCards.push(candidate);
            rowLastRight.set(rowKey, candidate.x2);
            break;
          }
        }
        if (placed) break;
      }
    }

    if (!placed) {
      const side = preferredSides[0];
      const y = side === "top" ? topBaseY - 7 * 78 : axisY + 62 + 7 * 78;
      const xCenter = Math.max(left + cardW / 2, Math.min(right - cardW / 2, markerX));
      placed = { side, xCenter, y };
      placedCards.push({ side, x1: xCenter - cardW / 2, x2: xCenter + cardW / 2, y1: y, y2: y + cardH });
    }

    const isStack = cluster.events.length > 1;
    const nodeId = isStack ? `event-stack-${cluster.id}` : `event-${cluster.events[0].id}`;

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
            tags: cluster.events[0].tags,
            source: cluster.events[0].source,
            side: placed.side,
          },
      draggable: true,
      selectable: true,
      style: { width: cardW, zIndex: 30, ...(isStack ? { overflow: "visible" } : {}) },
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
        type: "bezier",
        animated: false,
        style: { stroke: "#334155", strokeWidth: 2.4, strokeDasharray: "7 6" },
        markerEnd: { type: "arrowclosed", width: 14, height: 14, color: "#334155" },
      });
    }
  }

  return { nodes: rfNodes, edges: rfEdges, gaps, sections: mergedSections, toX, fromX, minTs, maxTs, axisY };
}
