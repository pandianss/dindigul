import { type ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatPanel from "@/ui/chat/ChatPanel";

interface Props {
    children: ReactNode;
    activeView: string;
    onViewChange: (view: string) => void;
}

export default function LayoutShell({ children, activeView, onViewChange }: Props) {
    const [chatOpen, setChatOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
            <Sidebar
                isOpen={sidebarOpen}
                activeView={activeView}
                onViewChange={onViewChange}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Header
                    onToggleSidebar={() => setSidebarOpen((v) => !v)}
                    onToggleChat={() => setChatOpen((v) => !v)}
                />

                <main className="flex-1 overflow-y-auto p-8 relative">
                    {children}
                </main>
            </div>

            <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    );
}

