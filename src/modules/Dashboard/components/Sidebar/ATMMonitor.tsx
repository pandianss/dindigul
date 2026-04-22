import React from 'react';
import { NAVY } from '../../constants';
import { ATM } from '../../types';

interface ATMMonitorProps {
    atms: ATM[];
}

export const ATMMonitor: React.FC<ATMMonitorProps> = ({ atms }) => {
    return (
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
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: 12, fontWeight: 500 }}>
                    No ATM data available.
                </div>
            )}
        </div>
    );
};
