import { useMemo, useState, useCallback } from "react";
import {
  type TimelineBandEvent,
  type TimelinePointEvent,
  type SectionGranularity,
  TimelineFlow,
} from "react-chronoflow";
import * as xyflow from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const BASE_EVENTS: TimelinePointEvent[] = [
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

const BANDS: TimelineBandEvent[] = [
  { id: "band-01", title: "Contract Lifetime", start: "2021-01-26", end: "2026-03-18", color: "#2563eb" },
  { id: "band-02", title: "Diligence Sprint", start: "2023-10-20", end: "2024-03-25", color: "#0ea5e9", lane: "Ops + Data" },
  { id: "band-03", title: "Reporting Program", start: "2025-05-20", end: "2026-03-20", color: "#8b5cf6" },
];

const BAND_SUB_EVENTS = {
  "band-02": [
    { id: "kickoff", title: "Kickoff", date: "2023-10-23" },
    { id: "risk-review", title: "Risk Review", date: "2023-11-10" },
    { id: "ner-calibration", title: "NER Calibration", date: "2024-02-14" },
    { id: "people-graph", title: "People Graph", date: "2024-03-18" },
  ],
};

export default function App() {
  const [sectionGranularity, setSectionGranularity] = useState<SectionGranularity>("year");
  const [allExpanded, setAllExpanded] = useState(false);
  const events = useMemo(() => BASE_EVENTS, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-4 text-slate-900">
      <div className="mb-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">React Smart Timeline Lab</h1>
            <p className="text-sm text-slate-600">React Flow timeline mode with section grouping.</p>
          </div>
        </div>
      </div>

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
              <p className="mt-1 text-xs text-slate-500">Switches the vertical timeline partitions.</p>
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
              <p className="mt-1 text-xs text-slate-500">Retracted compresses long quiet gaps; expanded uses full time spacing.</p>
            </div>
          </div>
        </aside>

        <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]">
          <xyflow.ReactFlowProvider>
            <TimelineFlow
              events={events}
              bands={BANDS}
              bandSubEvents={BAND_SUB_EVENTS}
              sectionGranularity={sectionGranularity}
              allExpanded={allExpanded}
              maxGapDays={90}
              compressionRatio={0.02}
              clusterGapDays={18}
              xyflow={xyflow}
            />
          </xyflow.ReactFlowProvider>
        </main>
      </div>
    </div>
  );
}
