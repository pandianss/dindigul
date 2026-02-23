import { useState, useEffect, useRef } from "react";

// ── Data ─────────────────────────────────────────────────────────────────────

const SRM_MESSAGE = {
  name: "Shri R. Subramaniam",
  title: "Senior Regional Manager",
  region: "Dindigul Regional Office",
  date: "22 Feb 2026",
  photo: null,
  message: `Colleagues, as we enter the final stretch of Q4, our collective focus must sharpen on three critical areas: Deposit mobilisation, SMA resolution, and digital onboarding. Theni cluster branches need special attention on SMA-0 conversions before month-end. I am confident in the team's capacity to close this quarter on a POSITIVE note. Every working day matters — let us make them count.`,
  highlight: "Q4 Focus: Deposit Mobilisation · SMA Resolution · Digital Onboarding",
};

const TICKER_ITEMS = [
  "📌  RBI Monetary Policy Review scheduled for 07 Mar 2026 — anticipate rate corridor update",
  "⚠️  SMA-0 clearance drive ends 28 Feb — all branches must report position by 5 PM daily",
  "🏆  January Top Performer: Dindigul Fort (SOL 1314) — Deposits +₹8.4 Cr over target",
  "📋  Quarterly Audit Submissions due by 28 Feb — pending: Cumbum, Uthamapalayam",
  "🎯  Q4 KCC drive: 284 new accounts this month — target 400 by 31 Mar",
  "📱  Mobile Banking activation campaign: Achieve 14,000 active users by month-end",
  "💰  MUDRA loan camp at Palani on 25 Feb — coordinate with Lead District Manager",
  "🔒  CBS scheduled maintenance: Sunday 01 Mar 01:00–04:00 AM — plan branch activity",
];

const ANNOUNCEMENTS = [
  {
    id: 1, type: "URGENT", category: "COMPLIANCE",
    title: "Quarterly Audit Report Submission",
    body: "All branch managers must submit Q3 FY26 audit compliance report by 28 Feb 2026. Non-submission will be escalated to ZO. Format attached in Correspondence module.",
    date: "21 Feb 2026", pinned: true, author: "Audit & Compliance Dept",
    branches: ["ALL"],
  },
  {
    id: 2, type: "OPERATIONAL", category: "OPERATIONAL",
    title: "SMA-0 Clearance Drive — Daily Position Reporting",
    body: "Branches with SMA-0 above ₹50 Lakh must submit daily position by 5 PM to RO Operations. Priority branches: Chinnamanur, Uthamapalayam, Oddanchatram.",
    date: "20 Feb 2026", pinned: true, author: "RO Operations",
    branches: ["1560", "1919", "1258"],
  },
  {
    id: 3, type: "HR", category: "HR",
    title: "Annual Performance Appraisal — Self-Appraisal Window Open",
    body: "Self-appraisal submission window for FY 2025-26 is open from 20 Feb to 05 Mar 2026. Access via HRMS portal. All officers must complete submission within the window.",
    date: "20 Feb 2026", pinned: false, author: "Human Resources Dept",
    branches: ["ALL"],
  },
  {
    id: 4, type: "CIRCULAR", category: "OPERATIONAL",
    title: "RBI Circular: Revised LTV Norms for Gold Loans",
    body: "As per RBI circular DBOD.No.BP.BC.99/21.04.048/2025-26 dated 18 Feb 2026, revised LTV norms for gold loans effective 01 Mar 2026. Maximum LTV: 75%. All existing accounts to be reviewed.",
    date: "19 Feb 2026", pinned: false, author: "RO Credit",
    branches: ["ALL"],
  },
  {
    id: 5, type: "CAMPAIGN", category: "BUSINESS",
    title: "Q4 CASA Campaign — Target 3,000 New Accounts",
    body: "Final push for Q4 CASA campaign. Each branch assigned individual targets. Top 3 branches by new CASA accounts will receive appreciation letters. Bottom 3 will be counselled.",
    date: "18 Feb 2026", pinned: false, author: "SRM Office",
    branches: ["ALL"],
  },
  {
    id: 6, type: "INFO", category: "GENERAL",
    title: "Dindigul RO Portal — New Chat Module Live",
    body: "The enhanced chat module with MIS-aware branch queries is now live. Branches can view their MIS snapshot via the chat panel using /mydata command. RO officers can query any branch using /snapshot {SOL}.",
    date: "17 Feb 2026", pinned: false, author: "IT Department",
    branches: ["ALL"],
  },
];

