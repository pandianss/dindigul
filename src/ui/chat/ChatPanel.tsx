import { useEffect, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { X, Send, Users, ArrowLeft, ShieldAlert, MonitorDot, Building2 } from "lucide-react";
import { cn } from "../../utils/cn";

interface Props {
    open: boolean;
    onClose: () => void;
}

interface Message {
    user: string;
    text: string;
}

const DEFAULT_GROUPS = [
    { id: 'global', name: 'General Operations', icon: Users, desc: 'All staff coordination' },
    { id: 'it_support', name: 'IT Support', icon: MonitorDot, desc: 'Technical assistance' },
    { id: 'management', name: 'Branch Management', icon: Building2, desc: 'RO & Branch heads' },
    { id: 'emergency', name: 'Emergency Alerts', icon: ShieldAlert, desc: 'Critical incidents' },
];

export default function ChatPanel({ open, onClose }: Props) {
    const { messages, sendMessage, joinRoom } = useSocket();
    const [text, setText] = useState("");
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

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
                    onClick={onClose}
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
                        {messages.map((m: Message, i: number) => {
                            const user = JSON.parse(localStorage.getItem('user') || '{}');
                            const isMe = m.user === (user.name || 'Staff');
                            return (
                                <div key={i} className={cn(
                                    "flex flex-col max-w-[85%]",
                                    isMe ? "ml-auto items-end" : "items-start"
                                )}>
                                    <span className="text-[10px] text-gray-500 mb-1 px-1">{m.user}</span>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm shadow-sm",
                                        isMe
                                            ? "bg-bank-navy text-white rounded-tr-none"
                                            : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                                    )}>
                                        {m.text}
                                    </div>
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
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200">
                        <div className="relative">
                            <input
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && text.trim() && (sendMessage(text, selectedRoom), setText(""))}
                                placeholder="Type message..."
                                className="w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-bank-navy transition-all"
                            />
                            <button
                                onClick={() => {
                                    if (text.trim()) {
                                        sendMessage(text, selectedRoom);
                                        setText("");
                                    }
                                }}
                                className="absolute right-2 top-2 p-1.5 bg-bank-navy text-white rounded-lg hover:shadow-lg transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

