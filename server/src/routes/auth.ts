import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { authenticateToken } from '../middleware/auth';
import os from 'os';

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

        // Use selected role if provided and user is admin
        let finalRole = user.role;
        if (username === 'admin' && req.body.role) {
            finalRole = req.body.role;
            console.log(`[Auth] Admin user logged in with overridden role: ${finalRole}`);
        } else {
            // Role consolidation: If user has legacy RO roles, map them to RO_USER
            if (finalRole === 'RO_MANAGER' || finalRole === 'SECTION_USER') {
                finalRole = 'RO_USER';
            }
        }

        // GAP 04: Check if MFA is required
        if ((user as any).mfaEnabled) {
            const tempToken = jwt.sign(
                { id: user.id, username: user.username, mfaPending: true, selectedRole: finalRole },
                JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ requiresMfa: true, tempToken });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: finalRole, fullNameEn: user.fullNameEn, branchId: user.branchId },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Create explicit session
        await (prisma as any).session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
                osUsername: 'manual_login',
                userAgent: req.headers['user-agent'] || 'unknown',
                ipAddress: req.ip || '0.0.0.0'
            }
        });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: finalRole,
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

        let finalRole = payload.selectedRole || user.role;
        // Role consolidation for MFA
        if (finalRole === 'RO_MANAGER' || finalRole === 'SECTION_USER') {
            finalRole = 'RO_USER';
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: finalRole, fullNameEn: user.fullNameEn, branchId: user.branchId },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Create explicit session for MFA
        await (prisma as any).session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
                osUsername: 'mfa_login',
                userAgent: req.headers['user-agent'] || 'unknown',
                ipAddress: req.ip || '0.0.0.0'
            }
        });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: finalRole,
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

// Auto-login based on OS username
router.get('/auto-login', async (req, res) => {
    try {
        const sysUser = os.userInfo().username;
        console.log(`[Auth] Auto-login attempt for system user: ${sysUser}`);

        // Admin cannot auto-login
        if (sysUser.toLowerCase() === 'admin') {
            return res.status(401).json({ error: 'Admin must login manually', requiresManual: true });
        }

        const user = await prisma.user.findUnique({
            where: { username: sysUser },
            include: { branch: true }
        });

        if (!user) {
            return res.status(404).json({
                error: `System user '${sysUser}' is not registered as staff.`,
                sysUser,
                requiresManual: true
            });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, fullNameEn: user.fullNameEn, branchId: user.branchId },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        await (prisma as any).session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
                osUsername: sysUser,
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip
            }
        });

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
        console.error('Auto-login error:', error);
        res.status(500).json({ error: 'Auto-login failed' });
    }
});

router.post('/logout', authenticateToken, async (req: any, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            await (prisma as any).session.updateMany({
                where: { token, userId: req.user.id },
                data: { isActive: false }
            });
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

router.get('/sessions', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const sessions = await (prisma as any).session.findMany({
            where: { isActive: true },
            include: { user: { select: { username: true, fullNameEn: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

router.delete('/sessions/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        await (prisma as any).session.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });
        res.json({ message: 'Session revoked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to revoke session' });
    }
});

export default router;