const PENDING_ACTIONS = [
  { id:1, type:"EXPLANATION", branch:"Chinnamanur (1560)",  param:"Gross NPA",     due:"25 Feb", status:"DRAFT",  urgent:true  },
  { id:2, type:"EXPLANATION", branch:"Uthamapalayam (1919)",param:"SMA-0",         due:"25 Feb", status:"DRAFT",  urgent:true  },
  { id:3, type:"APPRECIATION",branch:"Dindigul Fort (1314)",param:"January Perf.", due:"28 Feb", status:"READY",  urgent:false },
  { id:4, type:"AUDIT",       branch:"Cumbum (0176)",       param:"Q3 Submission", due:"28 Feb", status:"PENDING",urgent:true  },
  { id:5, type:"AUDIT",       branch:"Uthamapalayam (1919)",param:"Q3 Submission", due:"28 Feb", status:"PENDING",urgent:true  },
  { id:6, type:"APPRECIATION",branch:"Palani (0376)",       param:"Jan Deposits",  due:"01 Mar", status:"READY",  urgent:false },
];

const UPCOMING_EVENTS = [
  { date:"25 Feb", day:"Wed", label:"MUDRA Loan Camp — Palani",     type:"CAMP"    },
  { date:"28 Feb", day:"Sat", label:"Q3 Audit Submission Deadline", type:"DEADLINE"},
  { date:"01 Mar", day:"Sun", label:"CBS Maintenance 01–04 AM",     type:"SYSTEM"  },
  { date:"05 Mar", day:"Thu", label:"Self-Appraisal Window Closes", type:"HR"      },
  { date:"07 Mar", day:"Sat", label:"RBI MPC Review",               type:"RBI"     },
  { date:"31 Mar", day:"Tue", label:"Financial Year End",           type:"FY_END"  },
];

// KPI data (condensed from previous dashboard)
const KPIS = [
  { label:"Total Deposits",  val:"₹1,698 Cr", budget:"₹1,850 Cr", pace:-3.2, status:"LAGGING"   },
  { label:"Total Advances",  val:"₹1,243 Cr", budget:"₹1,420 Cr", pace:-3.1, status:"LAGGING"   },
  { label:"Gross NPA Ratio", val:"5.17%",     budget:"4.50%",      pace:-6.2, status:"POSITIVE", lower:true },
  { label:"CASA Ratio",      val:"36.0%",     budget:"38.0%",      pace:-0.8, status:"LAGGING"   },
  { label:"Op. Profit",      val:"₹11.2 Cr",  budget:"₹12.8 Cr",  pace:4.6,  status:"SURPASSED" },
  { label:"Digital Txns",    val:"84,620",    budget:"90,000",     pace:8.4,  status:"SURPASSED" },
];

// ── Style constants ──────────────────────────────────────────────────────────
const NAVY = "#1B3A5C";
const TEAL = "#0E7C7B";
const GOLD = "#C9A84C";
const RED  = "#C62828";
const GREEN= "#2E7D32";
const AMBER= "#E65100";
const BLUE = "#1565C0";

const STATUS_STYLE = {
  SURPASSED: { bg: GREEN, label: "SURPASSED" },
  POSITIVE:  { bg: BLUE,  label: "POSITIVE"  },
  LAGGING:   { bg: AMBER, label: "LAGGING"   },
  NEGATIVE:  { bg: RED,   label: "NEGATIVE"  },
};

const TYPE_STYLE = {
  URGENT:      { bg:"#B71C1C", color:"#fff",    label:"URGENT"      },
  OPERATIONAL: { bg:"#1565C0", color:"#fff",    label:"OPERATIONAL" },
  HR:          { bg:"#2E7D32", color:"#fff",    label:"HR"          },
  CIRCULAR:    { bg:"#4A148C", color:"#fff",    label:"CIRCULAR"    },
  CAMPAIGN:    { bg:"#E65100", color:"#fff",    label:"CAMPAIGN"    },
  INFO:        { bg:"#37474F", color:"#fff",    label:"INFO"        },
};

