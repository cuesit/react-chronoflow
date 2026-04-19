# react-chronoflow

ReactFlow-powered timeline with automatic gap compression, event clustering, duration bands, and fully customizable nodes.

## Features

- **Gap compression** -- large empty periods automatically compress with clickable break markers to expand/collapse
- **Event clustering** -- nearby events stack into expandable fan-out groups
- **Duration bands** -- date-range bars with sub-event markers and color-matched edges
- **Section dividers** -- year/month partitions with labels
- **Collision avoidance** -- smart card placement prevents overlap
- **Fully customizable** -- every node type accepts className overrides, render props, or full component replacement
- **Headless builder** -- use `buildTimelineFlow()` directly for custom rendering
- **Animated transitions** -- smooth viewport reflow on compress/expand

## Install

```bash
npm install react-chronoflow @xyflow/react
```

## Quick Start

```tsx
import { TimelineFlow } from "react-chronoflow";
import * as xyflow from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const events = [
  { id: "1", title: "Kickoff", date: "2023-01-15", lane: "Ops", side: "top" },
  { id: "2", title: "Review", date: "2023-06-20", lane: "Eng", side: "bottom" },
  { id: "3", title: "Launch", date: "2024-03-01", lane: "Product", side: "top" },
];

const bands = [
  { id: "b1", title: "Phase 1", start: "2023-01-01", end: "2023-07-01", color: "#2563eb" },
  { id: "b2", title: "Phase 2", start: "2023-07-01", end: "2024-04-01", color: "#8b5cf6" },
];

function App() {
  return (
    <xyflow.ReactFlowProvider>
      <TimelineFlow
        events={events}
        bands={bands}
        xyflow={xyflow}
        height="600px"
      />
    </xyflow.ReactFlowProvider>
  );
}
```

## Props

### `TimelineFlow`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `events` | `TimelinePointEvent[]` | required | Point events on the timeline |
| `bands` | `TimelineBandEvent[]` | `[]` | Duration bands (date ranges) |
| `xyflow` | `typeof import("@xyflow/react")` | required | The @xyflow/react module |
| `maxGapDays` | `number` | `90` | Gaps longer than this get break markers |
| `compressionRatio` | `number` | `0.02` | How much compressed gaps shrink (0-1) |
| `clusterGapDays` | `number` | `18` | Events within this many days cluster |
| `sectionGranularity` | `"year" \| "month"` | `"year"` | Section divider granularity |
| `allExpanded` | `boolean` | `false` | Force all gaps expanded |
| `bandSubEvents` | `Record<string, SubEvent[]>` | `{}` | Sub-events inside bands |
| `height` | `string \| number` | `"820px"` | Container height |
| `className` | `string` | -- | Container className |
| `minZoom` / `maxZoom` | `number` | `0.1` / `1.6` | Zoom limits |
| `fitViewPadding` | `number` | `0.12` | Padding for auto-fit |
| `fitViewDuration` | `number` | `400` | Animation duration (ms) for reflow |
| `onToggleGap` | `(gapKey: string) => void` | -- | Callback when a gap is toggled |
| `children` | `ReactNode` | -- | Custom ReactFlow children (replaces default MiniMap/Controls/Background) |

### Node Customization

Every node type can be customized via props or fully replaced:

```tsx
<TimelineFlow
  events={events}
  xyflow={xyflow}
  // Override styles on default nodes
  eventNodeProps={{
    className: "rounded-lg border border-gray-200 bg-white px-3 py-2 shadow",
    dateClassName: "text-xs text-gray-500",
    titleClassName: "text-sm font-medium text-gray-900",
  }}
  // Custom gap break icon
  gapBreakNodeProps={{
    renderIcon: ({ compressed }) => (
      <span>{compressed ? "..." : "<>"}</span>
    ),
  }}
  // Custom band content
  bandNodeProps={{
    renderContent: ({ label, subtitle, color }) => (
      <div style={{ color: "white" }}>
        <strong>{label}</strong>
        <p>{subtitle}</p>
      </div>
    ),
  }}
  // Fully replace a node type
  nodeTypes={{
    event: MyCustomEventNode,
  }}
/>
```

### Available Node Props

| Prop | Customizes |
|------|-----------|
| `eventNodeProps` | Single event cards |
| `eventStackNodeProps` | Clustered event stacks with fan-out |
| `gapBreakNodeProps` | Compress/expand break markers |
| `bandNodeProps` | Duration band bars |
| `markerNodeProps` | Axis marker dots |
| `axisNodeProps` | The timeline axis line |
| `sectionDividerNodeProps` | Vertical section dividers |
| `sectionLabelNodeProps` | Year/month labels |

Each accepts `className` for styling and `renderContent` (or `renderIcon`, `renderLabel`) for full control.

## Headless Usage

Use the layout builder directly if you want full control over rendering:

```tsx
import { buildTimelineFlow } from "react-chronoflow";

const { nodes, edges, gaps, sections, toX } = buildTimelineFlow(
  events,
  bands,
  {
    maxGapDays: 90,
    compressionRatio: 0.02,
    clusterGapDays: 18,
    sectionGranularity: "year",
    expandedGapKeys: new Set(["key1"]),
    bandSubEvents: {
      "band-1": [{ id: "sub1", title: "Milestone", date: "2023-03-15" }],
    },
  },
);

// Use nodes/edges with your own ReactFlow setup
// Or map them to any rendering system
```

## Event Types

```ts
interface TimelinePointEvent {
  id: string;
  title: string;
  date: string | number | Date;
  description?: string;
  lane?: string;
  side?: "top" | "bottom" | "auto";
  color?: string;
  className?: string;
  style?: CSSProperties;
}

interface TimelineBandEvent {
  id: string;
  title: string;
  start: string | number | Date;
  end: string | number | Date;
  lane?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}
```

## Domain Graph Adapter

For advanced use cases, `compileDomainToReactFlow` converts a domain graph (with edge-to-edge link support) into ReactFlow nodes/edges:

```tsx
import { compileDomainToReactFlow } from "react-chronoflow";

const { nodes, edges } = compileDomainToReactFlow({
  nodes: [
    { id: "A", position: { x: 0, y: 0 } },
    { id: "B", position: { x: 300, y: 0 } },
  ],
  links: [
    { id: "e1", source: { kind: "node", id: "A" }, target: { kind: "node", id: "B" } },
    // Edge-to-edge links are supported via hidden anchor nodes
    { id: "e2", source: { kind: "node", id: "C" }, target: { kind: "edge", id: "e1" } },
  ],
});
```

## CSS Required

The fan-out animation for event stacks requires these CSS rules (included if you use the demo's styles, or add them to your own stylesheet):

```css
.fan-card {
  transform: translate(var(--stack-x, 0px), var(--stack-y, 0px));
  opacity: var(--stack-opacity, 0);
}
.group:hover .fan-card {
  transform: translate(var(--fan-x, 0px), var(--fan-y, 0px));
  opacity: 1;
}
.group:hover .fan-card-inner {
  border-color: rgb(251 191 36);
  background-color: rgb(255 251 235);
  box-shadow: 0 12px 28px -24px rgba(15, 23, 42, 0.55);
}
.group:hover .fan-card-content {
  opacity: 1;
  transition-delay: 120ms;
}
```

## Demo

A full demo app is included in `demo/`:

```bash
npm --prefix demo install
npm run build
npm run demo:dev
```

## License

MIT
