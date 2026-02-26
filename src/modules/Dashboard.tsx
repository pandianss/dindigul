// @ts-nocheck
import { useState, useEffect, useRef } from "react";

// ── Data ─────────────────────────────────────────────────────────────────────

// Remove hardcoded SRM_MESSAGE, TICKER_ITEMS, and ANNOUNCEMENTS.
// They will be loaded dynamically from the backend API.

const PENDING_ACTIONS = [
  { id: 1, type: "EXPLANATION", branch: "Chinnamanur (1560)", param: "Gross NPA", due: "25 Feb", status: "DRAFT", urgent: true },
  { id: 2, type: "EXPLANATION", branch: "Uthamapalayam (1919)", param: "SMA-0", due: "25 Feb", status: "DRAFT", urgent: true },
  { id: 3, type: "APPRECIATION", branch: "Dindigul Fort (1314)", param: "January Perf.", due: "28 Feb", status: "READY", urgent: false },
  { id: 4, type: "AUDIT", branch: "Cumbum (0176)", param: "Q3 Submission", due: "28 Feb", status: "PENDING", urgent: true },
  { id: 5, type: "AUDIT", branch: "Uthamapalayam (1919)", param: "Q3 Submission", due: "28 Feb", status: "PENDING", urgent: true },
  { id: 6, type: "APPRECIATION", branch: "Palani (0376)", param: "Jan Deposits", due: "01 Mar", status: "READY", urgent: false },
];

const UPCOMING_EVENTS = [
  { date: "25 Feb", day: "Wed", label: "MUDRA Loan Camp — Palani", type: "CAMP" },
  { date: "28 Feb", day: "Sat", label: "Q3 Audit Submission Deadline", type: "DEADLINE" },
  { date: "01 Mar", day: "Sun", label: "CBS Maintenance 01–04 AM", type: "SYSTEM" },
  { date: "05 Mar", day: "Thu", label: "Self-Appraisal Window Closes", type: "HR" },
  { date: "07 Mar", day: "Sat", label: "RBI MPC Review", type: "RBI" },
  { date: "31 Mar", day: "Tue", label: "Financial Year End", type: "FY_END" },
];

// KPI data (condensed from previous dashboard)
const KPIS = [
  { label: "Total Deposits", val: "₹1,698 Cr", budget: "₹1,850 Cr", pace: -3.2, status: "LAGGING" },
  { label: "Total Advances", val: "₹1,243 Cr", budget: "₹1,420 Cr", pace: -3.1, status: "LAGGING" },
  { label: "Gross NPA Ratio", val: "5.17%", budget: "4.50%", pace: -6.2, status: "POSITIVE", lower: true },
  { label: "CASA Ratio", val: "36.0%", budget: "38.0%", pace: -0.8, status: "LAGGING" },
  { label: "Op. Profit", val: "₹11.2 Cr", budget: "₹12.8 Cr", pace: 4.6, status: "SURPASSED" },
  { label: "Digital Txns", val: "84,620", budget: "90,000", pace: 8.4, status: "SURPASSED" },
];

// ── Style constants ──────────────────────────────────────────────────────────
const NAVY = "#21357f"; // bank-navy
const TEAL = "#2f847c"; // bank-teal
const GOLD = "#d4af37"; // bank-gold
const RED = "#C62828";
const GREEN = "#2E7D32";
const AMBER = "#E65100";
const BLUE = "#1565C0";

const STATUS_STYLE = {
  SURPASSED: { bg: "#2f847c", label: "SURPASSED" }, // bank-teal
  POSITIVE: { bg: "#2f847c", label: "POSITIVE" },
  LAGGING: { bg: AMBER, label: "LAGGING" },
  NEGATIVE: { bg: "#f43f5e", label: "NEGATIVE" }, // rose-500
};

const TYPE_STYLE = {
  URGENT: { bg: "#B71C1C", color: "#fff", label: "URGENT" },
  OPERATIONAL: { bg: "#1565C0", color: "#fff", label: "OPERATIONAL" },
  HR: { bg: "#2E7D32", color: "#fff", label: "HR" },
  CIRCULAR: { bg: "#4A148C", color: "#fff", label: "CIRCULAR" },
  CAMPAIGN: { bg: "#E65100", color: "#fff", label: "CAMPAIGN" },
  INFO: { bg: "#37474F", color: "#fff", label: "INFO" },
};