const ACTION_STYLE = {
  EXPLANATION:  { bg:"#FFF3E0", border:"#FFB74D", icon:"⚠️", label:"Explanation Letter" },
  APPRECIATION: { bg:"#E8F5E9", border:"#66BB6A", icon:"🏆", label:"Appreciation Letter" },
  AUDIT:        { bg:"#EDE7F6", border:"#9575CD", icon:"📋", label:"Audit Pending" },
};

const EVENT_STYLE = {
  CAMP:    "#0E7C7B",
  DEADLINE:"#C62828",
  SYSTEM:  "#546E7A",
  HR:      "#2E7D32",
  RBI:     "#4A148C",
  FY_END:  "#C9A84C",
};

// ── Ticker component ──────────────────────────────────────────────────────────
function Ticker() {
  const [pos, setPos] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
  }, []);

  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div style={{
      background: NAVY, overflow:"hidden", height:36,
      display:"flex", alignItems:"center",
      borderBottom:`2px solid ${GOLD}`,
    }}>
      <div style={{
        background: GOLD, color: NAVY,
        fontSize:10, fontWeight:900, padding:"0 14px", height:"100%",
        display:"flex", alignItems:"center", whiteSpace:"nowrap",
        letterSpacing:"0.12em", flexShrink:0,
        fontFamily:"'DM Mono', monospace",
      }}>
        LIVE FEED
      </div>
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
        <div ref={ref} style={{ display:"flex", whiteSpace:"nowrap" }}>
          {doubled.map((item, i) => (
            <span key={i} style={{
              fontSize:11, color:"rgba(255,255,255,0.85)", padding:"0 32px",
              fontWeight:500, letterSpacing:"0.02em", flexShrink:0,
            }}>
              {item}
              <span style={{ color: GOLD, margin:"0 16px", opacity:0.5 }}>|</span>
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
      background: s.bg, color:"#fff", fontSize:8, fontWeight:900,
      padding:"2px 7px", borderRadius:2, letterSpacing:"0.1em",
      fontFamily:"'DM Mono', monospace",
    }}>{s.label}</span>
  );
}

function TypeBadge({ type }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE.INFO;
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize:8, fontWeight:800,
      padding:"2px 8px", borderRadius:3, letterSpacing:"0.08em",
    }}>{s.label}</span>
  );
}

