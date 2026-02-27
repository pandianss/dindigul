import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

router.post('/register', async (req, res) => {
    const { username, password, fullNameEn, role, section } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, passwordHash, fullNameEn, role, section }
        });
        res.json({ id: user.id, username: user.username });
    } catch (error) {
        res.status(400).json({ error: 'User already exists or invalid data' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // GAP 05: Check account lockout
        if ((user as any).lockedUntil && new Date((user as any).lockedUntil) > new Date()) {
            const minutesLeft = Math.ceil(
                (new Date((user as any).lockedUntil).getTime() - Date.now()) / 60000
            );
            return res.status(423).json({
                error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
            });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            // Increment failure counter
            const attempts = ((user as any).failedLoginAttempts || 0) + 1;
            const updateData: any = { failedLoginAttempts: attempts };
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
            }
            await prisma.user.update({ where: { username }, data: updateData });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Successful login — reset lockout fields
        await prisma.user.update({
            where: { username },
            data: { failedLoginAttempts: 0, lockedUntil: null } as any
        });

        // GAP 04: Check if MFA is required
        if ((user as any).mfaEnabled) {
            const tempToken = jwt.sign(
                { id: user.id, username: user.username, mfaPending: true },
                JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ requiresMfa: true, tempToken });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, fullNameEn: user.fullNameEn, branchId: user.branchId },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullNameEn: user.fullNameEn,
                branchId: user.branchId
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GAP 04: MFA Challenge (verify code after login)
router.post('/mfa/challenge', async (req, res) => {
    const { tempToken, code } = req.body;
    try {
        const payload: any = jwt.verify(tempToken, JWT_SECRET);
        if (!payload.mfaPending) throw new Error('Invalid token');

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !(user as any).mfaSecret) return res.status(401).json({ error: 'MFA not configured' });

        const verified = speakeasy.totp.verify({
            secret: (user as any).mfaSecret,
            encoding: 'base32',
            token: code
        });

        if (!verified) return res.status(401).json({ error: 'Invalid MFA code' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, fullNameEn: user.fullNameEn, branchId: user.branchId },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullNameEn: user.fullNameEn,
                branchId: user.branchId
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'MFA challenge failed' });
    }
});

// GAP 04: MFA Setup (get secret + QR code)
router.post('/mfa/setup', authenticateToken, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const secret = speakeasy.generateSecret({ name: `DindigulPortal (${user.username})` });
        await prisma.user.update({
            where: { id: user.id },
            data: { mfaSecret: secret.base32 } as any
        });

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
        res.json({ secret: secret.base32, qrCode: qrCodeUrl });
    } catch (error) {
        res.status(500).json({ error: 'MFA setup failed' });
    }
});

// GAP 04: MFA Verify (confirm setup)
router.post('/mfa/verify', authenticateToken, async (req: any, res) => {
    const { code } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !(user as any).mfaSecret) return res.status(400).json({ error: 'MFA not initialised' });

        const verified = speakeasy.totp.verify({
            secret: (user as any).mfaSecret,
            encoding: 'base32',
            token: code
        });

        if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

        await prisma.user.update({
            where: { id: user.id },
            data: { mfaEnabled: true } as any
        });

        res.json({ message: 'MFA enabled successfully' });
    } catch (error) {
        res.status(500).json({ error: 'MFA verification failed' });
    }
});

export default router;
