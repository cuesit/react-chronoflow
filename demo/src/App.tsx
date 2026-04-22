import { useCallback, useMemo, useState } from "react";
import {
  type TimelineBandEvent,
  type TimelinePointEvent,
  type SectionGranularity,
  TimelineFlow,
} from "react-chronoflow";
import * as xyflow from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "react-chronoflow/styles.css";

// ─── Full demo data ──────────────────────────────────────────────────────────

const FULL_EVENTS: TimelinePointEvent[] = [
  { id: "evt-01", title: "Intake Call", date: "2020-11-04", lane: "Deal Ops", side: "top", description: "First fake contact logged." },
  { id: "evt-02", title: "Sandbox Created", date: "2020-12-01", lane: "Platform", side: "bottom" },
  { id: "evt-03", title: "Mock LOI Drafted", date: "2021-01-26", lane: "Legal", side: "top" },
  { id: "evt-04", title: "Synthetic Data Import", date: "2021-02-03", lane: "Data", side: "bottom" },
  { id: "evt-05", title: "Vendor Walkthrough", date: "2021-02-06", lane: "Operations", side: "top" },
  { id: "evt-06", title: "Capacity Assessment", date: "2023-10-26", lane: "Technical", side: "bottom" },
  { id: "evt-07", title: "Steering Meeting", date: "2023-10-27", lane: "Meeting", side: "top" },
  { id: "evt-08", title: "Risk Register v1", date: "2023-11-02", lane: "Risk", side: "bottom" },
  { id: "evt-09", title: "Ops Incident Drill", date: "2023-12-31", lane: "Operations", side: "bottom" },
  { id: "evt-10", title: "Baseline KPIs", date: "2024-01-05", lane: "Analytics", side: "top" },
  { id: "evt-11", title: "Synthetic Debt Stack", date: "2024-01-17", lane: "Finance", side: "bottom" },
  { id: "evt-12", title: "Compliance Mock Audit", date: "2024-03-03", lane: "Compliance", side: "top" },
  { id: "evt-13", title: "Scenario Replay", date: "2024-03-16", lane: "Simulation", side: "bottom" },
  { id: "evt-14", title: "Relationship Backfill", date: "2024-03-18", lane: "Graph", side: "top" },
  { id: "evt-15", title: "NER Calibration", date: "2024-03-19", lane: "NLP", side: "bottom" },
  { id: "evt-16", title: "People Graph Refresh", date: "2024-03-21", lane: "Graph", side: "top" },
  { id: "evt-17", title: "Executive Dry Run", date: "2025-06-11", lane: "Reporting", side: "bottom" },
  { id: "evt-18", title: "Report Generation", date: "2026-03-17", lane: "Reporting", side: "top" },
  { id: "evt-19", title: "Report Publication", date: "2026-03-17", lane: "Reporting", side: "bottom" },
  { id: "evt-20", title: "Mock Closing", date: "2026-03-18", lane: "Deal Ops", side: "top" },
];

const FULL_BANDS: TimelineBandEvent[] = [
  { id: "band-01", title: "Contract Lifetime", start: "2021-01-26", end: "2026-03-18", color: "#2563eb" },
  { id: "band-02", title: "Diligence Sprint", start: "2023-10-20", end: "2024-03-25", color: "#0ea5e9", lane: "Ops + Data" },
  { id: "band-03", title: "Reporting Program", start: "2025-05-20", end: "2026-03-20", color: "#8b5cf6" },
];

const FULL_BAND_SUB_EVENTS = {
  "band-02": [
    { id: "kickoff", title: "Kickoff", date: "2023-10-23" },
    { id: "risk-review", title: "Risk Review", date: "2023-11-10" },
    { id: "ner-calibration", title: "NER Calibration", date: "2024-02-14" },
    { id: "people-graph", title: "People Graph", date: "2024-03-18" },
  ],
};

// ─── Compact showcase data ───────────────────────────────────────────────────

const COMPACT_EVENTS: TimelinePointEvent[] = [
  // Dense cluster: early-mid Jan 2024 — offset from band start
  { id: "c-01", title: "Contract Signed", date: "2024-01-06", lane: "Legal", side: "top" },
  { id: "c-02", title: "Onboarding Kick-off", date: "2024-01-10", lane: "Ops", side: "bottom" },
  { id: "c-03", title: "Data Room Access", date: "2024-01-14", lane: "Data", side: "top" },
  { id: "c-04", title: "Compliance Check", date: "2024-01-19", lane: "Compliance", side: "bottom" },
  { id: "c-05", title: "Stakeholder Intro", date: "2024-01-25", lane: "Ops", side: "top" },
  // ~10 month gap
  // Dense cluster: late Nov 2024 – mid Jan 2025
  { id: "c-06", title: "Audit Prep", date: "2024-11-28", lane: "Compliance", side: "bottom" },
  { id: "c-07", title: "Final Review", date: "2024-12-09", lane: "Legal", side: "top" },
  { id: "c-08", title: "Report Delivered", date: "2024-12-20", lane: "Reporting", side: "bottom" },
  { id: "c-09", title: "Board Presentation", date: "2025-01-08", lane: "Leadership", side: "top" },
  { id: "c-10", title: "Deal Closed", date: "2025-01-20", lane: "Deal Ops", side: "bottom" },
];