const ACTION_STYLE = {
  EXPLANATION: { bg: "#FFF3E0", border: "#FFB74D", icon: "⚠️", label: "Explanation Letter" },
  APPRECIATION: { bg: "#E8F5E9", border: "#66BB6A", icon: "🏆", label: "Appreciation Letter" },
  AUDIT: { bg: "#EDE7F6", border: "#9575CD", icon: "📋", label: "Audit Pending" },
};

const EVENT_STYLE = {
  CAMP: "#0E7C7B",
  DEADLINE: "#C62828",
  SYSTEM: "#546E7A",
  HR: "#2E7D32",
  RBI: "#4A148C",
  FY_END: "#C9A84C",
};

// ── Ticker component ──────────────────────────────────────────────────────────
function Ticker({ items = [] }) {
  const [pos, setPos] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || items.length === 0) return;
    let raf;
    let x = 0;
    const speed = 0.5;
    const animate = () => {
      x -= speed;
      if (x < -el.scrollWidth / 2) x = 0;
      el.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [items]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div style={{
      background: NAVY, overflow: "hidden", height: 36,
      display: "flex", alignItems: "center",
      borderBottom: `2px solid ${GOLD}`,
    }}>
      <div style={{
        background: GOLD, color: NAVY,
        fontSize: 13, fontWeight: 900, padding: "0 14px", height: "100%",
        display: "flex", alignItems: "center", whiteSpace: "nowrap",
        letterSpacing: "0.12em", flexShrink: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}>
        LIVE FEED
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div ref={ref} style={{ display: "flex", whiteSpace: "nowrap" }}>
          {doubled.map((item, i) => (
            <span key={i} style={{
              fontSize: 14, color: "rgba(255,255,255,0.85)", padding: "0 32px",
              fontWeight: 500, letterSpacing: "0.02em", flexShrink: 0,
            }}>
              {item}
              <span style={{ color: GOLD, margin: "0 16px", opacity: 0.5 }}>|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Badge components ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.LAGGING;
  return (
    <span style={{
      background: s.bg, color: "#fff", fontSize: 10.5, fontWeight: 900,
      padding: "2px 7px", borderRadius: 2, letterSpacing: "0.1em",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    }}>{s.label}</span>
  );
}

function TypeBadge({ type }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE.INFO;
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 800,
      padding: "2px 8px", borderRadius: 3, letterSpacing: "0.08em",
    }}>{s.label}</span>
  );
}

function Pace({ val }) {
  const n = parseFloat(val);
  const color = n > 0 ? TEAL : n < -2 ? RED : AMBER;
  const arrow = n > 0 ? "▲" : n < 0 ? "▼" : "→";
  return (
    <span style={{ color, fontWeight: 800, fontSize: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
      {arrow} {Math.abs(n).toFixed(1)}%
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [activeNotice, setActiveNotice] = useState(null);
  const [announcementFilter, setAnnouncementFilter] = useState("ALL");
  const [msgExpanded, setMsgExpanded] = useState(false);

  // Backend State
  const [isLoading, setIsLoading] = useState(true);
  const [srmMessage, setSrmMessage] = useState(null);
  const [tickers, setTickers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [atms, setAtms] = useState([]);
  const [liveKpis, setLiveKpis] = useState([]);
  const [branchPulse, setBranchPulse] = useState({ SURPASSED: 0, POSITIVE: 0, LAGGING: 0, NEGATIVE: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    setIsLoading(true);

    fetch('/api/dashboard/config', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSrmMessage(data.srmMessage);
          setTickers(data.tickers || []);
          setAnnouncements(data.announcements || []);
          setLiveKpis(data.kpis || []);
          setBranchPulse(data.branchPulse || { SURPASSED: 0, POSITIVE: 0, LAGGING: 0, NEGATIVE: 0 });
          setLastUpdated(data.lastUpdated || null);
        }
      })
      .catch(console.error);

    fetch('/api/atms', { headers })
      .then(res => res.json())
      .then(data => {
        setAtms(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const filterTypes = ["ALL", "URGENT", "OPERATIONAL", "CIRCULAR", "HR", "CAMPAIGN"];
  const filteredAnnouncements = announcements.filter(a =>
    announcementFilter === "ALL" || a.type === announcementFilter
  );

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-medium tracking-wide">Connecting to Command Center...</div>;
  }

  return (
    <div className="font-sans text-slate-900 rounded-2xl overflow-hidden bg-slate-50 relative flex flex-col" style={{
      height: "calc(100vh - 144px)"
    }}>

      {/* ── Top command bar ─────────────────────────────────────────────── */}
      <div style={{
        background: NAVY, padding: "10px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div className="flex items-center gap-4">
          <div className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
            Dindigul <span style={{ color: GOLD }}>Regional Office</span>
          </div>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Operations Command · FY 2025–26 · Q4
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {[
            { label: "FY WD", val: "98/249", pct: 39 },
            { label: "QTR", val: "35/66", pct: 53 },
            { label: "MONTH", val: "13/24", pct: 54 },
          ].map(w => (
            <div key={w.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10.5, color: GOLD, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 1 }}>{w.label}</div>
              <div style={{ fontSize: 13, color: "#fff", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontWeight: 600 }}>{w.val}</div>
              <div style={{ height: 2, width: 48, background: "rgba(255,255,255,0.12)", borderRadius: 1, marginTop: 2 }}>
                <div style={{ height: 2, width: `${w.pct}%`, background: GOLD, borderRadius: 1 }} />
              </div>
            </div>
          ))}
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
            22 Feb 2026 · Sun
          </div>
        </div>
      </div>

      {/* ── Running ticker ──────────────────────────────────────────────── */}
      <Ticker items={tickers} />

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_340px] overflow-hidden">

        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div className="custom-scrollbar" style={{ overflow: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* SRM Message */}
          {srmMessage && (
            <div style={{
              background: NAVY, borderRadius: 12, overflow: "hidden",
              boxShadow: "0 4px 20px rgba(27,58,92,0.25)",
            }}>
              {/* Header bar */}
              <div style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, #2a5298 100%)`,
                padding: "12px 18px", display: "flex", alignItems: "center", gap: 12,
                borderBottom: `1px solid rgba(201,168,76,0.3)`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${GOLD}, #e8c96a)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18.5, fontWeight: 900, color: NAVY, flexShrink: 0,
                }}>
                  {srmMessage.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "RM"}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-sm font-black text-white uppercase tracking-tight">
                    {srmMessage.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: GOLD, fontWeight: 600, letterSpacing: "0.06em" }}>
                    {srmMessage.title} · {srmMessage.region}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {new Date(srmMessage.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Highlight strip */}
              <div style={{
                background: `linear-gradient(90deg, ${GOLD}22, ${GOLD}11)`,
                borderBottom: `1px solid ${GOLD}33`,
                padding: "8px 18px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 14.5, color: GOLD }}>🎯</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: GOLD, letterSpacing: "0.06em" }}>
                  {srmMessage.highlight}
                </span>
              </div>

              {/* Message body */}
              <div style={{ padding: "14px 18px" }}>
                <p style={{
                  fontSize: 15, color: "rgba(255,255,255,0.82)", lineHeight: 1.7,
                  display: msgExpanded ? "block" : "-webkit-box",
                  WebkitLineClamp: msgExpanded ? "unset" : 3,
                  WebkitBoxOrient: "vertical",
                  overflow: msgExpanded ? "visible" : "hidden",
                }}>
                  {srmMessage.message}
                </p>
                <button onClick={() => setMsgExpanded(v => !v)} style={{
                  marginTop: 8, fontSize: 13, fontWeight: 700, color: GOLD,
                  background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em",
                }}>
                  {msgExpanded ? "Show less ▲" : "Read full message ▼"}
                </button>
              </div>
            </div>
          )}

          {/* KPI strip — live from last MIS upload */}
          {liveKpis.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(liveKpis.length, 6)}, 1fr)`, gap: 10 }}>
              {liveKpis.slice(0, 6).map((k, i) => {
                const s = STATUS_STYLE[k.status] || STATUS_STYLE.LAGGING;
                return (
                  <div key={i} style={{
                    background: "#fff", borderRadius: 10, padding: "12px 14px",
                    borderTop: `3px solid ${s.bg}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                      {k.label}
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: NAVY, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", letterSpacing: "-0.02em" }}>
                      {k.val}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <Pace val={k.pace} />
                      <StatusBadge status={k.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 10, padding: "18px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13, fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              No MIS data uploaded yet. Use the Settings → MIS Upload tab to upload branch performance data.
            </div>
          )}

          {/* Announcements */}
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flex: 1 }}>
            {/* Header */}
            <div style={{
              padding: "14px 18px", borderBottom: "1px solid #F1F5F9",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: `${NAVY}12`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>📢</div>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: NAVY }}>Announcements & Circulars</div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{announcements.length} active · {announcements.filter(a => a.pinned).length} pinned</div>
                </div>
              </div>
              {/* Filter pills */}
              <div style={{ display: "flex", gap: 6 }}>
                {filterTypes.map(f => (
                  <button key={f} onClick={() => setAnnouncementFilter(f)} style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                    background: announcementFilter === f ? NAVY : "#F1F5F9",
                    color: announcementFilter === f ? "#fff" : "#64748B",
                    border: "none", cursor: "pointer", letterSpacing: "0.05em",
                  }}>{f}</button>
                ))}
              </div>
            </div>

            {/* Notice list */}
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {filteredAnnouncements.map((a, i) => (
                <div key={a.id}
                  onClick={() => setActiveNotice(activeNotice === a.id ? null : a.id)}
                  style={{
                    padding: "14px 18px",
                    borderBottom: i < filteredAnnouncements.length - 1 ? "1px solid #F8FAFC" : "none",
                    cursor: "pointer", transition: "background 0.15s",
                    background: activeNotice === a.id ? "#F8FAFC" : "#fff",
                    borderLeft: a.pinned ? `4px solid ${GOLD}` : "4px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        {a.pinned && <span style={{ fontSize: 13 }}>📌</span>}
                        <TypeBadge type={a.type} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>{a.title}</span>
                      </div>
                      <p style={{
                        fontSize: 14, color: "#64748B", lineHeight: 1.6,
                        display: activeNotice === a.id ? "block" : "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        overflow: activeNotice === a.id ? "visible" : "hidden",
                      }}>{a.body}</p>
                      {activeNotice === a.id && a.branches[0] !== "ALL" && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 700 }}>BRANCHES:</span>
                          {a.branches.map(b => (
                            <span key={b} style={{
                              fontSize: 11.5, background: `${NAVY}12`, color: NAVY,
                              padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            }}>{b}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11.5, color: "#94A3B8", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{a.date}</div>
                      <div style={{ fontSize: 11.5, color: "#CBD5E1", marginTop: 2 }}>{a.author}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="custom-scrollbar flex-1 min-h-0" style={{
          overflow: "auto", padding: "18px 18px 18px 0",
          display: "flex", flexDirection: "column", gap: 14,
          borderLeft: "1px solid #E2E8F0",
          background: "#F8FAFC",
        }}>

          {/* Pending Actions */}
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{
              padding: "12px 16px", background: NAVY,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 15 }}>⚡</span>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Pending Actions</div>
              <div style={{
                marginLeft: "auto", background: RED, color: "#fff",
                fontSize: 11.5, fontWeight: 900, padding: "1px 7px", borderRadius: 10,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}>{PENDING_ACTIONS.filter(a => a.urgent).length} urgent</div>
            </div>
            <div>
              {PENDING_ACTIONS.map((a, i) => {
                const sty = ACTION_STYLE[a.type];
                return (
                  <div key={a.id} style={{
                    padding: "10px 14px",
                    borderBottom: i < PENDING_ACTIONS.length - 1 ? "1px solid #F8FAFC" : "none",
                    background: a.urgent ? "#FFFBF0" : "#fff",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: sty.bg, border: `1px solid ${sty.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, flexShrink: 0,
                    }}>{sty.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{sty.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.branch}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748B" }}>{a.param}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 11.5, fontWeight: 800, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        color: a.urgent ? RED : "#64748B",
                      }}>Due {a.due}</div>
                      <div style={{
                        marginTop: 3, fontSize: 10.5, fontWeight: 700,
                        color: a.status === "READY" ? GREEN : a.status === "DRAFT" ? AMBER : "#64748B",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                      }}>{a.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ATM Monitor ─────────────────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15 }}>🏧</span>
              <div style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>ATM Network</div>
              <div style={{ marginLeft: "auto", fontSize: 11.5, color: "#94A3B8", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                {atms.length} active
              </div>
            </div>
            {atms.length > 0 ? (
              <div style={{ maxHeight: 220, overflowY: "auto" }} className="custom-scrollbar">
                {atms.map((atm, i) => {
                  const isLowCash = atm.balance < 50000;
                  return (
                    <div key={atm.atmId} style={{
                      padding: "9px 14px",
                      borderBottom: i < atms.length - 1 ? "1px solid #F8FAFC" : "none",
                      display: "flex", alignItems: "center", gap: 10,
                      background: isLowCash ? "#FFFBF0" : "#fff",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: isLowCash ? "#FEF3C7" : "#F1F5F9",
                        border: `1px solid ${isLowCash ? "#FCD34D" : "#E2E8F0"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0,
                      }}>
                        {isLowCash ? "⚠️" : "💳"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                            {atm.atmId}
                          </div>
                          {atm.branch?.code && (
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", background: "#F1F5F9", padding: "1px 6px", borderRadius: 10 }}>
                              {atm.branch.code}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2, display: "flex", gap: 12 }}>
                          <span>Txn: <strong style={{ color: "#64748B" }}>{atm.lastTxnTime}</strong></span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 900,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          color: isLowCash ? RED : GREEN,
                        }}>
                          ₹{(atm.balance / 1000).toFixed(1)}K
                        </div>
                        <div style={{
                          marginTop: 2, fontSize: 10.5, fontWeight: 700,
                          color: isLowCash ? RED : "#94A3B8",
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                          Available
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: 13, fontWeight: 600 }}>
                No active ATMs registered to this region/branch.
              </div>
            )}
          </div>

          {/* Upcoming Events — compact */}
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15 }}>📅</span>
              <div style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>Upcoming Events</div>
              <div style={{ marginLeft: "auto", fontSize: 11.5, color: "#94A3B8", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>Next 6 items</div>
            </div>
            <div>
              {UPCOMING_EVENTS.map((ev, i) => (
                <div key={i} style={{
                  padding: "9px 14px",
                  borderBottom: i < UPCOMING_EVENTS.length - 1 ? "1px solid #F8FAFC" : "none",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  {/* Date pill */}
                  <div style={{
                    width: 40, textAlign: "center", flexShrink: 0,
                    borderRadius: 8, padding: "4px 0",
                    background: `${EVENT_STYLE[ev.type]}18`,
                    border: `1px solid ${EVENT_STYLE[ev.type]}40`,
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: EVENT_STYLE[ev.type], fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", lineHeight: 1 }}>
                      {ev.date.split(" ")[0]}
                    </div>
                    <div style={{ fontSize: 10.5, color: EVENT_STYLE[ev.type], fontWeight: 700, opacity: 0.7 }}>
                      {ev.date.split(" ")[1]}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{ev.day}</div>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: EVENT_STYLE[ev.type], flexShrink: 0,
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats — live branch pulse */}
          <div style={{ background: NAVY, borderRadius: 12, padding: "16px 16px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: GOLD, letterSpacing: "0.08em", marginBottom: 4, textTransform: "uppercase" }}>
              Branch Pulse
            </div>
            {lastUpdated && (
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", marginBottom: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                As of {new Date(lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            )}
            {[
              { label: "SURPASSED", count: branchPulse.SURPASSED, color: "#66BB6A" },
              { label: "POSITIVE", count: branchPulse.POSITIVE, color: "#64B5F6" },
              { label: "LAGGING", count: branchPulse.LAGGING, color: "#FFB74D" },
              { label: "NEGATIVE", count: branchPulse.NEGATIVE, color: "#EF5350" },
            ].map(item => {
              const total = branchPulse.SURPASSED + branchPulse.POSITIVE + branchPulse.LAGGING + branchPulse.NEGATIVE || 1;
              return (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", width: 80 }}>{item.label}</div>
                  <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                    <div style={{ height: 4, width: `${(item.count / total) * 100}%`, background: item.color, borderRadius: 2, opacity: 0.8 }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", width: 20, textAlign: "right" }}>
                    {item.count}
                  </div>
                </div>
              );
            })}

            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "ATMs Online", val: atms.length.toString(), color: "#66BB6A" },
                { label: "Low Cash ATMs", val: atms.filter(a => a.balance < 50000).length.toString(), color: "#EF5350" },
                { label: "Lagging Units", val: (branchPulse.LAGGING + branchPulse.NEGATIVE).toString(), color: GOLD },
                { label: "Days to FY End", val: Math.ceil((new Date('2026-03-31').getTime() - Date.now()) / 86400000).toString(), color: "#64B5F6" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "9px 10px" }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
