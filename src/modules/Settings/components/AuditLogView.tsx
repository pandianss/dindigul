import React from 'react';
import { cn } from '../../../utils/cn';

interface AuditLogViewProps {
    auditLogs: any[];
    auditLogsTotal: number;
    auditEventFilter: string;
    onFilterChange: (event: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
    auditLogs,
    auditLogsTotal,
    auditEventFilter,
    onFilterChange
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <select
                    className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-bank-navy shadow-sm outline-none focus:ring-2 focus:ring-bank-navy/10 transition-all text-sm"
                    value={auditEventFilter}
                    onChange={(e) => onFilterChange(e.target.value)}
                >
                    <option value="">All Security Events</option>
                    <option value="LOGIN_SUCCESS">Login Success</option>
                    <option value="LOGIN_FAILED">Login Failed</option>
                    <option value="LOGOUT">Logout</option>
                    <option value="LOCKOUT">Account Lockout</option>
                </select>
                <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    Found {auditLogsTotal} Security Logs
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 text-[11px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">User Identity</th>
                            <th className="px-4 py-3">Event Type</th>
                            <th className="px-4 py-3">IP Address</th>
                            <th className="px-4 py-3">Security Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors text-sm">
                                <td className="p-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                                    {new Date(log.createdAt).toLocaleString()}
                                </td>
                                <td className="p-4 font-bold text-bank-navy">
                                    {log.username}
                                </td>
                                <td className="p-4">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                        log.event.includes('SUCCESS') ? 'bg-green-100 text-green-700' :
                                        log.event.includes('FAILED') || log.event.includes('LOCKOUT') ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700'
                                    )}>
                                        {log.event.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-400 font-mono text-xs">
                                    {log.ipAddress || '---'}
                                </td>
                                <td className="p-4 text-xs text-gray-400 max-w-xs truncate italic">
                                    {log.metadata ? (typeof log.metadata === 'string' ? (JSON.parse(log.metadata).reason || log.metadata) : (log.metadata.reason || 'No reason')) : 'No metadata'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
