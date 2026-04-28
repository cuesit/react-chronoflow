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

// ─── 100 Water St sample data ────────────────────────────────────────────────

type WaterStBandEvent = TimelineBandEvent & { description: string };

const WATER_ST_EVENTS: TimelinePointEvent[] = [
  {
    id: "water-evt-1",
    title: "Land Court Plan No. 4012a",
    date: "1912-08-22",
    lane: "Title",
    side: "top",
    description: "Plan authored by Holyoke Water Power Company. Entity: land court plan #4012a.",
    tags: ["Document"],
  },
  {
    id: "water-evt-2",
    title: "Land Patent Filing",
    date: "1912-11-22",
    lane: "Title",
    side: "bottom",
    description: "Filing date for Land Patent #4032. Entity: land patent #4032.",
    tags: ["Document"],
  },
  {
    id: "water-evt-3",
    title: "Easement Agreement Recorded",
    date: "1954-04-28",
    lane: "Title",
    side: "top",
    description: "Easement recorded in Book 2307, Page 68. Entity: easement - 1954.",
    tags: ["Encumbrance"],
  },
  {
    id: "water-evt-4",
    title: "Steam and Water Easement",
    date: "1965-10-26",
    lane: "Title",
    side: "bottom",
    description: "Easement recorded in Book 5218, Page 133. Entity: steam and water easement.",
    tags: ["Encumbrance"],
  },
  {
    id: "water-evt-5",
    title: "Heritage Survey Service",
    date: "1966-03-14",
    lane: "Title",
    side: "top",
    description: "Survey services performed by Heritage Surveys. Entity: heritage surveys.",
    tags: ["Organization"],
  },
  {
    id: "water-evt-6",
    title: "Notice to Prevent Easement",
    date: "1977-11-01",
    lane: "Title",
    side: "bottom",
    description: "Grantee: National Blank Book Company; recorded in Book 4530, Page 156. Entity: notice to prevent easement.",
    tags: ["Encumbrance"],
  },
  {
    id: "water-evt-7",
    title: "Steam Line Easement",
    date: "1996-03-21",
    lane: "Title",
    side: "top",
    description: "Grantee: City of Holyoke Gas & Electric Department; recorded in Book 9424, Page 108. Entity: steam line easement.",
    tags: ["Encumbrance"],
  },
  {
    id: "water-evt-8",
    title: "Flood Hazard Map Designation",
    date: "2013-07-16",
    lane: "Environmental",
    side: "bottom",
    description: "Property identified in Flood Hazard Zone X (Map 25013C0192E). Entity: flood hazard zone x.",
    tags: ["Condition"],
  },
  {
    id: "water-evt-9",
    title: "Notice to Prevent Easements",
    date: "2017-02-22",
    lane: "Title",
    side: "top",
    description: "Grantee: Hampden Glazed Paper & Card Company; Book 2000, Page 156. Entity: notice to prevent easements.",
    tags: ["Encumbrance"],
  },
  {
    id: "water-evt-10",
    title: "Title Commitment Issued",
    date: "2021-08-23",
    lane: "Title",
    side: "bottom",
    description: "Stewart Title Guaranty commitment #21000070011. Entity: title commitment #21000070011.",
    tags: ["Document"],
  },
  {
    id: "water-evt-11",
    title: "ALTA/NSPS Land Title Survey",
    date: "2021-08-27",
    lane: "Title",
    side: "top",
    description: "Survey completed by Heritage Land Surveying & Engineering. Entity: alta/nsps land title survey.",
    tags: ["Document"],
  },
  {
    id: "water-evt-12",
    title: "Historical Sale Date",
    date: "2021-09-15",
    lane: "Title",
    side: "bottom",
    description: "Sale date recorded in Basis of Design Questionnaire. Entity: Basis of Design Questionnaire.",
    tags: ["Property"],
  },
  {
    id: "water-evt-13",
    title: "Fire Alarm System Inspection",
    date: "2022-01-01",
    lane: "Regulatory",
    side: "top",
    description: "Most recent pull-down fire alarm system inspection. Entity: fire alarm system.",
    tags: ["Condition"],
  },
  {
    id: "water-evt-14",
    title: "Building Permit & Preliminary Drawing",
    date: "2022-03-24",
    lane: "Regulatory",
    side: "bottom",
    description: "Preliminary building permit #21005 and associated drawings issued. Entity: building permit #21005.",
    tags: ["Permit"],
  },
  {
    id: "water-evt-15",
    title: "Estate Date of Death",
    date: "2022-08-19",
    lane: "Title",
    side: "top",
    description: "Date of death for Daniel Francis Griffin (Docket HD22P2487EA) relevant to title chain. Entity: estate of daniel francis griffin.",
    tags: ["Document"],
  },
  {
    id: "water-evt-16",
    title: "Data Center Tax Exemption Effective",
    date: "2025-01-08",
    lane: "Regulatory",
    side: "bottom",
    description: "Massachusetts sales and use tax exemption for data center purchases. Entity: qualified data center purchases now eligible for massachusetts sales and use tax exemption.",
    tags: ["Document"],
  },
  {
    id: "water-evt-17",
    title: "Zoning Ordinance Amendment",
    date: "2026-01-20",
    lane: "Regulatory",
    side: "top",
    description: "Amendment to prohibit data center use in Industrial General (IG) district. Entity: holyoke zoning ordinance.",
    tags: ["Document"],
  },
  {
    id: "water-evt-18",
    title: "Zoning Verification Submission",
    date: "2026-02-02",
    lane: "Regulatory",
    side: "bottom",
    description: "Submission date for zoning verification request. Entity: zoning verification letter.",
    tags: ["Document"],
  },
  {
    id: "water-evt-19",
    title: "Zoning Verification Letter Issued",
    date: "2026-02-05",
    lane: "Regulatory",
    side: "top",
    description: "Zoning designation confirmed as IG within AIOD overlay. Entity: zoning verification letter.",
    tags: ["Document"],
  },
  {
    id: "water-evt-20",
    title: "PSA Effective Date",
    date: "2026-03-01",
    lane: "Deal Milestone",
    side: "bottom",
    description: "Effective date of the Purchase and Sale Agreement. Entity: purchase and sale agreement.",
    tags: ["Document"],
  },
  {
    id: "water-evt-21",
    title: "Projected Closing Date",
    date: "2026-07-01",
    lane: "Deal Milestone",
    side: "top",
    description: "Estimated closing with buyer Chestnut River. Entity: chestnut river.",
    tags: ["Organization"],
  },
];

