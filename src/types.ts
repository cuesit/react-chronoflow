import type { CSSProperties } from "react";

export type TimelineDate = string | number | Date;

export type EventSide = "top" | "bottom" | "auto";

export interface TimelinePointEvent {
  id: string;
  title: string;
  date: TimelineDate;
  description?: string;
  lane?: string;
  side?: EventSide;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export interface TimelineBandEvent {
  id: string;
  title: string;
  start: TimelineDate;
  end: TimelineDate;
  lane?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}
