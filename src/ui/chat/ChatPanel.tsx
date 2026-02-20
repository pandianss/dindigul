import { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import { X, Send } from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function ChatPanel({ open, onClose }: Props) {
    const { messages, sendMessage, joinRoom } = useSocket();
    const [text, setText] = useState("");

    useEffect(() => {
        if (open) {
            joinRoom("global"); // Default room
        }
    }, [open, joinRoom]);

    if (!open) return null;

    return (
        <div className={cn(
            "fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transition-transform duration-300 transform",
            open ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="p-4 bg-bank-navy text-white flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-bold">Operational Chat</span>
                    <span className="text-[10px] text-blue-100 uppercase tracking-wider">Real-time Coordination</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((m: any, i: number) => (
                    <div key={i} className={cn(
                        "flex flex-col max-w-[85%]",
                        m.user === 'You' ? "ml-auto items-end" : "items-start"
                    )}>
                        <span className="text-[10px] text-gray-500 mb-1 px-1">{m.user}</span>
                        <div className={cn(
                            "p-3 rounded-2xl text-sm shadow-sm",
                            m.user === 'You'
                                ? "bg-bank-navy text-white rounded-tr-none"
                                : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                        )}>
                            {m.text}
                        </div>
                    </div>
                ))}
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
                        onKeyPress={(e) => e.key === 'Enter' && text.trim() && (sendMessage(text), setText(""))}
                        placeholder="Type message..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-bank-navy transition-all"
                    />
                    <button
                        onClick={() => {
                            if (text.trim()) {
                                sendMessage(text);
                                setText("");
                            }
                        }}
                        className="absolute right-2 top-2 p-1.5 bg-bank-navy text-white rounded-lg hover:shadow-lg transition-all"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

