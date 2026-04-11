import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { logger } from './utils/logger';

process.on('uncaughtException', (err) => {
    logger.error('[uncaughtException] Shutting down:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('[unhandledRejection]', reason);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import misRoutes from './routes/mis';
import noticeRoutes from './routes/notice';
import letterRoutes from './routes/letter';
import officeNoteRoutes from './routes/officeNote';
import requestRoutes from './routes/request';
import logisticsRoutes from './routes/logistics';
import expenditureRoutes from './routes/expenditure';
import calendarRoutes from './routes/calendar';
import departmentRoutes from './routes/department';
import designationRoutes from './routes/designation';
import unitRoutes from './routes/unit';
import chatRoutes from './routes/chat';
import dashboardRoutes from './routes/dashboard';
import atmRoutes from './routes/atms';
import planningRoutes from './routes/planning';
import budgetRoutes from './routes/budgetRoutes';
import parameterRoutes from './routes/parameterRoutes';
import internalNoteRoutes from './routes/internalNote';
import campaignRoutes from './routes/campaign';
import publicRoutes from './routes/public';
import organizationRoutes from './routes/organization';
import presentationRoutes from './routes/presentations';
import manualsRoutes from './routes/manuals';
import signatoryRoutes from './routes/signatory';
import returnsRoutes from './routes/returns';
import visitRoutes from './routes/visits';
import prisma from './lib/prisma';

import { initScheduler } from './services/schedulerService';
import path from 'path';

const app = express();

initScheduler();

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

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mis', misRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/letters', letterRoutes);
app.use('/api/office-notes', officeNoteRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/expenditure', expenditureRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/atms', atmRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/branches', unitRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/internal-notes', internalNoteRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/manuals', manualsRoutes);
app.use('/api/signatories', signatoryRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/visits', visitRoutes);


// Global error handler — must be defined after all routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('[UnhandledError]', err?.stack ?? err);
    if (res.headersSent) return next(err);
    res.status(err?.status ?? 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'An internal error occurred.'
            : (err?.message ?? 'Unknown error')
    });
});

import { registerChatHandlers } from './socket/chatHandler';
import { userService } from './services/userService';

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.use((socket: any, next: any) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET as string);
        socket.data.user = user;
        next();
    } catch (err) {
        next(new Error('Invalid or expired token'));
    }
});

io.on('connection', (socket: any) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Register handlers from separate file
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
    });
});

httpServer.listen(Number(PORT), '0.0.0.0', async () => {
    try {
        await userService.ensureAdminUser();
        logger.info('[System] Admin user verification complete.');
    } catch (err) {
        logger.error('[System] Failed to verify/create admin user:', err);
    }
    logger.info(`Secured Server running on port ${PORT}`);
});

export { io, prisma };