function Pace({ val }) {
  const n = parseFloat(val);
  const color = n > 0 ? GREEN : n < -5 ? RED : AMBER;
  const arrow = n > 0 ? "▲" : n < 0 ? "▼" : "→";
  return (
    <span style={{ color, fontWeight:800, fontSize:11, fontFamily:"'DM Mono', monospace" }}>
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

  const filterTypes = ["ALL", "URGENT", "OPERATIONAL", "CIRCULAR", "HR", "CAMPAIGN"];
  const filteredAnnouncements = ANNOUNCEMENTS.filter(a =>
    announcementFilter === "ALL" || a.type === announcementFilter
  );

  return (
    <div style={{
      fontFamily:"'DM Sans', system-ui, sans-serif",
      background:"#F0F4F8", minHeight:"100vh", color:"#0F172A",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius:2px; }
      `}</style>

      {/* ── Top command bar ─────────────────────────────────────────────── */}
      <div style={{
        background: NAVY, padding:"10px 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:17, fontWeight:900, color:"#fff", letterSpacing:"-0.02em", fontFamily:"'Playfair Display', serif" }}>
            Dindigul <span style={{ color:GOLD }}>Regional Office</span>
          </div>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", letterSpacing:"0.12em", textTransform:"uppercase" }}>
            Operations Command · FY 2025–26 · Q4
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          {[
            { label:"FY WD", val:"98/249", pct:39 },
            { label:"QTR",   val:"35/66",  pct:53 },
            { label:"MONTH", val:"13/24",  pct:54 },
          ].map(w => (
            <div key={w.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:8, color:GOLD, fontWeight:800, letterSpacing:"0.15em", marginBottom:1 }}>{w.label}</div>
              <div style={{ fontSize:10, color:"#fff", fontFamily:"'DM Mono', monospace", fontWeight:600 }}>{w.val}</div>
              <div style={{ height:2, width:48, background:"rgba(255,255,255,0.12)", borderRadius:1, marginTop:2 }}>
                <div style={{ height:2, width:`${w.pct}%`, background:GOLD, borderRadius:1 }} />
              </div>
            </div>
          ))}
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:"'DM Mono', monospace" }}>
            22 Feb 2026 · Sun
          </div>
        </div>
      </div>

      {/* ── Running ticker ──────────────────────────────────────────────── */}
      <Ticker />

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:0, height:"calc(100vh - 84px)", overflow:"hidden" }}>

        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div style={{ overflow:"auto", padding:"18px 20px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* SRM Message */}
          <div style={{
            background: NAVY, borderRadius:12, overflow:"hidden",
            boxShadow:"0 4px 20px rgba(27,58,92,0.25)",
          }}>
            {/* Header bar */}
            <div style={{
              background:`linear-gradient(135deg, ${NAVY} 0%, #2a5298 100%)`,
              padding:"12px 18px", display:"flex", alignItems:"center", gap:12,
              borderBottom:`1px solid rgba(201,168,76,0.3)`,
            }}>
              <div style={{
                width:40, height:40, borderRadius:"50%",
                background:`linear-gradient(135deg, ${GOLD}, #e8c96a)`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16, fontWeight:900, color:NAVY, flexShrink:0,
                fontFamily:"'Playfair Display', serif",
              }}>
                {SRM_MESSAGE.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#fff", fontFamily:"'Playfair Display', serif" }}>
                  {SRM_MESSAGE.name}
                </div>
                <div style={{ fontSize:10, color:GOLD, fontWeight:600, letterSpacing:"0.06em" }}>
                  {SRM_MESSAGE.title} · {SRM_MESSAGE.region}
                </div>
              </div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", fontFamily:"'DM Mono', monospace" }}>
                {SRM_MESSAGE.date}
              </div>
            </div>

            {/* Highlight strip */}
            <div style={{
              background:`linear-gradient(90deg, ${GOLD}22, ${GOLD}11)`,
              borderBottom:`1px solid ${GOLD}33`,
              padding:"8px 18px", display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{ fontSize:12, color:GOLD }}>🎯</span>
              <span style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:"0.06em" }}>
                {SRM_MESSAGE.highlight}
              </span>
            </div>

            {/* Message body */}
            <div style={{ padding:"14px 18px" }}>
              <p style={{
                fontSize:12.5, color:"rgba(255,255,255,0.82)", lineHeight:1.7,
                display: msgExpanded ? "block" : "-webkit-box",
                WebkitLineClamp: msgExpanded ? "unset" : 3,
                WebkitBoxOrient:"vertical",
                overflow: msgExpanded ? "visible" : "hidden",
              }}>
                {SRM_MESSAGE.message}
              </p>
              <button onClick={() => setMsgExpanded(v=>!v)} style={{
                marginTop:8, fontSize:10, fontWeight:700, color:GOLD,
                background:"none", border:"none", cursor:"pointer", letterSpacing:"0.05em",
              }}>
                {msgExpanded ? "Show less ▲" : "Read full message ▼"}
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:10 }}>
            {KPIS.map((k, i) => {
              const s = STATUS_STYLE[k.status];
              return (
                <div key={i} style={{
                  background:"#fff", borderRadius:10, padding:"12px 14px",
                  borderTop:`3px solid ${s.bg}`,
                  boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize:16, fontWeight:900, color:NAVY, fontFamily:"'DM Mono', monospace", letterSpacing:"-0.02em" }}>
                    {k.val}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
                    <Pace val={k.pace} />
                    <StatusBadge status={k.status} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Announcements */}
          <div style={{ background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flex:1 }}>
            {/* Header */}
            <div style={{
              padding:"14px 18px", borderBottom:"1px solid #F1F5F9",
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  width:28, height:28, borderRadius:8, background:`${NAVY}12`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:14,
                }}>📢</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:NAVY }}>Announcements & Circulars</div>
                  <div style={{ fontSize:9, color:"#94A3B8", marginTop:1 }}>{ANNOUNCEMENTS.length} active · {ANNOUNCEMENTS.filter(a=>a.pinned).length} pinned</div>
                </div>
              </div>
              {/* Filter pills */}
              <div style={{ display:"flex", gap:6 }}>
                {filterTypes.map(f => (
                  <button key={f} onClick={() => setAnnouncementFilter(f)} style={{
                    padding:"4px 10px", borderRadius:20, fontSize:9, fontWeight:700,
                    background: announcementFilter===f ? NAVY : "#F1F5F9",
                    color: announcementFilter===f ? "#fff" : "#64748B",
                    border:"none", cursor:"pointer", letterSpacing:"0.05em",
                  }}>{f}</button>
                ))}
              </div>
            </div>

            {/* Notice list */}
            <div style={{ maxHeight:340, overflowY:"auto" }}>
              {filteredAnnouncements.map((a, i) => (
                <div key={a.id}
                  onClick={() => setActiveNotice(activeNotice===a.id ? null : a.id)}
                  style={{
                    padding:"14px 18px",
                    borderBottom: i < filteredAnnouncements.length-1 ? "1px solid #F8FAFC" : "none",
                    cursor:"pointer", transition:"background 0.15s",
                    background: activeNotice===a.id ? "#F8FAFC" : "#fff",
                    borderLeft: a.pinned ? `4px solid ${GOLD}` : "4px solid transparent",
                  }}
                >
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                        {a.pinned && <span style={{ fontSize:10 }}>📌</span>}
                        <TypeBadge type={a.type} />
                        <span style={{ fontSize:11, fontWeight:800, color:NAVY }}>{a.title}</span>
                      </div>
                      <p style={{
                        fontSize:11, color:"#64748B", lineHeight:1.6,
                        display: activeNotice===a.id ? "block" : "-webkit-box",
                        WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                        overflow: activeNotice===a.id ? "visible" : "hidden",
                      }}>{a.body}</p>
                      {activeNotice===a.id && a.branches[0] !== "ALL" && (
                        <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:9, color:"#94A3B8", fontWeight:700 }}>BRANCHES:</span>
                          {a.branches.map(b => (
                            <span key={b} style={{
                              fontSize:9, background:`${NAVY}12`, color:NAVY,
                              padding:"2px 8px", borderRadius:20, fontWeight:700,
                              fontFamily:"'DM Mono', monospace",
                            }}>{b}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:9, color:"#94A3B8", fontFamily:"'DM Mono', monospace" }}>{a.date}</div>
                      <div style={{ fontSize:9, color:"#CBD5E1", marginTop:2 }}>{a.author}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div style={{
          overflow:"auto", padding:"18px 18px 18px 0",
          display:"flex", flexDirection:"column", gap:14,
          borderLeft:"1px solid #E2E8F0",
          background:"#F8FAFC",
        }}>

          {/* Pending Actions */}
          <div style={{ background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{
              padding:"12px 16px", background:NAVY,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{ fontSize:13 }}>⚡</span>
              <div style={{ fontSize:12, fontWeight:800, color:"#fff" }}>Pending Actions</div>
              <div style={{
                marginLeft:"auto", background:RED, color:"#fff",
                fontSize:9, fontWeight:900, padding:"1px 7px", borderRadius:10,
                fontFamily:"'DM Mono', monospace",
              }}>{PENDING_ACTIONS.filter(a=>a.urgent).length} urgent</div>
            </div>
            <div>
              {PENDING_ACTIONS.map((a, i) => {
                const sty = ACTION_STYLE[a.type];
                return (
                  <div key={a.id} style={{
                    padding:"10px 14px",
                    borderBottom: i<PENDING_ACTIONS.length-1 ? "1px solid #F8FAFC" : "none",
                    background: a.urgent ? "#FFFBF0" : "#fff",
                    display:"flex", alignItems:"flex-start", gap:10,
                  }}>
                    <div style={{
                      width:28, height:28, borderRadius:8,
                      background:sty.bg, border:`1px solid ${sty.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, flexShrink:0,
                    }}>{sty.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", letterSpacing:"0.07em" }}>{sty.label}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:NAVY, marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {a.branch}
                      </div>
                      <div style={{ fontSize:10, color:"#64748B" }}>{a.param}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{
                        fontSize:9, fontWeight:800, fontFamily:"'DM Mono', monospace",
                        color: a.urgent ? RED : "#64748B",
                      }}>Due {a.due}</div>
                      <div style={{
                        marginTop:3, fontSize:8, fontWeight:700,
                        color: a.status==="READY" ? GREEN : a.status==="DRAFT" ? AMBER : "#64748B",
                        textTransform:"uppercase", letterSpacing:"0.07em",
                      }}>{a.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events — compact */}
          <div style={{ background:"#fff", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #F1F5F9", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:13 }}>📅</span>
              <div style={{ fontSize:12, fontWeight:800, color:NAVY }}>Upcoming Events</div>
              <div style={{ marginLeft:"auto", fontSize:9, color:"#94A3B8", fontFamily:"'DM Mono', monospace" }}>Next 6 items</div>
            </div>
            <div>
              {UPCOMING_EVENTS.map((ev, i) => (
                <div key={i} style={{
                  padding:"9px 14px",
                  borderBottom: i<UPCOMING_EVENTS.length-1 ? "1px solid #F8FAFC" : "none",
                  display:"flex", alignItems:"center", gap:10,
                }}>
                  {/* Date pill */}
                  <div style={{
                    width:40, textAlign:"center", flexShrink:0,
                    borderRadius:8, padding:"4px 0",
                    background:`${EVENT_STYLE[ev.type]}18`,
                    border:`1px solid ${EVENT_STYLE[ev.type]}40`,
                  }}>
                    <div style={{ fontSize:13, fontWeight:900, color:EVENT_STYLE[ev.type], fontFamily:"'DM Mono', monospace", lineHeight:1 }}>
                      {ev.date.split(" ")[0]}
                    </div>
                    <div style={{ fontSize:8, color:EVENT_STYLE[ev.type], fontWeight:700, opacity:0.7 }}>
                      {ev.date.split(" ")[1]}
                    </div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:NAVY, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {ev.label}
                    </div>
                    <div style={{ fontSize:9, color:"#94A3B8", marginTop:1 }}>{ev.day}</div>
                  </div>
                  <div style={{
                    width:8, height:8, borderRadius:"50%",
                    background:EVENT_STYLE[ev.type], flexShrink:0,
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ background:NAVY, borderRadius:12, padding:"16px 16px" }}>
            <div style={{ fontSize:11, fontWeight:800, color:GOLD, letterSpacing:"0.08em", marginBottom:12, textTransform:"uppercase" }}>
              Branch Pulse
            </div>
            {[
              { label:"SURPASSED", count:1, color:"#66BB6A" },
              { label:"POSITIVE",  count:4, color:"#64B5F6" },
              { label:"LAGGING",   count:3, color:"#FFB74D" },
              { label:"NEGATIVE",  count:2, color:"#EF5350" },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:item.color, flexShrink:0 }} />
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.06em", width:80 }}>{item.label}</div>
                <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
                  <div style={{ height:4, width:`${item.count/10*100}%`, background:item.color, borderRadius:2, opacity:0.8 }} />
                </div>
                <div style={{ fontSize:11, fontWeight:900, color:"#fff", fontFamily:"'DM Mono', monospace", width:14, textAlign:"right" }}>
                  {item.count}
                </div>
              </div>
            ))}

            <div style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"12px 0" }} />

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { label:"Alerts Today",    val:"5",    color:"#EF5350" },
                { label:"Pending Letters", val:"6",    color:GOLD      },
                { label:"New Requests",    val:"8",    color:"#64B5F6" },
                { label:"Days to FY End",  val:"37",   color:"#66BB6A" },
              ].map(s => (
                <div key={s.label} style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"9px 10px" }}>
                  <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:s.color, fontFamily:"'DM Mono', monospace" }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
