import React from "react";
import type { ReactNode } from "react";

// ─── Shared types ────────────────────────────────────────────────────────────

/** Props passed to every default node component via ReactFlow's `data`. */
interface BaseNodeData {
  [key: string]: unknown;
}

const HANDLE_STYLE = { width: 8, height: 8, border: "none", background: "transparent", opacity: 0 } as const;

// ─── EventNode ───────────────────────────────────────────────────────────────

export interface EventNodeProps {
  data: BaseNodeData;
  /** Override the card's className. */
  className?: string;
  /** Override the date label className. */
  dateClassName?: string;
  /** Override the title className. */
  titleClassName?: string;
  /** Override the lane badge className. */
  laneClassName?: string;
  /** Render a fully custom card body. Receives { date, title, lane, side }. */
  renderContent?: (props: { date: string; title: string; lane: string; side: string }) => ReactNode;
}

export function EventNode({ data, className, dateClassName, titleClassName, laneClassName, renderContent }: EventNodeProps) {
  const date = typeof data.date === "string" ? data.date : "";
  const title = typeof data.title === "string" ? data.title : "";
  const lane = typeof data.lane === "string" ? data.lane : "General";
  const side = data.side === "bottom" ? "bottom" : "top";

  if (renderContent) {
    return <div className={className}>{renderContent({ date, title, lane, side })}</div>;
  }

  return (
    <div className={className ?? "rounded-2xl border border-amber-400 bg-amber-50 px-3 py-2 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:border-amber-500 hover:shadow-[0_18px_36px_-20px_rgba(120,53,15,0.5)]"}>
      <div className={dateClassName ?? "text-[10px] font-extrabold tracking-[0.08em] text-amber-800"}>{date}</div>
      <div className={titleClassName ?? "mt-1 text-[14px] font-semibold leading-tight text-slate-800"}>{title}</div>
      <div className={laneClassName ?? "mt-2 inline-flex rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"}>
        {lane}
      </div>
    </div>
  );
}

// ─── EventStackNode ──────────────────────────────────────────────────────────

export interface EventStackNodeProps {
  data: BaseNodeData;
  /** Override the lead card's className. */
  className?: string;
  /** Override className for fanned-out cards. */
  fanCardClassName?: string;
  /** Vertical step between fanned cards in px. Default: 94 */
  fanStepY?: number;
  /** Horizontal stagger between fanned cards in px. Default: 28 */
  fanStepX?: number;
  /** Render a fully custom card for each fanned event. */
  renderFanCard?: (props: { date: string; title: string; lane: string }) => ReactNode;
  /** Render custom lead card content. */
  renderContent?: (props: { lead: { date: string; title: string; lane: string }; count: number; side: string }) => ReactNode;
}

