import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { prisma };
