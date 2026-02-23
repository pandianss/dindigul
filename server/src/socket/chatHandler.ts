import { Server, Socket } from 'socket.io';
import { prisma } from '../index';
import { v4 as uuidv4 } from 'uuid';

export function registerChatHandlers(io: Server, socket: Socket) {
    socket.on('join_room', async (room: string) => {
        // Validate room access based on role
        // For branch:{sol} rooms, checking the connection origin or validating against a token 
        // Here we assume the client is well-behaved or we check their role locally if needed.
        socket.join(room);

        try {
            // Fetch last 50 messages from DB
            const history = await prisma.chatMessage.findMany({
                where: { room },
                orderBy: { timestamp: 'desc' },
                take: 50
            });

            const hydratedHistory = await Promise.all(history.reverse().map(async m => {
                let payload = m.payload ? JSON.parse(m.payload) : undefined;
                if (m.type === 'ro_query' && payload?.queryId) {
                    const queryRec = await prisma.branchQuery.findUnique({ where: { id: payload.queryId } });
                    if (queryRec?.status === 'PENDING') {
                        const users = await prisma.user.findMany({
                            where: { branch: { code: queryRec.branchCode }, role: 'BRANCH' },
                            select: { fullNameEn: true }
                        });
                        payload.pendingUsers = users.map(u => u.fullNameEn);
                    } else if (queryRec?.status === 'ANSWERED') {
                        payload.pendingUsers = [];
                    }
                }
                return {
                    ...m,
                    payload
                };
            }));

            socket.emit('chat_history', hydratedHistory);
        } catch (err) {
            console.error('Error fetching chat history:', err);
        }
    });

    socket.on('send_message', async (data: any) => {
        const targetRoom = data.room || 'global';

        // Security check for Emergency Room privileges
        if (data.type === 'emergency' || targetRoom === 'emergency') {
            if (data.role !== 'RO_MANAGER' && data.role !== 'ADMIN') {
                console.warn(`Unauthorized emergency message blocked from role: ${data.role}`);
                return;
            }
        }

        const msgId = uuidv4();

        const messageRecord = {
            id: msgId,
            type: data.type || 'text',
            room: targetRoom,
            user: data.user,
            role: data.role || 'BRANCH',
            branchCode: data.branchCode || null,
            text: data.text,
            payload: data.payload ? JSON.stringify(data.payload) : null,
            timestamp: new Date()
        };

        try {
            // Persist to DB
            await prisma.chatMessage.create({ data: messageRecord });

            // Broadcast
            io.to(targetRoom).emit('receive_message', {
                ...messageRecord,
                payload: data.payload, // send as actual object
                timestamp: messageRecord.timestamp.toISOString()
            });
        } catch (err) {
            console.error('Error saving chat message:', err);
        }
    });

    socket.on('acknowledge_emergency', async (data: { messageId: string, userName: string }) => {
        try {
            const message = await prisma.chatMessage.findUnique({ where: { id: data.messageId } });
            if (message && message.type === 'emergency') {
                const existingAcks = message.readBy ? message.readBy.split(',') : [];
                if (!existingAcks.includes(data.userName)) {
                    existingAcks.push(data.userName);
                    const updatedReadBy = existingAcks.filter(Boolean).join(',');
                    await prisma.chatMessage.update({
                        where: { id: data.messageId },
                        data: { readBy: updatedReadBy }
                    });

                    // Broadcast updated message to room
                    io.to(message.room).emit('receive_message', {
                        id: message.id,
                        type: message.type,
                        room: message.room,
                        user: message.user,
                        role: message.role,
                        text: message.text,
                        payload: message.payload ? JSON.parse(message.payload) : undefined,
                        timestamp: message.timestamp.toISOString(),
                        readBy: existingAcks
                    });
                }
            }
        } catch (err) {
            console.error('Error acknowledging emergency:', err);
        }
    });
}