const COMPACT_BANDS: TimelineBandEvent[] = [
  { id: "cb-01", title: "Due Diligence", start: "2024-01-03", end: "2024-02-02", color: "#2563eb" },
  { id: "cb-02", title: "Closing Sprint", start: "2024-11-18", end: "2025-01-28", color: "#8b5cf6" },
];

const COMPACT_BAND_SUB_EVENTS = {
  "cb-01": [
    { id: "cs-01", title: "Vendor Screen", date: "2024-01-11" },
    { id: "cs-02", title: "Risk Assessment", date: "2024-01-22" },
  ],
  "cb-02": [
    { id: "cs-03", title: "Draft Report", date: "2024-12-05" },
    { id: "cs-04", title: "Legal Sign-off", date: "2024-12-28" },
    { id: "cs-05", title: "Final Approvals", date: "2025-01-15" },
  ],
};

// ─── App ─────────────────────────────────────────────────────────────────────

type Tab = "full" | "compact";

let nextId = 100;

export default function App() {
  const [tab, setTab] = useState<Tab>("compact");
  const [sectionGranularity, setSectionGranularity] = useState<SectionGranularity>("year");
  const [allExpanded, setAllExpanded] = useState(false);
  const [userEvents, setUserEvents] = useState<TimelinePointEvent[]>([]);
  const [userBands, setUserBands] = useState<TimelineBandEvent[]>([]);

  const compactEvents = useMemo(() => [...COMPACT_EVENTS, ...userEvents], [userEvents]);
  const compactBands = useMemo(() => [...COMPACT_BANDS, ...userBands], [userBands]);

  const handleAddEvent = useCallback((data: {
    title: string; date: Date; endDate?: Date; description?: string; lane?: string; tags?: string[]; color?: string; type: "event" | "band";
  }) => {
    const id = `user-${nextId++}`;
    if (data.type === "band" && data.endDate) {
      setUserBands((prev) => [...prev, {
        id,
        title: data.title,
        start: data.date.toISOString().slice(0, 10),
        end: data.endDate!.toISOString().slice(0, 10),
        lane: data.lane,
        color: data.color ?? "#2563eb",
        tags: data.tags,
        source: "user",
      }]);
    } else {
      setUserEvents((prev) => [...prev, {
        id,
        title: data.title,
        date: data.date.toISOString().slice(0, 10),
        description: data.description,
        lane: data.lane,
        tags: data.tags,
        source: "user",
      }]);
    }
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setUserEvents((prev) => prev.filter((e) => e.id !== id));
    setUserBands((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4 text-slate-900">
      <div className="mb-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">react-chronoflow</h1>
            <p className="text-sm text-slate-600">ReactFlow-powered timeline with gap compression, clustering, and bands.</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTab("compact")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === "compact" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Showcase
            </button>
            <button
              type="button"
              onClick={() => setTab("full")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === "full" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Full Demo
            </button>
          </div>
        </div>
      </div>

      {tab === "compact" ? (
        <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]">
          <xyflow.ReactFlowProvider>
            <TimelineFlow
              events={compactEvents}
              bands={compactBands}
              bandSubEvents={COMPACT_BAND_SUB_EVENTS}
              xyflow={xyflow}
              sectionGranularity="month"
              maxGapDays={45}
              compressionRatio={0.02}
              clusterGapDays={10}
              eventStackNodeProps={{ fanLayout: "explosion" }}
              height="520px"
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              showFilters
            />
          </xyflow.ReactFlowProvider>
        </main>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-800">Controls</h2>
            <div className="space-y-3 text-sm">
              <label className="block border-t border-slate-100 pt-2">
                <div className="mb-1 text-slate-600">Timeline Sections</div>
                <select
                  value={sectionGranularity}
                  onChange={(e) => setSectionGranularity(e.target.value as SectionGranularity)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5"
                >
                  <option value="year">By year</option>
                  <option value="month">By month</option>
                </select>
              </label>

              <div className="border-t border-slate-100 pt-2">
                <div className="mb-1 text-slate-600">Timeline Scale</div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setAllExpanded(false)}
                    className={`rounded-md px-3 py-1.5 text-sm ${!allExpanded ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                  >
                    Retracted
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllExpanded(true)}
                    className={`rounded-md px-3 py-1.5 text-sm ${allExpanded ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                  >
                    Expanded
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]">
            <xyflow.ReactFlowProvider>
              <TimelineFlow
                events={FULL_EVENTS}
                bands={FULL_BANDS}
                bandSubEvents={FULL_BAND_SUB_EVENTS}
                sectionGranularity={sectionGranularity}
                allExpanded={allExpanded}
                maxGapDays={90}
                compressionRatio={0.02}
                clusterGapDays={18}
                eventStackNodeProps={{ fanLayout: "explosion" }}
                xyflow={xyflow}
              />
            </xyflow.ReactFlowProvider>
          </main>
        </div>
      )}
    </div>
  );
}
