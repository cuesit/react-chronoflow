import React from "react";
import type { ReactNode, CSSProperties } from "react";

// ─── Shared ──────────────────────────────────────────────────────────────────

interface BaseNodeData { [key: string]: unknown; }

const HANDLE_STYLE = { width: 8, height: 8, border: "none", background: "transparent", opacity: 0 } as const;

const S = {
  // Event card
  eventCard: { borderRadius: 16, border: "1px solid #fbbf24", background: "#fffbeb", padding: "8px 12px", boxShadow: "0 12px 28px -24px rgba(15,23,42,0.55)", transition: "all 0.2s ease-out", position: "relative" as const, fontFamily: "system-ui, -apple-system, sans-serif" },
  eventDate: { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#92400e" },
  eventTitle: { marginTop: 4, fontSize: 14, fontWeight: 600, lineHeight: 1.2, color: "#1e293b" },
  eventLaneRow: { marginTop: 8, display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: 4 },
  eventLane: { display: "inline-flex", borderRadius: 9999, border: "1px solid #fcd34d", background: "#fff", padding: "2px 8px", fontSize: 11, fontWeight: 500, color: "#475569" },
  eventTag: { display: "inline-flex", borderRadius: 9999, border: "1px solid #e2e8f0", background: "#f8fafc", padding: "2px 6px", fontSize: 9, fontWeight: 600, color: "#64748b" },
  deleteBtn: { position: "absolute" as const, right: -8, top: -8, zIndex: 10, display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 9999, border: "1px solid #fecaca", background: "#fff", color: "#cbd5e1", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", cursor: "pointer", transition: "all 0.15s" },
  deleteBtnHidden: { opacity: 0, pointerEvents: "none" as const },
  deleteBtnVisible: { opacity: 1, pointerEvents: "auto" as const },
  // Stack
  stackCard: { borderRadius: 16, border: "1px solid #fbbf24", background: "#fffbeb", padding: "8px 12px", boxShadow: "0 12px 28px -24px rgba(15,23,42,0.55)", position: "relative" as const, zIndex: 61, fontFamily: "system-ui, -apple-system, sans-serif" },
  stackCountDot: { display: "inline-block", width: 12, height: 12, borderRadius: 2, border: "1px solid #f59e0b", background: "#fef3c7" },
  stackCountBadge: { borderRadius: 9999, border: "1px solid #fbbf24", background: "#fff", padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#92400e" },
  fanCardInnerCollapsed: { height: "100%", borderRadius: 16, border: "1px solid #fcd34d", background: "#fef3c7", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" },
  fanCardInnerExpanded: { height: "100%", borderRadius: 16, border: "1px solid #fbbf24", background: "#fffbeb", boxShadow: "0 12px 28px -24px rgba(15,23,42,0.55)", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" },
  fanCardContent: { padding: "8px 12px", transition: "opacity 0.2s" },
  // Gap break
  gapBtn: { display: "flex", width: "100%", height: "100%", cursor: "pointer", alignItems: "center", justifyContent: "center", borderRadius: 9999, border: "2px solid", transition: "all 0.2s" },
  gapCompressed: { borderColor: "#94a3b8", background: "#f1f5f9" },
  gapExpanded: { borderColor: "#2563eb", background: "#eff6ff" },
  // Section
  dividerLine: { position: "absolute" as const, left: "50%", top: 0, height: "100%", width: 1, transform: "translateX(-50%)", background: "rgba(100,116,139,0.45)" },
  dividerGlow: { position: "absolute" as const, left: "50%", top: 0, height: "100%", width: 4, transform: "translateX(-50%)", background: "rgba(148,163,184,0.12)" },
  sectionLabel: { borderRadius: 6, border: "1px solid #94a3b8", background: "#fff", padding: "4px 8px", textAlign: "center" as const, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: "#334155", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", fontFamily: "system-ui, -apple-system, sans-serif" },
  // Axis
  axisLine: { height: 6, width: "100%", borderRadius: 9999, background: "rgba(37,99,235,0.95)", boxShadow: "0 0 0 6px rgba(37,99,235,0.16)" },
  // Marker
  marker: { width: 12, height: 12, borderRadius: 9999, border: "2px solid #0f172a", background: "#e2e8f0" },
  // Band
  bandOverlay: { position: "absolute" as const, inset: 0, borderRadius: 16, transition: "background-color 0.2s" },
  bandLabel: { fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.15)", fontFamily: "system-ui, -apple-system, sans-serif" },
  bandSubtitle: { marginTop: 4, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.95)" },
  bandSubEvent: { position: "absolute" as const, top: 44, borderRadius: 9999, border: "1px solid rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.2)", padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#fff", transition: "all 0.2s" },
  bandSubEventDate: { marginLeft: 4, fontWeight: 500, color: "rgba(255,255,255,0.7)" },
  // AddEvent form
  input: { width: "100%", borderRadius: 6, border: "1px solid", background: "#fff", padding: "4px 8px", fontSize: 13, fontWeight: 600, color: "#1e293b", outline: "none" },
  inputSmall: { width: "100%", borderRadius: 6, border: "1px solid", background: "#fff", padding: "4px 8px", fontSize: 11, color: "#475569", outline: "none", marginTop: 6 },
  textarea: { width: "100%", borderRadius: 6, border: "1px solid", background: "#fff", padding: "4px 8px", fontSize: 11, color: "#475569", outline: "none", marginTop: 6, resize: "none" as const },
  submitBtn: { marginTop: 8, width: "100%", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "#fff", border: "none", cursor: "pointer", transition: "background 0.15s" },
  // Filter bar
  filterBar: { display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: 8, borderBottom: "1px solid #f1f5f9", padding: "8px 12px", fontFamily: "system-ui, -apple-system, sans-serif" },
  filterLabel: { fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#94a3b8" },
  filterCatLabel: { fontSize: 10, fontWeight: 500, color: "#94a3b8" },
  filterPill: { borderRadius: 9999, padding: "2px 8px", fontSize: 10, fontWeight: 500, border: "1px solid", cursor: "pointer", transition: "all 0.15s" },
  filterPillActive: (hue: string) => ({ borderColor: hue, background: `${hue}15`, color: hue }),
  filterPillInactive: { borderColor: "#e2e8f0", background: "#fff", color: "#64748b" },
  clearBtn: { borderRadius: 9999, border: "1px solid #e2e8f0", padding: "2px 8px", fontSize: 10, fontWeight: 500, color: "#94a3b8", cursor: "pointer", background: "transparent", transition: "all 0.15s" },
};

// ─── EventNode ───────────────────────────────────────────────────────────────

export interface EventNodeProps {
  data: BaseNodeData;
  className?: string;
  dateClassName?: string;
  titleClassName?: string;
  laneClassName?: string;
  renderContent?: (props: { date: string; title: string; lane: string; side: string }) => ReactNode;
}

export function EventNode({ data, className, renderContent }: EventNodeProps) {
  const date = typeof data.date === "string" ? data.date : "";
  const title = typeof data.title === "string" ? data.title : "";
  const lane = typeof data.lane === "string" ? data.lane : "General";
  const side = data.side === "bottom" ? "bottom" : "top";
  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
  const source = data.source as string | undefined;
  const onDelete = typeof data.onDelete === "function" ? data.onDelete : null;
  const [hovered, setHovered] = React.useState(false);

  if (renderContent) {
    return <div className={className}>{renderContent({ date, title, lane, side })}</div>;
  }

  return (
    <div
      className={className}
      style={className ? undefined : S.eventCard}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {source === "user" && onDelete && (
        <button
          type="button"
          onClick={() => (onDelete as () => void)()}
          style={{ ...S.deleteBtn, ...(hovered ? S.deleteBtnVisible : S.deleteBtnHidden) }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fef2f2"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8"><line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      )}
      <div style={S.eventDate}>{date}</div>
      <div style={S.eventTitle}>{title}</div>
      <div style={S.eventLaneRow}>
        <div style={S.eventLane}>{lane}</div>
        {tags.map((tag) => <span key={tag} style={S.eventTag}>{tag}</span>)}
      </div>
    </div>
  );
}

// ─── Fan layout calculators ──────────────────────────────────────────────────

export type FanLayout = "cascade" | "arc" | "shelf" | "staircase" | "explosion" | "accordion";

function computeFanPositions(
  count: number,
  layout: FanLayout,
  dirY: 1 | -1,
  stepY: number,
  stepX: number,
  radius?: number,
  stretchX?: number,
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    const idx = i + 1; // 1-based for the fan cards (skip lead)

    switch (layout) {
      case "cascade": {
        // Vertical with alternating horizontal offset
        const x = (i % 2 === 0 ? 1 : -1) * Math.ceil(idx / 2) * stepX;
        const y = idx * stepY * dirY;
        positions.push({ x, y });
        break;
      }
      case "arc": {
        const r = radius ?? Math.max(130, 100 + count * 20);
        const minAnglePerCard = Math.atan(170 / r);
        const totalAngle = Math.min(Math.PI * 0.85, count * minAnglePerCard);
        const startAngle = -totalAngle / 2;
        const angleStep = count <= 1 ? 0 : totalAngle / (count - 1);
        const angle = startAngle + i * angleStep;
        const sx = stretchX ?? 1;
        const x = Math.sin(angle) * r * sx;
        const y = Math.cos(angle) * r * dirY;
        positions.push({ x, y });
        break;
      }
      case "shelf": {
        // Horizontal row — cards slide out side by side
        const totalWidth = count * (stepX + 140); // card width ~140
        const startX = -totalWidth / 2;
        const x = startX + i * (140 + stepX);
        const y = (stepY + 20) * dirY;
        positions.push({ x, y });
        break;
      }
      case "staircase": {
        // Diagonal — each card steps right and away, enough to clear the previous card
        const x = idx * stepX * 1.8;
        const y = idx * stepY * dirY;
        positions.push({ x, y });
        break;
      }
      case "explosion": {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const r2 = radius ?? 90 + count * 8;
        const sx2 = stretchX ?? 1.3;
        const x = Math.cos(angle) * r2 * sx2;
        const y = Math.sin(angle) * r2;
        positions.push({ x, y });
        break;
      }
      case "accordion": {
        // Straight vertical, no horizontal offset
        const y = idx * stepY * dirY;
        positions.push({ x: 0, y });
        break;
      }
    }
  }

  return positions;
}

// ─── EventStackNode ──────────────────────────────────────────────────────────

export interface EventStackNodeProps {
  data: BaseNodeData;
  className?: string;
  fanCardClassName?: string;
  /** Fan layout strategy. Default: "cascade" */
  fanLayout?: FanLayout;
  /** Vertical step between fanned cards in px. Default: 94 */
  fanStepY?: number;
  /** Horizontal stagger between fanned cards in px. Default: 28 */
  fanStepX?: number;
  /** Radius for arc/explosion layouts in px. Auto-scales if not set. */
  fanRadius?: number;
  /** Horizontal stretch multiplier for arc/explosion (cards are wider than tall). Default: auto per layout */
  fanStretchX?: number;
  /** Reverse z-order of fanned cards — first card on top instead of bottom. Default: false */
  fanReverse?: boolean;
  renderFanCard?: (props: { date: string; title: string; lane: string }) => ReactNode;
  renderContent?: (props: { lead: { date: string; title: string; lane: string }; count: number; side: string }) => ReactNode;
}

export function EventStackNode({ data, className, fanLayout = "cascade", fanStepY = 94, fanStepX = 28, fanRadius, fanStretchX, fanReverse = false, renderFanCard, renderContent }: EventStackNodeProps) {
  const side = data.side === "bottom" ? "bottom" : "top";
  const events = Array.isArray(data.events) ? data.events : [];
  const lead = events[0] ?? { date: "", title: "Cluster", lane: "General" };
  const rest = events.slice(1) as Array<{ id: string; title: string; date: string; lane: string }>;
  const fanDirY = side === "top" ? -1 : 1;
  const maxStackPeek = Math.min(rest.length, 3);
  const fanPositions = computeFanPositions(rest.length, fanLayout, fanDirY as 1 | -1, fanStepY, fanStepX, fanRadius, fanStretchX);

  return (
    <div className="rcf-stack-group" style={{ position: "relative", overflow: "visible" }}>
      {rest.map((event, idx) => {
        const { x: fanX, y: fanY } = fanPositions[idx];
        const stackDepth = idx < maxStackPeek ? maxStackPeek - idx : 0;
        return (
          <div
            key={`fan-${event.id}`}
            className="rcf-fan-card"
            style={{
              "--rcf-fan-x": `${fanX}px`,
              "--rcf-fan-y": `${fanY}px`,
              "--rcf-stack-x": `${stackDepth * 3}px`,
              "--rcf-stack-y": `${stackDepth * 2}px`,
              "--rcf-stack-opacity": `${idx < maxStackPeek ? 0.88 - idx * 0.16 : 0}`,
              // Fan cards z-order: always below lead card (61) when collapsed.
              // Relative ordering among fan cards controlled by fanReverse.
              "--rcf-fan-z": `${fanReverse ? 59 - idx : 50 + idx}`,
              position: "absolute", inset: 0,
              zIndex: fanReverse ? Math.max(0, maxStackPeek - idx) : idx,
              transitionDelay: `${(idx + 1) * 32}ms`,
            } as CSSProperties}
          >
            <div className="rcf-fan-card-inner" style={S.fanCardInnerCollapsed}>
              <div className="rcf-fan-card-content" style={{ ...S.fanCardContent, opacity: 0 }}>
                {renderFanCard ? renderFanCard({ date: event.date, title: event.title, lane: event.lane }) : (
                  <>
                    <div style={S.eventDate}>{event.date}</div>
                    <div style={S.eventTitle}>{event.title}</div>
                    <div style={{ marginTop: 8 }}><span style={S.eventLane}>{event.lane}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className={className} style={className ? undefined : S.stackCard}>
        {renderContent ? renderContent({ lead, count: events.length, side }) : (
          <>
            <div style={{ marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={S.eventDate}>{lead.date}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {Array.from({ length: Math.min(events.length, 3) }, (_, idx) => (
                    <span key={idx} className="rcf-stack-dot" style={{ ...S.stackCountDot, marginLeft: idx === 0 ? 0 : -4, opacity: 1 - idx * 0.18 }} />
                  ))}
                </div>
                <div style={S.stackCountBadge}>{events.length}</div>
              </div>
            </div>
            <div style={S.eventTitle}>{lead.title}</div>
            <div style={{ marginTop: 8 }}><span style={S.eventLane}>{lead.lane}</span></div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GapBreakNode ────────────────────────────────────────────────────────────

export interface GapBreakNodeProps {
  data: BaseNodeData;
  onToggle?: (gapKey: string) => void;
  className?: string;
  compressedClassName?: string;
  expandedClassName?: string;
  renderIcon?: (props: { compressed: boolean }) => ReactNode;
}

export function GapBreakNode({ data, onToggle, renderIcon }: GapBreakNodeProps) {
  const compressed = data.compressed === true;
  const gapKey = typeof data.gapKey === "string" ? data.gapKey : "";
  const label = typeof data.label === "string" ? data.label : "";
  const handleToggle = typeof data.onToggle === "function" ? data.onToggle : null;

  return (
    <button
      type="button"
      onClick={() => { if (onToggle) onToggle(gapKey); else if (handleToggle) (handleToggle as (k: string) => void)(gapKey); }}
      style={{ ...S.gapBtn, ...(compressed ? S.gapCompressed : S.gapExpanded) }}
    >
      {renderIcon ? renderIcon({ compressed }) : (
        <svg width="18" height="14" viewBox="0 0 18 14" style={{ flexShrink: 0 }}>
          {compressed ? (
            <>
              <path d="M7 7 L2.5 7" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M4.5 4.5 L2 7 L4.5 9.5" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 7 L15.5 7" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M13 4.5 L15.5 7 L13 9.5" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8.75" y1="3" x2="8.75" y2="11" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 2" />
            </>
          ) : (
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

export interface SectionDividerNodeProps { data: BaseNodeData; className?: string; lineClassName?: string; glowClassName?: string; }
export function SectionDividerNode({ className }: SectionDividerNodeProps) {
  return (
    <div className={className} style={className ? undefined : { position: "relative", width: "100%", height: "100%" }}>
      <div style={S.dividerLine} />
      <div style={S.dividerGlow} />
    </div>
  );
}

export interface SectionLabelNodeProps { data: BaseNodeData; className?: string; renderLabel?: (label: string) => ReactNode; }
export function SectionLabelNode({ data, className, renderLabel }: SectionLabelNodeProps) {
  const label = typeof data.label === "string" ? data.label : "";
  if (renderLabel) return <>{renderLabel(label)}</>;
  return <div className={className} style={className ? undefined : S.sectionLabel}>{label}</div>;
}

export interface AxisNodeProps { data: BaseNodeData; className?: string; }
export function AxisNode({ data, className }: AxisNodeProps) {
  const axisRef = React.useRef<HTMLDivElement>(null);
  const onAxisClick = typeof data.onAxisClick === "function" ? data.onAxisClick : null;
  const addModeActive = data.addModeActive === true;
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!axisRef.current || !onAxisClick) return;
    const rect = axisRef.current.getBoundingClientRect();
    const zoom = rect.width / axisRef.current.offsetWidth;
    (onAxisClick as (x: number) => void)((e.clientX - rect.left) / zoom);
  }, [onAxisClick]);

  return (
    <div ref={axisRef} style={{ position: "relative", width: "100%", height: 6 }}>
      {onAxisClick && (
        <div
          style={{ position: "absolute", left: 0, right: 0, top: -17, height: 40, cursor: addModeActive ? "default" : "copy" }}
          onClick={handleClick}
        />
      )}
      <div className={className} style={className ? undefined : S.axisLine} />
    </div>
  );
}

export interface MarkerNodeProps { data: BaseNodeData; className?: string; }
export function MarkerNode({ className }: MarkerNodeProps) {
  return <div className={className} style={className ? undefined : S.marker} />;
}

// ─── AddEventNode ────────────────────────────────────────────────────────────

function toRgba(color: string | undefined, alpha: number): string {
  if (!color) return `rgba(14, 165, 233, ${alpha})`; // fallback sky-500
  if (/^#([0-9a-f]{3})$/i.test(color)) {
    const r = parseInt(color[1] + color[1], 16);
    const g = parseInt(color[2] + color[2], 16);
    const b = parseInt(color[3] + color[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (/^#([0-9a-f]{6})$/i.test(color)) {
    const raw = color.slice(1);
    return `rgba(${parseInt(raw.slice(0, 2), 16)}, ${parseInt(raw.slice(2, 4), 16)}, ${parseInt(raw.slice(4, 6), 16)}, ${alpha})`;
  }
  // Try to wrap rgb() with alpha
  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  return color;
}

export interface AddEventNodeProps { data: BaseNodeData; }

export function AddEventNode({ data }: AddEventNodeProps) {
  const mode = data.mode as "ghost" | "editing";
  const dateLabel = typeof data.dateLabel === "string" ? data.dateLabel : "";
  const startTs = typeof data.startTs === "number" ? data.startTs : 0;
  const onConfirm = typeof data.onConfirm === "function" ? data.onConfirm : null;
  const onCancel = typeof data.onCancel === "function" ? data.onCancel : null;

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [lane, setLane] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");
  const [hasEndDate, setHasEndDate] = React.useState(false);
  const [endDate, setEndDate] = React.useState("");
  const [bandColor, setBandColor] = React.useState("#2563eb");
  const titleRef = React.useRef<HTMLInputElement>(null);
  const startIso = startTs ? new Date(startTs).toISOString().slice(0, 10) : "";

  React.useEffect(() => { if (mode === "editing" && titleRef.current) titleRef.current.focus(); }, [mode]);
  React.useEffect(() => { if (hasEndDate && !endDate && startTs) setEndDate(new Date(startTs + 30 * 864e5).toISOString().slice(0, 10)); }, [hasEndDate, endDate, startTs]);

  if (mode === "ghost") {
    return (
      <div style={{ display: "flex", width: 160, flexDirection: "column", borderRadius: 16, border: "2px dashed rgba(251,191,36,0.8)", background: "rgba(255,251,235,0.6)", padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", backdropFilter: "blur(4px)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(146,64,14,0.5)" }}>{dateLabel}</div>
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 9999, border: "1px solid rgba(251,191,36,0.6)", background: "#fff", color: "#f59e0b" }}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(146,64,14,0.5)" }}>Click to place</span>
        </div>
      </div>
    );
  }

  const isBand = hasEndDate && endDate;
  const accent = isBand ? "#2563eb" : "#f59e0b";
  const accentBorder = isBand ? "#60a5fa" : "#fbbf24";
  const accentBg = isBand ? "#eff6ff" : "#fffbeb";
  const accentText = isBand ? "#1e40af" : "#92400e";
  const inputBorder = isBand ? "#bfdbfe" : "#fde68a";

  return (
    <div style={{ width: 220, borderRadius: 16, border: `2px solid ${accentBorder}`, background: accentBg, padding: "10px 12px", boxShadow: "0 12px 28px -24px rgba(120,53,15,0.4)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: accentText }}>
          {dateLabel}{isBand ? ` → ${new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}` : ""}
        </div>
        <button type="button" onClick={() => onCancel && (onCancel as () => void)()} style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: 9999, background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <input ref={titleRef} type="text" placeholder={isBand ? "Band title" : "Event title"} value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...S.input, borderColor: inputBorder }} />
      <input type="text" placeholder="Lane (optional)" value={lane} onChange={(e) => setLane(e.target.value)} style={{ ...S.inputSmall, borderColor: inputBorder }} />
      <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...S.textarea, borderColor: inputBorder }} />
      <input type="text" placeholder="Tags (comma-separated)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} style={{ ...S.inputSmall, borderColor: inputBorder }} />

      <div style={{ marginTop: 8, borderTop: "1px solid rgba(226,232,240,0.6)", paddingTop: 8 }}>
        <label style={{ display: "flex", cursor: "pointer", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={hasEndDate} onChange={(e) => setHasEndDate(e.target.checked)} style={{ accentColor: "#2563eb" }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: "#475569" }}>Add end date (creates a band)</span>
        </label>
        {hasEndDate && (
          <>
            <input type="date" value={endDate} min={startIso} onChange={(e) => setEndDate(e.target.value)} style={{ ...S.inputSmall, borderColor: "#bfdbfe" }} />
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>Color:</span>
              {["#2563eb", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"].map((c) => (
                <button key={c} type="button" onClick={() => setBandColor(c)} style={{ width: 16, height: 16, borderRadius: 9999, border: bandColor === c ? "2px solid #334155" : "2px solid transparent", background: c, cursor: "pointer", transition: "border 0.15s", transform: bandColor === c ? "scale(1.1)" : "scale(1)" }} />
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={!title.trim()}
        onClick={() => {
          const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
          onConfirm && (onConfirm as (t: string, d: string, l: string, e?: string, tags?: string[], color?: string) => void)(title, description, lane, isBand ? endDate : undefined, tags.length ? tags : undefined, isBand ? bandColor : undefined);
        }}
        style={{ ...S.submitBtn, background: title.trim() ? accent : "#d1d5db", opacity: title.trim() ? 1 : 0.4 }}
      >
        {isBand ? "Add Band" : "Add Event"}
      </button>
    </div>
  );
}

// ─── BandNode ────────────────────────────────────────────────────────────────

export interface BandNodeProps {
  data: BaseNodeData;
  className?: string;
  labelClassName?: string;
  subtitleClassName?: string;
  subEventClassName?: string;
  renderContent?: (props: { label: string; subtitle: string; color: string; subEvents: Array<{ id: string; title: string; date: string; ratio: number }> }) => ReactNode;
}

export function BandNode({ data, className, renderContent }: BandNodeProps) {
  const label = typeof data.label === "string" ? data.label : "";
  const subtitle = typeof data.subtitle === "string" ? data.subtitle : "";
  const color = typeof data.color === "string" ? data.color : "#0ea5e9";
  const source = data.source as string | undefined;
  const onDelete = typeof data.onDelete === "function" ? data.onDelete : null;
  const [hovered, setHovered] = React.useState(false);
  const subEvents = Array.isArray(data.subEvents) ? (data.subEvents as Array<{ id: string; title: string; date: string; ratio: number; ts: number }>) : [];

  if (renderContent) {
    return <div className={className} style={className ? undefined : { position: "relative", width: "100%", height: "100%", borderRadius: 16, padding: "8px 12px", backgroundColor: toRgba(color, 0.75) }}>{renderContent({ label, subtitle, color, subEvents })}</div>;
  }

  return (
    <div
      className={className}
      style={className ? undefined : { position: "relative", width: "100%", height: "100%", borderRadius: 16, padding: "8px 12px", backgroundColor: toRgba(color, 0.75), boxShadow: "0 10px 24px -20px rgba(15,23,42,0.45)", transition: "all 0.2s ease-out", fontFamily: "system-ui, -apple-system, sans-serif" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {source === "user" && onDelete && (
        <button
          type="button"
          onClick={() => (onDelete as () => void)()}
          style={{ ...S.deleteBtn, ...(hovered ? S.deleteBtnVisible : S.deleteBtnHidden) }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fef2f2"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.background = "#fff"; }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8"><line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      )}
      <div style={{ ...S.bandOverlay, backgroundColor: hovered ? "transparent" : toRgba("#000", 0.08) }} />
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div style={S.bandLabel}>{label}</div>
        {subtitle ? <div style={S.bandSubtitle}>{subtitle}</div> : null}
        {subEvents.map((sub) => (
          <span key={sub.id} style={{ ...S.bandSubEvent, left: `${Math.max(0, Math.min(1, sub.ratio)) * 100}%`, transform: "translateX(-50%)" }}>
            {sub.title}<span style={S.bandSubEventDate}>{sub.date}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── createDefaultNodeTypes ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDefaultNodeTypes(Handle: React.ComponentType<any>, overrides?: {
  event?: EventNodeProps; eventStack?: EventStackNodeProps; gapBreak?: GapBreakNodeProps;
  sectionDivider?: SectionDividerNodeProps; sectionLabel?: SectionLabelNodeProps;
  axis?: AxisNodeProps; marker?: MarkerNodeProps; band?: BandNodeProps;
}) {
  const H = Handle;
  const makeEvent = (rfProps: { data: BaseNodeData }) => {
    const side = rfProps.data.side === "bottom" ? "bottom" : "top";
    return <><H id="timeline-target" type="target" position={side === "top" ? "bottom" : "top"} style={HANDLE_STYLE} /><EventNode {...(overrides?.event ?? {})} data={rfProps.data} /></>;
  };
  const makeStack = (rfProps: { data: BaseNodeData }) => {
    const side = rfProps.data.side === "bottom" ? "bottom" : "top";
    return <><H id="timeline-target" type="target" position={side === "top" ? "bottom" : "top"} style={HANDLE_STYLE} /><EventStackNode {...(overrides?.eventStack ?? {})} data={rfProps.data} /></>;
  };
  const makeMarker = (rfProps: { data: BaseNodeData }) => {
    const side = rfProps.data.side === "bottom" ? "bottom" : "top";
    return <><H id="timeline-source" type="source" position={side === "top" ? "top" : "bottom"} style={HANDLE_STYLE} /><MarkerNode {...(overrides?.marker ?? {})} data={rfProps.data} /></>;
  };
  const makeBand = (rfProps: { data: BaseNodeData }) => {
    const handles = Array.isArray(rfProps.data.connectorHandles) ? (rfProps.data.connectorHandles as Array<{ id: string; ratio: number }>) : [];
    return <>{handles.map((h) => <H key={h.id} id={h.id} type="target" position="bottom" style={{ left: `${Math.max(0, Math.min(1, h.ratio)) * 100}%`, ...HANDLE_STYLE, transform: "translate(-50%, 50%)" }} />)}<BandNode {...(overrides?.band ?? {})} data={rfProps.data} /></>;
  };
  const makeGap = (rfProps: { data: BaseNodeData }) => <GapBreakNode {...(overrides?.gapBreak ?? {})} data={rfProps.data} />;
  const makeDivider = (rfProps: { data: BaseNodeData }) => <SectionDividerNode {...(overrides?.sectionDivider ?? {})} data={rfProps.data} />;
  const makeLabel = (rfProps: { data: BaseNodeData }) => <SectionLabelNode {...(overrides?.sectionLabel ?? {})} data={rfProps.data} />;
  const makeAxis = (rfProps: { data: BaseNodeData }) => <AxisNode {...(overrides?.axis ?? {})} data={rfProps.data} />;
  const makeAddEvent = (rfProps: { data: BaseNodeData }) => {
    const side = rfProps.data.side === "bottom" ? "bottom" : "top";
    return <><H id="timeline-target" type="target" position={side === "top" ? "bottom" : "top"} style={HANDLE_STYLE} /><AddEventNode data={rfProps.data} /></>;
  };

  return { event: makeEvent, eventStack: makeStack, gapBreak: makeGap, sectionDivider: makeDivider, sectionLabel: makeLabel, axis: makeAxis, marker: makeMarker, band: makeBand, addEvent: makeAddEvent };
}
