import React from 'react';
import { TEAL, RED, AMBER, NAVY, GOLD } from './constants';

export const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  SURPASSED: { bg: "#2f847c", label: "SURPASSED" },
  POSITIVE: { bg: "#2f847c", label: "POSITIVE" },
  LAGGING: { bg: "#E65100", label: "LAGGING" },
  NEGATIVE: { bg: "#f43f5e", label: "NEGATIVE" },
};

export const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  URGENT: { bg: "#B71C1C", color: "#fff", label: "URGENT" },
  OPERATIONAL: { bg: "#1565C0", color: "#fff", label: "OPERATIONAL" },
  HR: { bg: "#2E7D32", color: "#fff", label: "HR" },
  CIRCULAR: { bg: "#4A148C", color: "#fff", label: "CIRCULAR" },
  CAMPAIGN: { bg: "#E65100", color: "#fff", label: "CAMPAIGN" },
  INFO: { bg: "#37474F", color: "#fff", label: "INFO" },
};

export const ACTION_STYLE: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  EXPLANATION: { bg: "#FFF3E0", border: "#FFB74D", icon: "⚠️", label: "PoA / Explanation" },
  APPRECIATION: { bg: "#E8F5E9", border: "#66BB6A", icon: "🏆", label: "Appreciation" },
  AUDIT: { bg: "#EDE7F6", border: "#9575CD", icon: "📋", label: "Audit Observation" },
};

const NAVY_CONST = "#21357f";
const GOLD_CONST = "#d4af37";
const TEAL_CONST = "#2f847c";
const RED_CONST = "#C62828";
const AMBER_CONST = "#E65100";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.LAGGING;
  return (
    <span style={{
      background: s.bg, color: "#fff", fontSize: 10.5, fontWeight: 900,
      padding: "2px 7px", borderRadius: 2, letterSpacing: "0.1em",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    }}>{s.label}</span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE.INFO;
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 800,
      padding: "2px 8px", borderRadius: 3, letterSpacing: "0.08em",
    }}>{s.label}</span>
  );
}

export function Growth({ value, display }: { value: any; display: string }) {
  const n = Number(value || 0);
  const color = n > 0 ? TEAL_CONST : n < 0 ? RED_CONST : AMBER_CONST;
  const arrow = n > 0 ? "▲" : n < 0 ? "▼" : "→";
  return (
    <span style={{ color, fontWeight: 800, fontSize: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
      {arrow} {display || "0"}
    </span>
  );
}
