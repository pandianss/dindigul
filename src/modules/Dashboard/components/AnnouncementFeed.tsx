import React from 'react';
import { NAVY, GOLD } from '../constants';
import { Announcement } from '../types';
import { TypeBadge } from '../utils';

interface AnnouncementFeedProps {
    announcements: Announcement[];
    announcementFilter: string;
    setAnnouncementFilter: (filter: string) => void;
    activeNotice: string | null;
    setActiveNotice: (id: string | null) => void;
}

export const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({
    announcements,
    announcementFilter,
    setAnnouncementFilter,
    activeNotice,
    setActiveNotice
}) => {
    const filterTypes = ["ALL", "URGENT", "OPERATIONAL", "CIRCULAR", "HR", "CAMPAIGN"];
    const filteredAnnouncements = announcements.filter(a =>
        announcementFilter === "ALL" || a.type === announcementFilter
    );

    return (
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
            <div style={{ maxHeight: 340, overflowY: "auto" }} className="custom-scrollbar">
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
                                {activeNotice === a.id && a.branches?.[0] !== "ALL" && a.branches?.length > 0 && (
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
    );
};
