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
const SESSION_HOURS = 8;

// ─── Helpers ────────────────────────────────────────────────────────────────

type AuditEvent =
    | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'LOCKOUT'
    | 'MFA_CHALLENGE' | 'MFA_SUCCESS' | 'MFA_FAILED'
    | 'AUTO_LOGIN' | 'SESSION_REVOKED' | 'SESSION_EXPIRED';

async function recordAudit(event: AuditEvent, username: string, userId: string | null, req: any, metadata?: Record<string, unknown>) {
    try {
        await (prisma as any).loginAuditLog.create({
            data: {
                event, username,
                userId: userId ?? null,
                ipAddress: req.ip ?? req.socket?.remoteAddress ?? 'unknown',
                userAgent: req.headers['user-agent'] ?? 'unknown',
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        });
    } catch (err) {
        console.error('[Auth] Failed to write audit log:', err);
    }
}

function buildToken(user: { id: string; username: string; fullNameEn: string; branchId?: string | null }, role: string) {
    return jwt.sign(
        { id: user.id, username: user.username, role, fullNameEn: user.fullNameEn, branchId: user.branchId },
        JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` }
    );
}

async function createSession(userId: string, token: string, label: string, req: any) {
    await (prisma as any).session.create({
        data: {
            userId, token,
            expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000),
            osUsername: label,
            userAgent: req.headers['user-agent'] ?? 'unknown',
            ipAddress: req.ip ?? '0.0.0.0',
        },
    });
}

async function pruneExpiredSessions() {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await (prisma as any).session.deleteMany({
            where: { OR: [{ expiresAt: { lt: new Date() } }, { isActive: false, updatedAt: { lt: cutoff } }] },
        });
    } catch { /* non-critical */ }
}

function resolveRole(user: any, overrideRole?: string): string {
    let role: string = user.role;
    if (user.username === 'admin' && overrideRole) role = overrideRole;
    if (role === 'RO_MANAGER' || role === 'SECTION_USER') role = 'RO_USER';
    return role;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
    const { username, password, fullNameEn, role, section } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({ data: { username, passwordHash, fullNameEn, role, section } });
        res.json({ id: user.id, username: user.username });
    } catch {
        res.status(400).json({ error: 'User already exists or invalid data' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            await recordAudit('LOGIN_FAILED', username, null, req, { reason: 'user_not_found' });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if ((user as any).lockedUntil && new Date((user as any).lockedUntil) > new Date()) {
            const minutesLeft = Math.ceil((new Date((user as any).lockedUntil).getTime() - Date.now()) / 60000);
            await recordAudit('LOCKOUT', username, user.id, req, { minutesLeft });
            return res.status(423).json({ error: `Account locked. Try again in ${minutesLeft} minute(s).` });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            const attempts = ((user as any).failedLoginAttempts || 0) + 1;
            const updateData: any = { failedLoginAttempts: attempts };
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                updateData.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
                await recordAudit('LOCKOUT', username, user.id, req, { attempts });
            } else {
                await recordAudit('LOGIN_FAILED', username, user.id, req, { attempts, remaining: MAX_FAILED_ATTEMPTS - attempts });
            }
            await prisma.user.update({ where: { username }, data: updateData });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await prisma.user.update({
            where: { username },
            data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: req.ip ?? null } as any,
        });

        pruneExpiredSessions();
        const finalRole = resolveRole(user, req.body.role);

        if ((user as any).mfaEnabled) {
            const tempToken = jwt.sign({ id: user.id, username: user.username, mfaPending: true, selectedRole: finalRole }, JWT_SECRET, { expiresIn: '5m' });
            await recordAudit('MFA_CHALLENGE', username, user.id, req);
            return res.json({ requiresMfa: true, tempToken });
        }

        const token = buildToken(user, finalRole);
        await createSession(user.id, token, 'manual_login', req);
        await recordAudit('LOGIN_SUCCESS', username, user.id, req, { role: finalRole });

        res.json({ token, user: { id: user.id, username: user.username, role: finalRole, fullNameEn: user.fullNameEn, branchId: user.branchId } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

router.post('/mfa/challenge', async (req, res) => {
    const { tempToken, code } = req.body;
    try {
        const payload: any = jwt.verify(tempToken, JWT_SECRET);
        if (!payload.mfaPending) throw new Error('Invalid token state');

        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !(user as any).mfaSecret) return res.status(401).json({ error: 'MFA not configured' });

        const verified = speakeasy.totp.verify({ secret: (user as any).mfaSecret, encoding: 'base32', token: code, window: 1 });
        if (!verified) {
            await recordAudit('MFA_FAILED', user.username, user.id, req);
            return res.status(401).json({ error: 'Invalid MFA code' });
        }

        const finalRole = resolveRole(user, payload.selectedRole);
        const token = buildToken(user, finalRole);
        await createSession(user.id, token, 'mfa_login', req);
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: req.ip ?? null } as any });
        await recordAudit('MFA_SUCCESS', user.username, user.id, req, { role: finalRole });

        res.json({ token, user: { id: user.id, username: user.username, role: finalRole, fullNameEn: user.fullNameEn, branchId: user.branchId } });
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'MFA window expired. Please log in again.' });
        res.status(401).json({ error: 'MFA challenge failed' });
    }
});

router.post('/mfa/setup', authenticateToken, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const secret = speakeasy.generateSecret({ name: `DindigulPortal (${user.username})` });
        await prisma.user.update({ where: { id: user.id }, data: { mfaSecret: secret.base32 } as any });
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
        res.json({ secret: secret.base32, qrCode: qrCodeUrl });
    } catch { res.status(500).json({ error: 'MFA setup failed' }); }
});

router.post('/mfa/verify', authenticateToken, async (req: any, res) => {
    const { code } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !(user as any).mfaSecret) return res.status(400).json({ error: 'MFA not initialised' });
        const verified = speakeasy.totp.verify({ secret: (user as any).mfaSecret, encoding: 'base32', token: code, window: 1 });
        if (!verified) return res.status(400).json({ error: 'Invalid verification code' });
        await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } as any });
        res.json({ message: 'MFA enabled successfully' });
    } catch { res.status(500).json({ error: 'MFA verification failed' }); }
});

router.get('/auto-login', async (req, res) => {
    try {
        const sysUser = os.userInfo().username;
        if (sysUser.toLowerCase() === 'admin') return res.status(401).json({ error: 'Admin must login manually', requiresManual: true });

        const user = await prisma.user.findUnique({ where: { username: sysUser }, include: { branch: true } });
        if (!user) return res.status(404).json({ error: `System user '${sysUser}' is not registered as staff.`, sysUser, requiresManual: true });

        const finalRole = resolveRole(user);
        const token = buildToken(user, finalRole);
        await createSession(user.id, token, sysUser, req);
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: req.ip ?? null } as any });
        await recordAudit('AUTO_LOGIN', user.username, user.id, req, { role: finalRole });
        pruneExpiredSessions();

        res.json({ token, user: { id: user.id, username: user.username, role: finalRole, fullNameEn: user.fullNameEn, branchId: user.branchId } });
    } catch (error) {
        console.error('Auto-login error:', error);
        res.status(500).json({ error: 'Auto-login failed' });
    }
});

router.post('/logout', authenticateToken, async (req: any, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (token) await (prisma as any).session.updateMany({ where: { token, userId: req.user.id }, data: { isActive: false } });
        await recordAudit('LOGOUT', req.user.username, req.user.id, req);
        res.json({ message: 'Logged out successfully' });
    } catch { res.status(500).json({ error: 'Logout failed' }); }
});

// ─── Admin: Session Management ───────────────────────────────────────────────

router.get('/sessions', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const sessions = await (prisma as any).session.findMany({
            where: { isActive: true, expiresAt: { gt: new Date() } },
            include: { user: { select: { username: true, fullNameEn: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(sessions);
    } catch { res.status(500).json({ error: 'Failed to fetch sessions' }); }
});

router.delete('/sessions/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const session = await (prisma as any).session.update({
            where: { id: req.params.id },
            data: { isActive: false },
            include: { user: { select: { username: true } } },
        });
        await recordAudit('SESSION_REVOKED', session.user?.username ?? 'unknown', session.userId, req, { revokedBy: req.user.username });
        res.json({ message: 'Session revoked' });
    } catch { res.status(500).json({ error: 'Failed to revoke session' }); }
});

// ─── Admin: Login Audit Log ──────────────────────────────────────────────────

router.get('/audit-log', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const { userId, event, limit = '100', page = '1' } = req.query;
        const take = Math.min(parseInt(limit as string) || 100, 500);
        const skip = (parseInt(page as string) - 1) * take;
        const where: any = {};
        if (userId) where.userId = userId;
        if (event) where.event = event;
        const [logs, total] = await Promise.all([
            (prisma as any).loginAuditLog.findMany({
                where,
                include: { user: { select: { fullNameEn: true } } },
                orderBy: { createdAt: 'desc' },
                take, skip,
            }),
            (prisma as any).loginAuditLog.count({ where }),
        ]);
        res.json({ logs, total, page: parseInt(page as string), limit: take });
    } catch (err) {
        console.error('[Auth] audit-log error:', err);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

export default router;
