import { useEffect, useState, useRef } from "react";
import { useSocket } from "../../context/SocketContext";
import { X, Send, Users, ArrowLeft, ShieldAlert, MonitorDot, Building2, AlertTriangle, MessageSquare, Info } from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuth, getDisplayName } from "../../context/AuthContext";

interface Props {
    open: boolean;
    onClose: () => void;
}

import type { ChatMessage } from "../../types/chat";
import { format, parseISO } from "date-fns";

const DEFAULT_GROUPS = [
    { id: 'global', name: 'General Operations', icon: Users, desc: 'All staff coordination' },
    { id: 'it_support', name: 'IT Support', icon: MonitorDot, desc: 'Technical assistance' },
    { id: 'management', name: 'Branch Management', icon: Building2, desc: 'RO & Branch heads' },
    { id: 'emergency', name: 'Emergency Alerts', icon: ShieldAlert, desc: 'Critical incidents' },
];

export default function ChatPanel({ open, onClose }: Props) {
    const { messages, sendMessage, acknowledgeEmergency, clearMessages, joinRoom, closePanel } = useSocket();
    const { user } = useAuth();
    const displayName = getDisplayName(user || null);
    const [text, setText] = useState("");
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [isLoadingCmd, setIsLoadingCmd] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && text.trim()) {
            if (text.startsWith('/')) {
                await handleSlashCommand(text.trim());
            } else {
                sendMessage(text, selectedRoom || 'global');
            }
            setText("");
        }
    };

    const handleSlashCommand = async (cmd: string) => {
        setIsLoadingCmd(true);

        const storedUserRaw = sessionStorage.getItem('user');
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
        const token = sessionStorage.getItem('token') || storedUser?.token;
        const authHeaders = token
            ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            : { 'Content-Type': 'application/json' };
        // Commands: /ask {sol} {query}, /snapshot {sol}, /pending
        const parts = cmd.split(' ');
        const baseCmd = parts[0].toLowerCase();

        try {
            if (baseCmd === '/ask' && parts.length >= 3) {
                const targetBranch = parts[1];
                const queryText = parts.slice(2).join(' ');

                        const res = await fetch('/api/chat/query', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        branchCode: targetBranch,
                        queryText,
                        askedBy: user?.name || 'RO Manager'
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                sendMessage(`RO Query to ${targetBranch}`, selectedRoom || 'global', 'ro_query', { queryId: data.queryId, queryText, requestedBy: user?.name || 'RO Manager' });
            } else if (baseCmd === '/snapshot' && parts.length >= 2) {
                const targetBranch = parts[1];
                const res = await fetch(`/api/mis/snapshot?branchCode=${targetBranch}`, { headers: authHeaders });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                sendMessage(`MIS Snapshot for ${data.branchName}`, selectedRoom || 'global', 'mis_snapshot', data);
            } else if (baseCmd === '/mydata') {
                        const targetBranch =
                            String(user?.role) === 'BRANCH' || String(user?.role) === 'BRANCH_USER'
                                ? (user as any)?.branchId || (user as any)?.branch?.code
                                : null;
                if (!targetBranch) {
                    sendMessage(`Error: /mydata is only available for Branch Users.`, selectedRoom || 'global');
                    return;
                }
                const res = await fetch(`/api/mis/snapshot?branchCode=${targetBranch}`, { headers: authHeaders });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                sendMessage(`Your MIS Snapshot`, selectedRoom || 'global', 'mis_snapshot', data);
            } else if (baseCmd === '/branches') {
                const res = await fetch(`/api/branches`, { headers: authHeaders });
                const branches = await res.json();
                if (!res.ok) throw new Error('Failed to fetch branches');
                const branchList = branches.map((b: any) => `${b.code} - ${b.nameEn}`).join('\n');
                sendMessage(`Active Branches List:\n${branchList}`, selectedRoom || 'global', 'text');
            } else if (baseCmd === '/pending') {
                const res = await fetch(`/api/chat/pending`, { headers: authHeaders });
                const pending = await res.json();
                if (!res.ok) throw new Error('Failed to fetch pending queries');
                const pendingList = pending.pending.map((q: any) => {
                    const tag = q.pendingUsers && q.pendingUsers.length > 0
                        ? ` (Waiting for: ${q.pendingUsers.join(', ')})`
                        : '';
                    return `[${q.branchCode}] ${q.queryText} - by ${q.askedBy}${tag}`;
                }).join('\n');
                sendMessage(`Pending RO Queries (${pending.pending.length}):\n${pendingList || 'No pending queries.'}`, selectedRoom || 'global', 'text');
            } else if (baseCmd === '/users') {
                const res = await fetch(`/api/users`, { headers: authHeaders });
                const data = await res.json();
                if (!res.ok) throw new Error('Failed to fetch users');
                const allUsers = Array.isArray(data) ? data : (data.users || []);
                const adminRo = allUsers.filter((u: any) => u.role !== 'BRANCH' && u.role !== 'BRANCH_USER').map((u: any) => `${u.role}: ${u.fullNameEn || 'Staff'}`).join('\n');
                const branchUsers = allUsers.filter((u: any) => u.role === 'BRANCH' || u.role === 'BRANCH_USER').map((u: any) => `Branch ${u.branch?.code || 'Unknown'}: ${u.fullNameEn || 'Staff'}`).join('\n');
                sendMessage(`Active Users (${allUsers.length}):\n${adminRo}\n\n${branchUsers}`, selectedRoom || 'global', 'text');
            } else if (baseCmd === '/history' && parts.length >= 2) {
                const targetBranch = parts[1];
                const res = await fetch(`/api/chat/history/summary/${targetBranch}`, { headers: authHeaders });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                sendMessage(data.summary, selectedRoom || 'global', 'text');
            } else if (baseCmd === '/clear') {
                clearMessages();
            } else {
                sendMessage(`Unknown or invalid command syntax: ${cmd}`, selectedRoom || 'global');
            }
        } catch (err) {
            console.error('Command failed:', err);
            sendMessage(`Failed to execute command: ${baseCmd}`, selectedRoom || 'global');
        } finally {
            setIsLoadingCmd(false);
        }
    };

    const handleBranchResponse = async (queryId: string) => {
        const responseText = window.prompt("Enter your response to the Regional Office:");
        if (!responseText || !responseText.trim()) return;

        try {
            const storedUserRaw = sessionStorage.getItem('user');
            const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
            const token = sessionStorage.getItem('token') || storedUser?.token;

            await fetch('/api/chat/respond', {
                method: 'POST',
                headers: token
                    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                    : { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    queryId,
                    responseText: responseText.trim(),
                    respondedBy: displayName || 'Branch Staff',
                    branchCode:
                        (user as any)?.branch?.code ||
                        (user as any)?.branchCode ||
                        (user as any)?.branchId ||
                        'Unknown'
                })
            });
            sendMessage(`Response submitted successfully`, selectedRoom || 'global');
        } catch (err) {
            console.error('Failed to submit response:', err);
            sendMessage('Failed to submit response. Please try again.', selectedRoom || 'global');
        }
    };

    useEffect(() => {
        if (!open) {
            setSelectedRoom(null); // Reset on close
        }
    }, [open]);

    const handleJoinGroup = (roomId: string) => {
        setSelectedRoom(roomId);
        joinRoom(roomId);
    };

    if (!open) return null;

    return (
        <div className={cn(
            "fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transition-transform duration-300 transform",
            open ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="p-4 bg-bank-navy text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {selectedRoom && (
                        <button onClick={() => setSelectedRoom(null)} className="p-1 hover:bg-white/10 rounded-md transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div className="flex flex-col">
                        <span className="font-bold">{selectedRoom ? DEFAULT_GROUPS.find(g => g.id === selectedRoom)?.name : 'Operational Chat'}</span>
                        <span className="text-[10px] text-blue-100 uppercase tracking-wider">{selectedRoom ? 'Real-time Coordination' : 'Select a group to join'}</span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        closePanel();
                        onClose();
                    }}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {!selectedRoom ? (
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-2 relative">
                    <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-gray-50 to-transparent z-10" />
                    {DEFAULT_GROUPS.map(group => (
                        <button
                            key={group.id}
                            onClick={() => handleJoinGroup(group.id)}
                            className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-bank-teal/30 transition-all flex items-start space-x-4 text-left group"
                        >
                            <div className="p-2.5 bg-bank-navy/5 text-bank-navy rounded-lg group-hover:bg-bank-teal group-hover:text-white transition-colors">
                                <group.icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <h4 className="font-bold text-sm text-gray-900 truncate">{group.name}</h4>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{group.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((m: ChatMessage, i: number) => {
                            const storedUserRaw = sessionStorage.getItem('user');
                            const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
                            const currentDisplayName = getDisplayName(
                                storedUser || user || null
                            );
                            const isMe = m.user === currentDisplayName;

                            const renderMessageContent = () => {
                                const payload = m.payload || {};
                                const timestampStr = m.timestamp ? format(parseISO(m.timestamp), 'dd MMM, hh:mm a') : '';

                                switch (m.type) {
                                    case 'mis_alert':
                                        return (
                                            <div className="w-full bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl shadow-sm my-2">
                                                <div className="flex items-center space-x-2 text-red-700 font-bold text-sm mb-2">
                                                    <AlertTriangle size={16} />
                                                    <span>Status Alert</span>
                                                </div>
                                                <div className="text-sm font-semibold text-gray-900">{payload.branchName}</div>
                                                <div className="text-xs text-gray-700 mt-1">
                                                    Parameter: <span className="font-medium">{payload.paramName}</span>
                                                </div>
                                                <div className="flex items-center space-x-2 mt-2 text-xs">
                                                    <span className="bg-gray-200 px-2 py-0.5 rounded text-gray-600">{payload.prevStatus || 'POSITIVE'}</span>
                                                    <span>→</span>
                                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">{payload.newStatus}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-3 text-right">{timestampStr}</div>
                                            </div>
                                        );

                                    case 'mis_snapshot':
                                        return (
                                            <div className="w-full bg-teal-50 border-l-4 border-teal-500 p-3 rounded-r-xl shadow-sm my-2">
                                                <div className="font-bold text-teal-800 text-sm mb-2">MIS Snapshot: {payload.branchName}</div>
                                                <div className="text-xs text-gray-500 mb-3">{payload.date}</div>
                                                <div className="w-full overflow-x-auto">
                                                    <table className="w-full text-left text-xs">
                                                        <thead>
                                                            <tr className="border-b border-teal-200 text-teal-800">
                                                                <th className="pb-1 font-semibold">Parameter</th>
                                                                <th className="pb-1 font-semibold">Actual</th>
                                                                <th className="pb-1 font-semibold">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(payload.rows || []).map((r: any, idx: number) => (
                                                                <tr key={idx} className="border-b border-teal-100/50">
                                                                    <td className="py-1.5 text-gray-700 truncate max-w-[120px]">{r.paramName}</td>
                                                                    <td className="py-1.5 font-medium">{r.actual || r.currentActual}</td>
                                                                    <td className="py-1.5">
                                                                        <span className={cn("px-1.5 py-0.5 rounded", r.status === 'NEGATIVE' || r.newStatus === 'NEGATIVE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                                                                            {r.status || r.newStatus || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-3 text-right">{timestampStr}</div>
                                            </div>
                                        );

                                    case 'ro_query':
                                        return (
                                            <div className="w-full bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm my-2">
                                                <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm mb-2">
                                                    <MessageSquare size={16} />
                                                    <span>Regional Office Query</span>
                                                </div>
                                                <p className="text-sm text-gray-800 font-medium my-3">{payload.queryText}</p>
                                                {payload.pendingUsers && payload.pendingUsers.length > 0 && (
                                                    <div className="text-xs text-amber-800 bg-amber-100/70 px-2 py-1.5 rounded-lg inline-flex mb-3 items-center border border-amber-200 shadow-sm">
                                                        <span className="font-semibold mr-1">Waiting for:</span> {payload.pendingUsers.join(', ')}
                                                    </div>
                                                )}
                                                {String(user?.role) === 'BRANCH' && (
                                                    <button
                                                        onClick={() => handleBranchResponse(payload.queryId)}
                                                        className="mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded transition-colors w-full sm:w-auto">
                                                        Submit Response
                                                    </button>
                                                )}
                                                <div className="text-[10px] text-gray-500 mt-3 flex justify-between">
                                                    <span>By: {payload.requestedBy}</span>
                                                    <span>{timestampStr}</span>
                                                </div>
                                            </div>
                                        );

                                    case 'branch_response':
                                        return (
                                            <div className="w-full bg-green-50 border-l-4 border-green-500 p-3 rounded-r-xl shadow-sm my-2">
                                                <div className="text-xs font-bold text-green-800 mb-1">Response from {payload.branchName}</div>
                                                <div className="text-sm text-gray-800">{payload.responseText}</div>
                                                <div className="text-[10px] text-gray-500 mt-2 text-right">{timestampStr}</div>
                                            </div>
                                        );

                                    case 'emergency':
                                        return (
                                            <div className="w-full bg-red-600 text-white p-4 rounded-xl shadow-md my-2">
                                                <div className="flex items-center space-x-2 font-black text-lg mb-2">
                                                    <ShieldAlert size={24} className="animate-pulse" />
                                                    <span>EMERGENCY ALERT</span>
                                                </div>
                                                <div className="text-sm font-medium">{m.text}</div>
                                                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-xs">
                                                    <span className="opacity-80">Issued by: {m.user}</span>
                                                    {(m.readBy || []).includes(displayName || '') ? (
                                                        <span className="bg-red-800 text-red-100 px-4 py-1.5 rounded-full font-bold">
                                                            Acknowledged
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => acknowledgeEmergency(m.id)}
                                                            className="bg-white text-red-700 px-4 py-1.5 rounded-full font-bold hover:bg-red-50 transition-colors">
                                                            Acknowledge
                                                        </button>
                                                    )}
                                                </div>
                                                {m.readBy && m.readBy.length > 0 && (
                                                    <div className="text-[10px] text-red-200 mt-3 pt-2 border-t border-red-500/30">
                                                        Acked by: {m.readBy.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        );

                                    case 'system_info':
                                        return (
                                            <div className="w-full flex justify-center my-3">
                                                <div className="bg-gray-100 rounded-full px-4 py-1 text-xs text-gray-500 flex items-center space-x-2 italic">
                                                    <Info size={14} />
                                                    <span>{m.text}</span>
                                                </div>
                                            </div>
                                        );

                                    case 'text':
                                    default:
                                        return (
                                            <>
                                                <div className="flex items-center space-x-2 mb-1 px-1">
                                                    <span className="text-[10px] text-gray-500">{m.user} {m.role ? `(${m.role})` : ''}</span>
                                                </div>
                                                <div className={cn(
                                                    "p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap",
                                                    isMe
                                                        ? "bg-bank-navy text-white rounded-tr-none"
                                                        : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                                                )}>
                                                    {m.text}
                                                </div>
                                                {m.timestamp && (
                                                    <span className="text-[9px] text-gray-400 mt-1">
                                                        {timestampStr}
                                                    </span>
                                                )}
                                            </>
                                        );
                                }
                            };

                            const isStandardBubble = m.type === 'text' || !m.type;

                            return (
                                <div key={m.id || i} className={cn(
                                    "flex flex-col",
                                    isStandardBubble ? "max-w-[85%]" : "w-full",
                                    isMe && isStandardBubble ? "ml-auto items-end" : "items-start"
                                )}>
                                    {renderMessageContent()}
                                </div>
                            )
                        })}
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                                <div className="w-12 h-12 bg-gray-200 rounded-full mb-3 flex items-center justify-center">
                                    <Send size={20} className="text-gray-400" />
                                </div>
                                <p className="text-xs">No messages yet. Start the conversation!</p>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200">
                        {(String(user?.role) === 'RO' || String(user?.role) === 'ADMIN') && selectedRoom && (
                            <div className="flex flex-wrap gap-2 mb-3 pb-1">
                                <button onClick={() => setText('/ask ')} className="whitespace-nowrap px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full font-medium hover:bg-amber-100 transition-colors">
                                    + Ask Branch
                                </button>
                                <button onClick={() => setText('/snapshot ')} className="whitespace-nowrap px-3 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium hover:bg-teal-100 transition-colors">
                                    + Get MIS
                                </button>
                                <button onClick={() => setText('/pending')} className="whitespace-nowrap px-3 py-1 bg-gray-50 text-gray-700 border border-gray-200 text-xs rounded-full font-medium hover:bg-gray-100 transition-colors">
                                    View Pending Responses
                                </button>
                                <button onClick={() => setText('/users')} className="whitespace-nowrap px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium hover:bg-blue-100 transition-colors">
                                    Active Users
                                </button>
                                <button onClick={() => setText('/history ')} className="whitespace-nowrap px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium hover:bg-purple-100 transition-colors">
                                    Branch History
                                </button>
                            </div>
                        )}
                        <div className="relative">
                            <input
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoadingCmd}
                                placeholder={String(user?.role) === 'RO' ? "Type message or use /ask, /snapshot..." : "Type message..."}
                                className={cn(
                                    "w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-bank-navy transition-all",
                                    isLoadingCmd && "opacity-50"
                                )}
                            />
                            <button
                                onClick={async () => {
                                    if (text.trim()) {
                                        if (text.startsWith('/')) {
                                            await handleSlashCommand(text.trim());
                                        } else {
                                            sendMessage(text, selectedRoom || 'global');
                                        }
                                        setText("");
                                    }
                                }}
                                disabled={isLoadingCmd}
                                className={cn(
                                    "absolute right-2 top-2 p-1.5 text-white rounded-lg transition-all shadow-sm flex justify-center items-center",
                                    text.startsWith('/') ? "bg-amber-600 hover:bg-amber-700" : "bg-bank-navy hover:bg-bank-navy/90"
                                )}
                            >
                                {isLoadingCmd ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin m-0.5" /> : <Send size={18} />}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

