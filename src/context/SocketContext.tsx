/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { socket } from '../services/socket';

import type { ChatMessage } from '../types/chat';
import { useAuth, getDisplayName } from './AuthContext';

interface SocketContextType {
    isConnected: boolean;
    messages: ChatMessage[];
    unreadCount: number;
    openPanel: () => void;
    closePanel: () => void;
    sendMessage: (text: string, roomId?: string, type?: string, payload?: any) => void;
    acknowledgeEmergency: (messageId: string) => void;
    clearMessages: () => void;
    joinRoom: (roomId: string) => void;
    socket: typeof socket;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            // Auto-join global room on every connect
            socket.emit('join_room', 'global');
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onMessage(message: ChatMessage) {
            setMessages((prev) => {
                const exists = prev.findIndex(m => m.id === message.id);
                if (exists >= 0) {
                    const next = [...prev];
                    next[exists] = message;
                    return next;
                }

                if (!isPanelOpen || message.type === 'emergency') {
                    setUnreadCount(count => count + 1);
                }
                return [...prev, message];
            });
            if (message.type === 'emergency') {
                try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    osc.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.5);
                } catch (e) {
                    // Browser may block if no interaction occurred yet
                    console.error('Audio play failed:', e);
                }
            }
        }

        function onHistory(history: ChatMessage[]) {
            setMessages(history);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('receive_message', onMessage);
        socket.on('chat_history', onHistory);

        // Connect / reconnect whenever the user object changes (i.e. after login)
        if (user) {
            if (!socket.connected) {
                socket.connect();
            } else {
                // Already connected — re-join global room to refresh history
                socket.emit('join_room', 'global');
            }
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('receive_message', onMessage);
            socket.off('chat_history', onHistory);
        };
    }, [user]);

    const openPanel = () => {
        setIsPanelOpen(true);
        setUnreadCount(0);
    };

    const closePanel = () => {
        setIsPanelOpen(false);
        setUnreadCount(0);
    };

    const sendMessage = (text: string, roomId = 'global', type?: string, payload?: any) => {
        if (!user) return;

        const senderName = getDisplayName(user);

        socket.emit('send_message', {
            text,
            room: roomId,
            type,
            payload,
            user: senderName,
            role: user.role,
            branchCode: String(user.role) === 'BRANCH' || String(user.role) === 'BRANCH_USER'
                ? user.branchId
                : undefined
        });
    };

    const joinRoom = (roomId: string) => {
        setMessages([]); // Clear chat history on room change
        socket.emit('join_room', roomId);
    };

    const acknowledgeEmergency = (messageId: string) => {
        const senderName = user ? getDisplayName(user) : 'Staff';
        socket.emit('acknowledge_emergency', { messageId, userName: senderName });
    };

    const clearMessages = () => {
        setMessages([]);
    };

    return (
        <SocketContext.Provider value={{
            isConnected,
            messages,
            unreadCount,
            openPanel,
            closePanel,
            sendMessage,
            acknowledgeEmergency,
            clearMessages,
            joinRoom,
            socket
        }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}

