/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { socket } from '../services/socket';

interface Message {
    user: string;
    text: string;
    timestamp: string;
}

interface SocketContextType {
    isConnected: boolean;
    messages: Message[];
    sendMessage: (text: string, roomId?: string) => void;
    joinRoom: (roomId: string) => void;
    socket: typeof socket;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onMessage(message: Message) {
            setMessages((prev) => [...prev, message]);
        }

        function onHistory(history: Message[]) {
            setMessages(history);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('receive_message', onMessage);
        socket.on('chat_history', onHistory);

        socket.connect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('receive_message', onMessage);
            socket.off('chat_history', onHistory);
            socket.disconnect();
        };
    }, []);

    const sendMessage = (text: string, roomId = 'global') => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        socket.emit('send_message', { text, room: roomId, user: user.name || 'Staff' });
    };

    const joinRoom = (roomId: string) => {
        setMessages([]); // Clear chat history on room change
        socket.emit('join_room', roomId);
    };

    return (
        <SocketContext.Provider value={{ isConnected, messages, sendMessage, joinRoom, socket }}>
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