export function EventStackNode({
  data,
  className,
  fanCardClassName,
  fanStepY = 94,
  fanStepX = 28,
  renderFanCard,
  renderContent,
}: EventStackNodeProps) {
  const side = data.side === "bottom" ? "bottom" : "top";
  const events = Array.isArray(data.events) ? data.events : [];
  const lead = events[0] ?? { date: "", title: "Cluster", lane: "General" };
  const rest = events.slice(1) as Array<{ id: string; title: string; date: string; lane: string }>;

  const fanDirY = side === "top" ? -1 : 1;
  const maxStackPeek = Math.min(rest.length, 3);

  const defaultCardClass = "rounded-2xl border border-amber-400 bg-amber-50 px-3 py-2 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)]";

  return (
    <div className="group relative overflow-visible">
      {/* Fan cards — they ARE the stack layers in collapsed state */}
      {rest.map((event, idx) => {
        const fanY = (idx + 1) * fanStepY * fanDirY;
        const fanX = (idx % 2 === 0 ? 1 : -1) * Math.ceil((idx + 1) / 2) * fanStepX;
        const stackDepth = idx < maxStackPeek ? maxStackPeek - idx : 0;
        const stackX = stackDepth * 3;
        const stackY = stackDepth * 2;
        const stackOpacity = idx < maxStackPeek ? 0.88 - idx * 0.16 : 0;

        return (
          <div
            key={`fan-${event.id}`}
            className="fan-card pointer-events-none absolute inset-0 z-[60] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:pointer-events-auto"
            style={{
              "--fan-x": `${fanX}px`,
              "--fan-y": `${fanY}px`,
              "--stack-x": `${stackX}px`,
              "--stack-y": `${stackY}px`,
              "--stack-opacity": `${stackOpacity}`,
              transitionDelay: `${(idx + 1) * 32}ms`,
            } as React.CSSProperties}
          >
            <div className={`fan-card-inner h-full rounded-2xl border border-amber-300 bg-amber-100 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}>
              <div className="fan-card-content px-3 py-2 opacity-0 transition-opacity duration-200">
                {renderFanCard ? (
                  renderFanCard({ date: event.date, title: event.title, lane: event.lane })
                ) : (
                  <>
                    <div className="text-[10px] font-extrabold tracking-[0.08em] text-amber-800">{event.date}</div>
                    <div className="mt-1 text-[14px] font-semibold leading-tight text-slate-800">{event.title}</div>
                    <div className="mt-2 inline-flex rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {event.lane}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Lead card */}
      <div className={`relative z-[61] ${className ?? defaultCardClass}`}>
        {renderContent ? (
          renderContent({ lead, count: events.length, side })
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-[10px] font-extrabold tracking-[0.08em] text-amber-800">{lead.date}</div>
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  {Array.from({ length: Math.min(events.length, 3) }, (_, idx) => (
                    <span
                      key={`count-stack-${idx}`}
                      className="inline-block h-3 w-3 rounded-sm border border-amber-500 bg-amber-100 transition-opacity duration-300 group-hover:opacity-0"
                      style={{ marginLeft: idx === 0 ? 0 : -4, opacity: 1 - idx * 0.18 }}
                    />
                  ))}
                </div>
                <div className="rounded-full border border-amber-400 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {events.length}
                </div>
              </div>
            </div>
            <div className="text-[14px] font-semibold leading-tight text-slate-800">{lead.title}</div>
            <div className="mt-2 inline-flex rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {lead.lane}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GapBreakNode ────────────────────────────────────────────────────────────

export interface GapBreakNodeProps {
  data: BaseNodeData;
  /** Called when the break is clicked. Receives the gap key. */
  onToggle?: (gapKey: string) => void;
  /** Override the button's className. */
  className?: string;
  /** Override the compressed-state className. */
  compressedClassName?: string;
  /** Override the expanded-state className. */
  expandedClassName?: string;
  /** Render a completely custom icon. Receives { compressed }. */
  renderIcon?: (props: { compressed: boolean }) => ReactNode;
}

export function GapBreakNode({
  data,
  onToggle,
  className,
  compressedClassName,
  expandedClassName,
  renderIcon,
}: GapBreakNodeProps) {
  const compressed = data.compressed === true;
  const gapKey = typeof data.gapKey === "string" ? data.gapKey : "";
  const label = typeof data.label === "string" ? data.label : "";
  const handleToggle = typeof data.onToggle === "function" ? data.onToggle : null;

  const defaultCompressed = "border-slate-400 bg-slate-100 hover:border-blue-500 hover:bg-blue-50";
  const defaultExpanded = "border-blue-500 bg-blue-50 hover:border-blue-600 hover:bg-blue-100";

  return (
    <button
      type="button"
      onClick={() => {
        if (onToggle) onToggle(gapKey);
        else if (handleToggle) (handleToggle as (gapKey: string) => void)(gapKey);
      }}
      className={
        className ??
        `flex h-full w-full cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 ${
          compressed ? (compressedClassName ?? defaultCompressed) : (expandedClassName ?? defaultExpanded)
        }`
      }
    >
      {renderIcon ? (
        renderIcon({ compressed })
      ) : (
        <svg width="18" height="14" viewBox="0 0 18 14" className="shrink-0">
          {compressed ? (
            /* Compressed: outward arrows ‹› — "click to expand" */
            <>
              <path d="M7 7 L2.5 7" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M4.5 4.5 L2 7 L4.5 9.5" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 7 L15.5 7" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M13 4.5 L15.5 7 L13 9.5" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8.75" y1="3" x2="8.75" y2="11" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 2" />
            </>
          ) : (
            /* Expanded: inward arrows ›‹ — "click to compress" */
            <>
              <path d="M2 7 L6.5 7" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M4.5 4.5 L7 7 L4.5 9.5" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.5 7 L11 7" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M13 4.5 L10.5 7 L13 9.5" fill="none" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8.75" y1="3" x2="8.75" y2="11" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 2" />
            </>
          )}
        </svg>
      )}
      <title>{label}</title>
    </button>
  );
}

// ─── Simple nodes ────────────────────────────────────────────────────────────

export interface SectionDividerNodeProps {
  data: BaseNodeData;
  className?: string;
  lineClassName?: string;
  glowClassName?: string;
}

export function SectionDividerNode({ className, lineClassName, glowClassName }: SectionDividerNodeProps) {
  return (
    <div className={className ?? "relative h-full w-full"}>
      <div className={lineClassName ?? "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-slate-500/70"} />
      <div className={glowClassName ?? "absolute left-1/2 top-0 h-full w-[6px] -translate-x-1/2 bg-slate-400/20"} />
    </div>
  );
}

export interface SectionLabelNodeProps {
  data: BaseNodeData;
  className?: string;
  renderLabel?: (label: string) => ReactNode;
}

export function SectionLabelNode({ data, className, renderLabel }: SectionLabelNodeProps) {
  const label = typeof data.label === "string" ? data.label : "";
  if (renderLabel) return <>{renderLabel(label)}</>;
  return (
    <div className={className ?? "rounded-md border border-slate-400 bg-white px-2 py-1 text-center text-[11px] font-extrabold tracking-wide text-slate-700 shadow-sm"}>
      {label}
    </div>
  );
}

export interface AxisNodeProps {
  data: BaseNodeData;
  className?: string;
}

export function AxisNode({ className }: AxisNodeProps) {
  return <div className={className ?? "h-[6px] w-full rounded-full bg-blue-600/95 shadow-[0_0_0_6px_rgba(37,99,235,0.16)]"} />;
}

export interface MarkerNodeProps {
  data: BaseNodeData;
  className?: string;
}

export function MarkerNode({ className }: MarkerNodeProps) {
  return <div className={className ?? "h-3 w-3 rounded-full border-2 border-slate-900 bg-slate-200"} />;
}

// ─── BandNode ────────────────────────────────────────────────────────────────

function toRgba(color: string, alpha: number): string {
  if (/^#([0-9a-f]{6})$/i.test(color)) {
    const raw = color.slice(1);
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export interface BandNodeProps {
  data: BaseNodeData;
  className?: string;
  labelClassName?: string;
  subtitleClassName?: string;
  subEventClassName?: string;
  /** Render fully custom band content. */
  renderContent?: (props: { label: string; subtitle: string; color: string; subEvents: Array<{ id: string; title: string; date: string; ratio: number }> }) => ReactNode;
}

export function BandNode({ data, className, labelClassName, subtitleClassName, subEventClassName, renderContent }: BandNodeProps) {
  const label = typeof data.label === "string" ? data.label : "";
  const subtitle = typeof data.subtitle === "string" ? data.subtitle : "";
  const color = typeof data.color === "string" ? data.color : "#0ea5e9";
  const subEvents = Array.isArray(data.subEvents)
    ? (data.subEvents as Array<{ id: string; title: string; date: string; ratio: number; ts: number }>)
    : [];

  if (renderContent) {
    return (
      <div className={className ?? "relative h-full w-full rounded-2xl px-3 py-2"} style={{ backgroundColor: toRgba(color, 0.5) }}>
        {renderContent({ label, subtitle, color, subEvents })}
      </div>
    );
  }

  return (
    <div
      className={className ?? "group/band relative h-full w-full rounded-2xl px-3 py-2 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(15,23,42,0.55)]"}
      style={{ backgroundColor: toRgba(color, 0.5) }}
    >
      <div className="absolute inset-0 rounded-2xl transition-colors duration-200 group-hover/band:bg-transparent" style={{ backgroundColor: toRgba("#000000", 0.08) }} />
      <div className="relative h-full w-full">
        <div className={labelClassName ?? "text-[13px] font-extrabold leading-tight text-white drop-shadow-sm"}>{label}</div>
        {subtitle ? <div className={subtitleClassName ?? "mt-1 text-[12px] font-semibold text-white/95"}>{subtitle}</div> : null}
        {subEvents.map((sub) => (
          <span
            key={sub.id}
            className={subEventClassName ?? "absolute top-[44px] rounded-full border border-white/60 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-[1px] transition-all duration-200 group-hover/band:border-white/80 group-hover/band:bg-white/30"}
            style={{ left: `${Math.max(0, Math.min(1, sub.ratio)) * 100}%`, transform: "translateX(-50%)" }}
          >
            {sub.title}
            <span className="ml-1 font-medium text-white/70">{sub.date}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Convenience: default node types map ─────────────────────────────────────

/**
 * Returns a nodeTypes object suitable for ReactFlow.
 *
 * @param Handle - The Handle component from @xyflow/react. Required for edges to connect.
 * @param overrides - Per-node-type prop overrides for customization.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDefaultNodeTypes(Handle: React.ComponentType<any>, overrides?: {
  event?: EventNodeProps;
  eventStack?: EventStackNodeProps;
  gapBreak?: GapBreakNodeProps;
  sectionDivider?: SectionDividerNodeProps;
  sectionLabel?: SectionLabelNodeProps;
  axis?: AxisNodeProps;
  marker?: MarkerNodeProps;
  band?: BandNodeProps;
}) {
  const H = Handle;

  const makeEvent = (rfProps: { data: BaseNodeData }) => {
    const side = rfProps.data.side === "bottom" ? "bottom" : "top";
    const targetPos = side === "top" ? "bottom" : "top";
    return (
      <>
        <H id="timeline-target" type="target" position={targetPos} style={HANDLE_STYLE} />
        <EventNode {...(overrides?.event ?? {})} data={rfProps.data} />
      </>
    );
  };

  const makeStack = (rfProps: { data: BaseNodeData }) => {
    const side = rfProps.data.side === "bottom" ? "bottom" : "top";
    const targetPos = side === "top" ? "bottom" : "top";
    return (
      <>
        <H id="timeline-target" type="target" position={targetPos} style={HANDLE_STYLE} />
        <EventStackNode {...(overrides?.eventStack ?? {})} data={rfProps.data} />
      </>
    );
  };

  const makeMarker = (rfProps: { data: BaseNodeData }) => {
    const side = rfProps.data.side === "bottom" ? "bottom" : "top";
    const sourcePos = side === "top" ? "top" : "bottom";
    return (
      <>
        <H id="timeline-source" type="source" position={sourcePos} style={HANDLE_STYLE} />
        <MarkerNode {...(overrides?.marker ?? {})} data={rfProps.data} />
      </>
    );
  };

  const makeBand = (rfProps: { data: BaseNodeData }) => {
    const connectorHandles = Array.isArray(rfProps.data.connectorHandles)
      ? (rfProps.data.connectorHandles as Array<{ id: string; ratio: number }>)
      : [];
    return (
      <>
        {connectorHandles.map((handle) => (
          <H
            key={handle.id}
            id={handle.id}
            type="target"
            position="bottom"
            style={{
              left: `${Math.max(0, Math.min(1, handle.ratio)) * 100}%`,
              ...HANDLE_STYLE,
              transform: "translate(-50%, 50%)",
            }}
          />
        ))}
        <BandNode {...(overrides?.band ?? {})} data={rfProps.data} />
      </>
    );
  };

  const makeGap = (rfProps: { data: BaseNodeData }) => <GapBreakNode {...(overrides?.gapBreak ?? {})} data={rfProps.data} />;
  const makeDivider = (rfProps: { data: BaseNodeData }) => <SectionDividerNode {...(overrides?.sectionDivider ?? {})} data={rfProps.data} />;
  const makeLabel = (rfProps: { data: BaseNodeData }) => <SectionLabelNode {...(overrides?.sectionLabel ?? {})} data={rfProps.data} />;
  const makeAxis = (rfProps: { data: BaseNodeData }) => <AxisNode {...(overrides?.axis ?? {})} data={rfProps.data} />;

  return {
    event: makeEvent,
    eventStack: makeStack,
    gapBreak: makeGap,
    sectionDivider: makeDivider,
    sectionLabel: makeLabel,
    axis: makeAxis,
    marker: makeMarker,
    band: makeBand,
  };
}
