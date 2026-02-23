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
import chatRoutes from './routes/chat';
import dashboardRoutes from './routes/dashboard';
import atmRoutes from './routes/atms';
import prisma from './lib/prisma';

import { config } from './lib/config';
import logger from './lib/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorMiddleware } from './middleware/errorMiddleware';
import { initScheduler } from './services/schedulerService';
import path from 'path';

const app = express();
initScheduler();

const PORT = config.port;
const FRONTEND_URL = config.frontendUrl;

// Structured Request Logging
app.use(requestLogger);

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '5mb' }));

app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected', version: '1.0.0' });
    } catch (error) {
        logger.error({ error }, 'Health check failed');
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/atms', atmRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/branches', unitRoutes);
app.use('/api/chat', chatRoutes);

// Global Error Handling (Must be last)
app.use(errorMiddleware);

import { registerChatHandlers } from './socket/chatHandler';

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Socket disconnected');
    });
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`Secured Server running on port ${PORT}`);
});

export { io, prisma };
