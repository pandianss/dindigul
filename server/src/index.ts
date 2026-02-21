import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import misRoutes from './routes/mis';
import noticeRoutes from './routes/notice';
import letterRoutes from './routes/letter';
import officeNoteRoutes from './routes/officeNote';
import requestRoutes from './routes/request';
import committeeRoutes from './routes/committee';
import dispatchRoutes from './routes/dispatch';
import logisticsRoutes from './routes/logistics';
import expenditureRoutes from './routes/expenditure';
import legalRoutes from './routes/legal';
import auditRoutes from './routes/audit';
import assetRoutes from './routes/asset';
import calendarRoutes from './routes/calendar';
import departmentRoutes from './routes/department';
import designationRoutes from './routes/designation';
import unitRoutes from './routes/unit';
import prisma from './lib/prisma';

dotenv.config();

const app = express();
// const prisma = new PrismaClient(); // Removed in favor of shared prisma
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security Headers
app.use(helmet());

// CORS Configuration - Lockdown to specific origin
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs in a closed network, keep it somewhat high
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mis', misRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/letters', letterRoutes);
app.use('/api/office-notes', officeNoteRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/committees', committeeRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/expenditure', expenditureRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/branches', unitRoutes);

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_room', (room: string) => {
        socket.join(room);
    });

    socket.on('send_message', (data: { room: string;[key: string]: any }) => {
        io.to(data.room || 'global').emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Secured Server running on port ${PORT}`);
});

export { prisma };
