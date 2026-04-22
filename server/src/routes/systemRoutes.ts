import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import * as campaignService from '../services/campaignService';
import { parseCSV } from '../utils/csv';
import { departmentUpload as upload } from '../middleware/upload';
import path from 'path';
import fs from 'fs';
import { generatePDF, buildMeetingMinutesHtml, getRegionalOfficeData, buildPremiumLayout } from '../services/pdfService';
import { logger } from '../utils/logger';
import { syncCalendarDay } from '../utils/calendar';

const requireAdminOrPlanning = (req: any, res: any, next: any) => {
    const isPlanning = req.user?.role === 'RO_USER' && req.user?.section === 'Planning';
    if (req.user?.role !== 'ADMIN' && !isPlanning) {
        return res.status(403).json({ error: 'Config access requires Admin or Planning role' });
    }
    next();
};

const systemRouter = Router();

// ---- Merged from calendar.ts ----
const calendarRouter = Router();

// Apply auth to all routes in this file
calendarRouter.use(authenticateToken);

// Get all holidays
calendarRouter.get('/holidays', async (req, res) => {
    try {
        const holidays = await prisma.holiday.findMany({
            orderBy: { date: 'asc' }
        });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

// Create or Update holiday - Restricted to ADMIN or RO_USER
calendarRouter.post('/', async (req: any, res) => {
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden: Admin or Regional Office access required' });
    }
    try {
        const { date, nameEn, type, id, venue } = req.body;

        if (id) {
            // Update
            const updated = await prisma.holiday.update({
                where: { id },
                data: {
                    date: new Date(date),
                    nameEn,
                    type,
                    venue
                }
            });
            // Sync analytical calendar
            await syncCalendarDay(new Date(date));
            return res.json(updated);
        }

        // Create
        const created = await prisma.holiday.create({
            data: {
                date: new Date(date),
                nameEn,
                type,
                venue
            }
        });

        // Sync analytical calendar
        await syncCalendarDay(new Date(date));

        res.json(created);
    } catch (error) {
        console.error('Error saving event:', error);
        res.status(500).json({ error: 'Failed to save event' });
    }
});

// Delete holiday - Restricted to ADMIN or RO_USER
calendarRouter.delete('/:id', async (req: any, res) => {
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden: Admin or Regional Office access required' });
    }
    try {
        const { id } = req.params;
        
        // Fetch date before deletion to sync calendar
        const holiday = await prisma.holiday.findUnique({ where: { id } });
        const holidayDate = holiday?.date;

        await prisma.holiday.delete({
            where: { id }
        });

        if (holidayDate) {
            await syncCalendarDay(new Date(holidayDate));
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});


systemRouter.use('/calendar', calendarRouter);



// ---- Merged from campaign.ts ----
const campaignRouter = Router();


campaignRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const campaigns = await campaignService.getCampaigns();
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

campaignRouter.post('/', authenticateToken, async (req, res) => {
    try {
        const campaign = await campaignService.createCampaign(req.body);
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

campaignRouter.get('/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await campaignService.getCampaignById(req.params.id as string);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

campaignRouter.post('/:id/data', authenticateToken, async (req, res) => {
    try {
        const { branchId, date, value } = req.body;
        const entry = await campaignService.updateCampaignDailyData(req.params.id as string, branchId, new Date(date), value);
        res.json(entry);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

campaignRouter.get('/:id/performance', authenticateToken, async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date as string) : undefined;
        const rankings = await campaignService.getCampaignRankings(req.params.id as string, date);
        res.json(rankings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

campaignRouter.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await campaignService.updateCampaign(req.params.id as string, req.body);
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

campaignRouter.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await campaignService.deleteCampaign(req.params.id as string);
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

campaignRouter.delete('/:id/data/:entryId', authenticateToken, async (req, res) => {
    try {
        await campaignService.deleteCampaignDailyData(req.params.entryId as string);
        res.json({ message: 'Entry deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


systemRouter.use('/campaigns', campaignRouter);



// ---- Merged from department.ts ----
const departmentRouter = Router();


// upload configuration moved to centralized middleware

// Get all departments
departmentRouter.get('/', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user?.role === 'RO_USER' && req.user?.section === 'Planning';
    const canView = req.user?.role === 'ADMIN' || req.user?.role === 'RO_USER' || isPlanning;
    if (!canView) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const departments = await prisma.department.findMany({
            orderBy: { code: 'asc' }
        });
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Create new department
departmentRouter.post('/', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const { code, nameEn, nameTa, nameHi, sealPath } = req.body;
    try {
        const department = await prisma.department.create({
            data: { code, nameEn, nameTa, nameHi, sealPath }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create department' });
    }
});

// Update department
departmentRouter.put('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;
    const { code, nameEn, nameTa, nameHi, sealPath } = req.body;
    try {
        const department = await prisma.department.update({
            where: { id },
            data: { code, nameEn, nameTa, nameHi, sealPath }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Upload department seal
departmentRouter.post('/upload-seal', authenticateToken, requireAdminOrPlanning, upload.single('seal'), (req: any, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const sealPath = `assets/${req.file.filename}`;
    res.json({ sealPath });
});

// Delete department
departmentRouter.delete('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;
    try {
        await prisma.department.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload departments
departmentRouter.post('/bulk', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const { csvContent, jsonData } = req.body;
    try {
        let items = jsonData;
        if (csvContent) {
            items = parseCSV(csvContent);
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid data format. Expected CSV or JSON array.' });
        }

        const results = await Promise.all(items.map(async (item: any) => {
            const { code, nameEn, nameTa, nameHi, sealPath } = item;
            if (!code || !nameEn) return null;

            return prisma.department.upsert({
                where: { code },
                update: { nameEn, nameTa, nameHi, sealPath },
                create: { code, nameEn, nameTa, nameHi, sealPath }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} departments` });
    } catch (error) {
        console.error('Bulk department error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});


systemRouter.use('/departments', departmentRouter);



// ---- Merged from designation.ts ----
const designationRouter = Router();


// Get all designations
designationRouter.get('/', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user?.role === 'RO_USER' && req.user?.section === 'Planning';
    const canView = req.user?.role === 'ADMIN' || req.user?.role === 'RO_USER' || isPlanning;
    if (!canView) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const designations = await prisma.designation.findMany({
            orderBy: { workId: 'asc' }
        });
        res.json(designations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch designations' });
    }
});

// Create new designation
designationRouter.post('/', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const { code, nameEn, nameTa, nameHi, workId } = req.body;
    try {
        const designation = await prisma.designation.create({
            data: {
                code,
                nameEn,
                nameTa,
                nameHi,
                workId: parseInt(workId) || 999
            }
        });
        res.json(designation);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create designation' });
    }
});

// Update designation
designationRouter.put('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;
    const { code, nameEn, nameTa, nameHi, workId } = req.body;
    try {
        const designation = await prisma.designation.update({
            where: { id },
            data: {
                code,
                nameEn,
                nameTa,
                nameHi,
                workId: parseInt(workId) || 999
            }
        });
        res.json(designation);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Delete designation
designationRouter.delete('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;
    try {
        await prisma.designation.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload designations
designationRouter.post('/bulk', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const { csvContent, jsonData } = req.body;
    try {
        let items = jsonData;
        if (csvContent) {
            items = parseCSV(csvContent);
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const results = await Promise.all(items.map(async (item: any) => {
            const { code, nameEn, nameTa, nameHi, workId } = item;
            if (!code || !nameEn) return null;

            return prisma.designation.upsert({
                where: { code },
                update: { nameEn, nameTa, nameHi, workId: parseInt(workId) || undefined },
                create: { code, nameEn, nameTa, nameHi, workId: parseInt(workId) || 999 }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} designations` });
    } catch (error) {
        console.error('Bulk designation error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});


systemRouter.use('/designations', designationRouter);



// ---- Merged from expenditure.ts ----
const expenditureRouter = Router();


// Apply auth to all routes in this file
expenditureRouter.use(authenticateToken);

// Get all budgets for the current financial year
expenditureRouter.get('/budgets', async (req, res) => {
    try {
        const budgets = await prisma.budget.findMany({
            include: {
                _count: {
                    select: { sanctions: true }
                }
            }
        });
        res.json(budgets);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
});

// Get all sanctions with optional filters
expenditureRouter.get('/sanctions', async (req, res) => {
    const { section, status } = req.query;
    try {
        const filters: any = {};
        if (section) filters.section = section;
        if (status) filters.status = status;

        const sanctions = await prisma.expenseSanction.findMany({
            where: filters,
            include: {
                budget: true
            },
            orderBy: { sanctionDate: 'desc' }
        });
        res.json(sanctions);
    } catch (error) {
        console.error('Error fetching sanctions:', error);
        res.status(500).json({ error: 'Failed to fetch sanctions' });
    }
});

// Create new sanction and update budget spent amount
expenditureRouter.post('/sanctions', async (req, res) => {
    const { title, sanctionDate, amount, section, vendorName, billNo, status, type, budgetId } = req.body;
    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create the sanction
            const sanction = await tx.expenseSanction.create({
                data: {
                    title,
                    sanctionDate: sanctionDate ? new Date(sanctionDate) : new Date(),
                    amount,
                    section,
                    vendorName,
                    billNo,
                    status,
                    type,
                    budgetId
                }
            });

            // 2. Update the budget spent amount
            await tx.budget.update({
                where: { id: budgetId },
                data: {
                    spentAmount: {
                        increment: amount
                    }
                }
            });

            return sanction;
        });
        res.json(result);
    } catch (error) {
        console.error('Error creating sanction:', error);
        res.status(500).json({ error: 'Failed to create sanction' });
    }
});


systemRouter.use('/expenditure', expenditureRouter);



// ---- Merged from logistics.ts ----
const logisticsRouter = Router();


// Apply auth to all routes in this file
logisticsRouter.use(authenticateToken);

// Get stock levels
logisticsRouter.get('/stock', async (req, res) => {
    try {
        const items = await prisma.stationeryItem.findMany({
            include: {
                movements: {
                    orderBy: { date: 'desc' },
                    take: 5,
                    include: {
                        branch: { select: { nameEn: true } }
                    }
                }
            }
        });
        res.json(items);
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ error: 'Failed to fetch stock levels' });
    }
});

// Record movement and update stock
logisticsRouter.post('/movement', async (req, res) => {
    const { itemId, branchId, quantity, type, remarks } = req.body;
    try {
        // Use a transaction to ensure atomic update
        const result = await prisma.$transaction(async (tx: any) => {
            const movement = await tx.stationeryMovement.create({
                data: {
                    itemId,
                    branchId,
                    quantity,
                    type,
                    remarks,
                    date: new Date()
                }
            });

            const stockChange = type === 'RECEIPT' ? quantity : -quantity;

            await tx.stationeryItem.update({
                where: { id: itemId },
                data: {
                    stockLevel: {
                        increment: stockChange
                    }
                }
            });

            return movement;
        });
        res.json(result);
    } catch (error) {
        console.error('Error recording movement:', error);
        res.status(500).json({ error: 'Failed to record logistics movement' });
    }
});


systemRouter.use('/logistics', logisticsRouter);



// ---- Merged from organization.ts ----
const organizationRouter = Router();


// Get organization config merged with RO branch details
organizationRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const RO_DATA = await getRegionalOfficeData();

        let config = await prisma.organizationConfig.findUnique({
            where: { id: 'singleton' }
        });

        if (!config) {
            config = await prisma.organizationConfig.create({
                data: {
                    id: 'singleton',
                    bankNameEn: RO_DATA.bankNameEn,
                    bankNameTa: RO_DATA.bankNameTa,
                    bankNameHi: RO_DATA.bankNameHi,
                    signingAuthEn: RO_DATA.signingAuthEn || "Regional Manager",
                    signingAuthTa: RO_DATA.signingAuthTa || "மண்டல மேலாளர்",
                    signingAuthHi: RO_DATA.signingAuthHi || "क्षेत्रीय प्रबंधक",
                    signatoryName: RO_DATA.signatoryName || "CHANDRA KUMAR P"
                }
            });
        }

        // Merge current RO data into the config response
        const mergedConfig = {
            ...config,
            ...RO_DATA
        };

        res.json(mergedConfig);
    } catch (error) {
        console.error('Error fetching organization config:', error);
        res.status(500).json({ error: 'Failed to fetch organization configuration' });
    }
});

// Update organization config (Admin or Planning only)
organizationRouter.post('/', authenticateToken, async (req: any, res) => {
    const isPlanningRole = req.user?.role === 'RO_USER' && req.user?.section === 'Planning';
    if (req.user.role !== 'ADMIN' && !isPlanningRole) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const {
            bankNameEn, bankNameTa, bankNameHi,
            signingAuthEn, signingAuthTa, signingAuthHi,
            signatoryName
        } = req.body;

        const config = await prisma.organizationConfig.upsert({
            where: { id: 'singleton' },
            update: {
                bankNameEn, bankNameTa, bankNameHi,
                signingAuthEn, signingAuthTa, signingAuthHi,
                signatoryName
            },
            create: {
                id: 'singleton',
                bankNameEn, bankNameTa, bankNameHi,
                signingAuthEn, signingAuthTa, signingAuthHi,
                signatoryName
            }
        });

        res.json(config);
    } catch (error) {
        console.error('Error updating organization config:', error);
        res.status(500).json({ error: 'Failed to update organization configuration' });
    }
});


systemRouter.use('/organization', organizationRouter);



// ---- Merged from presentations.ts ----
const presentationsRouter = Router();


const canManageAllDecks = (user: any) =>
    ['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role) || user?.section === 'Planning';

async function getAccessibleDeck(deckId: string, user: any) {
    const deck = await prisma.presentationDeck.findUnique({
        where: { id: deckId },
        include: { createdBy: { select: { fullNameEn: true, username: true } } }
    });

    if (!deck) return null;
    if (canManageAllDecks(user) || deck.createdById === user.id) return deck;
    return null;
}

// List all decks (most recent first)
presentationsRouter.get('/', authenticateToken, async (req: any, res) => {
    try {
        const decks = await prisma.presentationDeck.findMany({
            where: canManageAllDecks(req.user) ? undefined : { createdById: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { fullNameEn: true, username: true } } }
        });
        res.json(decks);
    } catch { res.status(500).json({ error: 'Failed to fetch presentations' }); }
});

// Get a single deck with full slides JSON
presentationsRouter.get('/:id', authenticateToken, async (req, res) => {
    try {
        const deck = await getAccessibleDeck(String(req.params.id), (req as any).user);
        if (!deck) return res.status(404).json({ error: 'Deck not found' });
        res.json(deck);
    } catch { res.status(500).json({ error: 'Failed to fetch deck' }); }
});

// Save a new deck
presentationsRouter.post('/', authenticateToken, async (req: any, res) => {
    const { name, description, dataDate, period, slides } = req.body;
    if (!name || !dataDate || !slides) return res.status(400).json({ error: 'name, dataDate, slides required' });
    try {
        const deck = await prisma.presentationDeck.create({
            data: {
                name,
                description: description || null,
                dataDate: new Date(dataDate),
                period: period || '',
                slides,
                createdById: req.user.id
            }
        });
        res.status(201).json(deck);
    } catch { res.status(500).json({ error: 'Failed to save deck' }); }
});

// Update (overwrite slides, rename)
presentationsRouter.put('/:id', authenticateToken, async (req: any, res) => {
    try {
        const existingDeck = await getAccessibleDeck(String(req.params.id), req.user);
        if (!existingDeck) return res.status(404).json({ error: 'Deck not found' });

        const deck = await prisma.presentationDeck.update({
            where: { id: String(req.params.id) },
            data: {
                name: req.body.name || undefined,
                description: req.body.description || undefined,
                slides: req.body.slides || undefined,
            }
        });
        res.json(deck);
    } catch { res.status(500).json({ error: 'Failed to update deck' }); }
});

// Delete
presentationsRouter.delete('/:id', authenticateToken, async (req: any, res) => {
    try {
        const existingDeck = await getAccessibleDeck(String(req.params.id), req.user);
        if (!existingDeck) return res.status(404).json({ error: 'Deck not found' });

        await prisma.presentationDeck.delete({ where: { id: String(req.params.id) } });
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to delete deck' }); }
});


systemRouter.use('/presentations', presentationsRouter);



// ---- Merged from signatory.ts ----
const signatoryRouter = Router();


// Get potential signatories
signatoryRouter.get('/', authenticateToken, async (req: any, res) => {
    try {
        const signatories = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'RO_USER' },
                    { role: 'ADMIN' },
                    { 
                        designationEn: { 
                            contains: 'Manager', 
                            mode: 'insensitive' 
                        } 
                    },
                    { 
                        designationEn: { 
                            contains: 'Head', 
                            mode: 'insensitive' 
                        } 
                    }
                ]
            },
            select: {
                id: true,
                fullNameEn: true,
                fullNameTa: true,
                fullNameHi: true,
                designationEn: true,
                designationTa: true,
                designationHi: true,
                branch: {
                    select: {
                        nameEn: true,
                        code: true
                    }
                }
            },
            orderBy: {
                fullNameEn: 'asc'
            }
        });

        // Filter out some common non-authoritative roles if needed, 
        // but for now, the contains 'Manager' or 'Head' is a good filter.
        
        res.json(signatories);
    } catch (error) {
        console.error('Fetch signatories error:', error);
        res.status(500).json({ error: 'Failed to fetch signatories' });
    }
});


systemRouter.use('/signatories', signatoryRouter);



// ---- Merged from visits.ts ----
const visitsRouter = Router();


// Get all visits
visitsRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const visits = await prisma.branchVisit.findMany({
            include: {
                branch: { select: { nameEn: true, code: true } },
                visitor: { select: { fullNameEn: true, role: true } }
            },
            orderBy: { visitDate: 'desc' }
        });
        res.json(visits);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a visit
visitsRouter.post('/', authenticateToken, async (req, res) => {
    const { branchId, visitorId, visitDate, purpose, observations, visitorCategory } = req.body;
    try {
        const visit = await prisma.branchVisit.create({
            data: {
                branchId,
                visitorId,
                visitDate: new Date(visitDate),
                purpose,
                observations,
                visitorCategory: visitorCategory || 'SECOND_LINE'
            }
        });
        res.status(201).json(visit);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a visit
visitsRouter.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.branchVisit.delete({
            where: { id: req.params.id as string }
        });
        res.sendStatus(204);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


systemRouter.use('/visits', visitsRouter);



// ---- Merged from meetingRoutes.ts ----
const meetingRoutesRouter = Router();


// 1. Get List of Committees
meetingRoutesRouter.get('/committees', authenticateToken, async (req, res) => {
    try {
        const committees = await prisma.committee.findMany({
            orderBy: { nameEn: 'asc' }
        });
        res.json(committees);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch committees' });
    }
});

// 2. Get Meetings for a Committee
meetingRoutesRouter.get('/committee/:id/meetings', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const meetings = await prisma.meeting.findMany({
            where: id === 'GENERAL' 
                ? { committeeId: null } 
                : { committeeId: id as string },
            orderBy: { date: 'desc' },
            include: { committee: true }
        });
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

// 3. Create Meeting Draft / Final
meetingRoutesRouter.post('/', authenticateToken, async (req: any, res) => {
    const { committeeId, date, venue, attendees, signatories, title, minutes, status } = req.body;
    
    // Valid date check
    const parsedDate = new Date(date);
    const finalDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    try {
        const meeting = await prisma.meeting.create({
            data: {
                committeeId: committeeId === 'GENERAL' ? null : (committeeId || null),
                title: title || (committeeId === 'GENERAL' ? 'Meeting' : null),
                date: finalDate,
                venue: venue || 'Dindigul',
                attendees: Array.isArray(attendees) ? attendees : [],
                signatories: Array.isArray(signatories) ? signatories : [],
                status: status || 'DRAFT',
                minutesJson: minutes ? JSON.stringify(minutes) : JSON.stringify([])
            }
        });
        res.status(201).json(meeting);
    } catch (err: any) {
        logger.error('Failed to create meeting:', err);
        res.status(500).json({ 
            error: 'Failed to create meeting', 
            details: err?.message || 'Unknown error',
            code: err?.code
        });
    }
});

// 4. Update Meeting (Full Payload)
meetingRoutesRouter.put('/:id', authenticateToken, async (req: any, res) => {
    const { committeeId, date, venue, attendees, signatories, title, minutes, status } = req.body;
    try {
        const updated = await prisma.meeting.update({
            where: { id: req.params.id as string },
            data: {
                committeeId: committeeId === 'GENERAL' ? null : (committeeId || undefined),
                title: title !== undefined ? title : undefined,
                date: date ? new Date(date) : undefined,
                venue: venue || undefined,
                attendees: attendees || undefined,
                signatories: signatories || undefined,
                status: status || undefined,
                minutesJson: minutes ? JSON.stringify(minutes) : undefined
            }
        });
        res.json(updated);
    } catch (err: any) {
        logger.error('Failed to update meeting:', err);
        res.status(500).json({ error: 'Failed to update meeting', details: err?.message });
    }
});

// 5. Generate Minutes PDF
meetingRoutesRouter.get('/:id/pdf', authenticateToken, async (req, res) => {
    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: req.params.id as string },
            include: { committee: true }
        });

        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        // Helper to resolve staff details (Trilingual) from Name or UUID
        const resolveMember = async (input: any) => {
            const identifier = typeof input === 'string' ? input : (input.userId || input.name || '');
            if (!identifier) return null;

            let user = null;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            
            if (uuidRegex.test(identifier)) {
                user = await prisma.user.findUnique({ where: { id: identifier } });
            } else {
                user = await prisma.user.findFirst({ where: { fullNameEn: identifier } });
            }

            return {
                nameEn: user?.fullNameEn || identifier,
                nameHi: user?.fullNameHi || '',
                nameTa: user?.fullNameTa || '',
                designationEn: user?.designationEn || (typeof input !== 'string' ? input.designation : 'Official'),
                designationHi: user?.designationHi || '',
                designationTa: user?.designationTa || ''
            };
        };

        const resolvedSignatories = (await Promise.all(
            (Array.isArray(meeting.signatories) ? meeting.signatories : []).map(resolveMember)
        )).filter(Boolean);

        // Participants can be UUIDs or names. We resolve them into trilingual identities.
        // Participant Narrative (Typed Description)
        const participantNarrative = (meeting as any).participantDescription || 'All Participants';

        // Absentees are selected from the dropdown (stored in attendees IDs)
        const absenteeIds = Array.isArray(meeting.attendees) ? meeting.attendees : [];
        const resolvedAbsentees = (await Promise.all(
            absenteeIds.map(id => resolveMember(id))
        )).filter(Boolean);

        // Signatories (Present)
        const presentAttendees = resolvedSignatories;

        // Safe JSON Parse for Minutes
        let minutesData = [];
        try {
            if (meeting.minutesJson) {
                minutesData = JSON.parse(meeting.minutesJson);
            }
        } catch (err) {
            logger.error('Failed to parse meeting minutesJson:', err);
            // Fallback to treat as raw text if it's not valid JSON
            minutesData = meeting.minutesJson ? [{ content: meeting.minutesJson }] : [];
        }

        const roData = await getRegionalOfficeData();
        
        logger.info(`Generating Professional Meeting Minutes PDF for: ${meeting.title || 'Untitled'}`);

        const htmlBody = buildMeetingMinutesHtml({
            committee: meeting.committee?.nameEn || '',
            title: meeting.title,
            dateStr: meeting.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
            venue: meeting.venue,
            present: participantNarrative, // Pass the typed string here
            absentees: resolvedAbsentees,
            minutes: minutesData,
            resolvedSignatories
        }, roData);

        const refNo = `RO/DGL/MOM/${new Date(meeting.date).getFullYear()}/${meeting.id.substring(0, 4).toUpperCase()}`;

        const finalHtml = buildPremiumLayout({
            title: meeting.title || 'MINUTES OF MEETING',
            subTitle: meeting.committee?.nameEn || 'COMMITTEE PROCEEDINGS',
            date: meeting.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
            refNo: refNo,
            bodyHtml: htmlBody,
            organization: roData as any,
            hideHeader: false,
            isLetter: true, 
            hideMeta: true, 
            meetingStatus: meeting.status as any
        });

        const pdfBuffer = await generatePDF(finalHtml);

        res.contentType('application/pdf');
        res.send(pdfBuffer);
    } catch (err: any) {
        logger.error('CRITICAL: Meeting PDF Generation failed:', {
            error: err.message,
            stack: err.stack,
            meetingId: req.params.id
        });
        // TEMPORARY: Return full stack trace to identify the exact cause of 500 error
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            details: err?.message,
            stack: err?.stack,
            hint: 'Check the Network tab response for full details'
        });
    }
});


systemRouter.use('/meetings', meetingRoutesRouter);


export default systemRouter;