const WATER_ST_BANDS: WaterStBandEvent[] = [
  {
    id: "water-band-1",
    title: "Inspection Period",
    start: "2026-03-01",
    end: "2026-05-30",
    lane: "Deal Milestone",
    color: "#0f766e",
    description: "90-day initial inspection period with two 30-day extension options. Entity: purchase agreement.",
    tags: ["Contract"],
  },
  {
    id: "water-band-2",
    title: "Senior Mortgage Interest-Only Period",
    start: "2026-07-01",
    end: "2027-07-01",
    lane: "Financing",
    color: "#7c3aed",
    description: "12-month interest-only period within a 24-month total term. Entity: senior first mortgage.",
    tags: ["Loan"],
  },
];

const WATER_ST_BAND_SUB_EVENTS = {
  "water-band-1": [
    { id: "water-sub-1", title: "Access", date: "2026-03-12" },
    { id: "water-sub-2", title: "ESA", date: "2026-03-13" },
    { id: "water-sub-3", title: "Survey", date: "2026-03-14" },
    { id: "water-sub-4", title: "Title", date: "2026-03-16" },
    { id: "water-sub-5", title: "Utility", date: "2026-03-18" },
  ],
};

// ─── App ─────────────────────────────────────────────────────────────────────

type Tab = "full" | "compact" | "water-st";

let nextId = 100;

export default function App() {
  const [tab, setTab] = useState<Tab>("water-st");
  const [sectionGranularity, setSectionGranularity] = useState<SectionGranularity>("year");
  const [allExpanded, setAllExpanded] = useState(false);
  const [userEvents, setUserEvents] = useState<TimelinePointEvent[]>([]);
  const [userBands, setUserBands] = useState<TimelineBandEvent[]>([]);
  const [userBandSubEvents, setUserBandSubEvents] = useState<Record<string, Array<{ id: string; title: string; date: string }>>>({});

  const compactEvents = useMemo(() => [...COMPACT_EVENTS, ...userEvents], [userEvents]);
  const compactBands = useMemo(() => [...COMPACT_BANDS, ...userBands], [userBands]);
  const allBandSubEvents = useMemo(() => ({ ...COMPACT_BAND_SUB_EVENTS, ...userBandSubEvents }), [userBandSubEvents]);

  const handleAddEvent = useCallback((data: {
    title: string; date: Date; endDate?: Date; description?: string; lane?: string; tags?: string[]; color?: string; subEvents?: Array<{ id: string; title: string; date: string }>; type: "event" | "band";
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
      if (data.subEvents?.length) {
        setUserBandSubEvents((prev) => ({ ...prev, [id]: data.subEvents! }));
      }
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
    setUserBandSubEvents((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleEditEvent = useCallback((id: string, updates: { title?: string; lane?: string; description?: string; tags?: string[] }) => {
    setUserEvents((prev) => prev.map((e) => e.id === id ? { ...e, ...updates } : e));
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
              onClick={() => setTab("water-st")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === "water-st" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              100 Water St
            </button>
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
              bandSubEvents={allBandSubEvents}
              xyflow={xyflow}
              sectionGranularity="month"
              maxGapDays={45}
              compressionRatio={0.02}
              clusterGapDays={10}
              eventStackNodeProps={{ fanLayout: "explosion" }}
              height="520px"
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              onEditEvent={handleEditEvent}
              showFilters
            />
          </xyflow.ReactFlowProvider>
        </main>
      ) : tab === "water-st" ? (
        <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]">
          <xyflow.ReactFlowProvider>
            <TimelineFlow
              events={WATER_ST_EVENTS}
              bands={WATER_ST_BANDS}
              bandSubEvents={WATER_ST_BAND_SUB_EVENTS}
              xyflow={xyflow}
              sectionGranularity="year"
              maxGapDays={365}
              compressionRatio={0.015}
              clusterGapDays={14}
              edgeStiffness={0.9}
              eventStackNodeProps={{ fanLayout: "explosion" }}
              height="680px"
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
