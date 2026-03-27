import { useState } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function isSameDay(a, b) { return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function isToday(d) { return isSameDay(d, new Date()); }
function formatDate(d) { if (!d) return ""; return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }

const BTN = { background:"none", border:"none", cursor:"pointer", color:"var(--color-text-secondary)", fontSize:16, padding:"4px 8px", lineHeight:1 };

export default function DatePicker({ onChange }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [flash, setFlash] = useState(false);
  const [pickerMode, setPickerMode] = useState("calendar"); // 'calendar' | 'year' | 'month'
  const [yearRangeStart, setYearRangeStart] = useState(today.getFullYear() - 5);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const handleDayClick = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    setSelected(d);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    onChange?.(d);
  };

  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i=0; i<cells.length; i+=7) weeks.push(cells.slice(i, i+7));

  const headerLabel = pickerMode==="year"
    ? `${yearRangeStart} – ${yearRangeStart+11}`
    : pickerMode==="month"
      ? `${viewYear}`
      : `${MONTHS[viewMonth]} ${viewYear}`;

  return (
    <div style={{ fontFamily:"'DM Sans','Outfit',system-ui,sans-serif", maxWidth:340, margin:"0 auto", padding:"1.5rem 0" }}>
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:"var(--border-radius-xl)", overflow:"hidden" }}>

        {/* Nav Bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 8px" }}>
          {pickerMode==="calendar" && <button onClick={prevMonth} style={BTN}>‹</button>}
          {pickerMode==="year" && <button onClick={()=>setYearRangeStart(y=>y-12)} style={BTN}>‹</button>}
          {pickerMode==="month" && (
            <button onClick={()=>setPickerMode("year")} style={{ ...BTN, fontSize:12, display:"flex", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:14 }}>‹</span> year
            </button>
          )}

          <button
            onClick={()=>{ if(pickerMode==="calendar") setPickerMode("year"); else if(pickerMode==="year") setPickerMode("calendar"); }}
            style={{ background:"none", border:"none", cursor: pickerMode==="month"?"default":"pointer", fontSize:15, fontWeight:500, color:"var(--color-text-primary)", padding:"4px 10px", display:"flex", alignItems:"center", gap:5 }}>
            {headerLabel}
            {pickerMode==="calendar" && <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>▼</span>}
            {pickerMode==="year"     && <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>▲</span>}
          </button>

          {pickerMode==="calendar" && <button onClick={nextMonth} style={BTN}>›</button>}
          {pickerMode==="year"     && <button onClick={()=>setYearRangeStart(y=>y+12)} style={BTN}>›</button>}
          {pickerMode==="month"    && <div style={{ width:48 }} />}
        </div>

        {/* Year Picker */}
        {pickerMode==="year" && (
          <div style={{ padding:"4px 14px 16px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
              {Array.from({length:12},(_,i)=>yearRangeStart+i).map(yr => {
                const isCur=yr===viewYear, isTodayYr=yr===today.getFullYear();
                return (
                  <button key={yr} onClick={()=>{ setViewYear(yr); setPickerMode("month"); }}
                    style={{ padding:"9px 4px", borderRadius:"var(--border-radius-md)", border:isTodayYr&&!isCur?"0.5px solid #EF9F27":"0.5px solid transparent", background:isCur?"#EF9F27":"var(--color-background-secondary)", color:isCur?"#412402":isTodayYr?"#EF9F27":"var(--color-text-primary)", fontWeight:isCur?500:400, fontSize:13, cursor:"pointer" }}>
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Month Picker */}
        {pickerMode==="month" && (
          <div style={{ padding:"4px 14px 16px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
              {MONTHS_SHORT.map((mo,idx) => {
                const isCur=idx===viewMonth, isTodayMo=idx===today.getMonth()&&viewYear===today.getFullYear();
                return (
                  <button key={mo} onClick={()=>{ setViewMonth(idx); setPickerMode("calendar"); }}
                    style={{ padding:"9px 4px", borderRadius:"var(--border-radius-md)", border:isTodayMo&&!isCur?"0.5px solid #EF9F27":"0.5px solid transparent", background:isCur?"#EF9F27":"var(--color-background-secondary)", color:isCur?"#412402":isTodayMo?"#EF9F27":"var(--color-text-primary)", fontWeight:isCur?500:400, fontSize:13, cursor:"pointer" }}>
                    {mo}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Day Headers */}
        {pickerMode==="calendar" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", padding:"0 12px", marginBottom:4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:500, color:"var(--color-text-tertiary)", padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.05em" }}>{d}</div>
            ))}
          </div>
        )}

        {/* Calendar Grid */}
        {pickerMode==="calendar" && (
          <div style={{ padding:"0 12px 16px" }}>
            {weeks.map((week,wi) => (
              <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
                {week.map((day,di) => {
                  const date = day ? new Date(viewYear,viewMonth,day) : null;
                  const sel = day && isSameDay(date,selected);
                  const tod = day && isToday(date);
                  return (
                    <div key={di} onClick={()=>day&&handleDayClick(day)}
                      style={{ height:36, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"var(--border-radius-md)", fontSize:13, fontWeight:sel?500:400, cursor:day?"pointer":"default", userSelect:"none", background:sel?(flash?"#BA7517":"#EF9F27"):"transparent", color:sel?"#412402":tod?"#EF9F27":day?"var(--color-text-primary)":"transparent", border:tod&&!sel?"0.5px solid #EF9F27":"0.5px solid transparent", transition:"background 0.15s,color 0.15s" }}>
                      {day||""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", minHeight:44 }}>
          {selected ? (
            <>
              <div>
                <p style={{ fontSize:11, color:"var(--color-text-tertiary)", margin:0, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:500 }}>Selected</p>
                <p style={{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)", margin:"2px 0 0" }}>{formatDate(selected)}</p>
              </div>
              <button onClick={()=>{ setSelected(null); onChange?.(null); }} style={{ background:"none", border:"none", fontSize:12, color:"var(--color-text-tertiary)", cursor:"pointer", padding:"4px 6px" }}>clear</button>
            </>
          ) : (
            <p style={{ fontSize:13, color:"var(--color-text-tertiary)", margin:0 }}>No date selected</p>
          )}
        </div>

      </div>
    </div>
  );
}
