import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { authenticateToken } from '../middleware/auth';
import { AuthService } from '../services/authService';

const router = Router();

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
        const user = await AuthService.findUserByUsername(username);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if (AuthService.isLocked(user)) {
            const minutesLeft = AuthService.getLockoutMinutesLeft(user);
            return res.status(423).json({
                error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
            });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            await AuthService.incrementFailedAttempts(username, user.failedLoginAttempts);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Successful login — reset lockout fields
        await AuthService.resetFailedAttempts(username);

        if (user.mfaEnabled) {
            const tempToken = AuthService.generateToken(
                { id: user.id, username: user.username, mfaPending: true },
                '5m'
            );
            return res.json({ requiresMfa: true, tempToken });
        }

        const token = AuthService.generateToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullNameEn: user.fullNameEn
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/mfa/challenge', async (req, res) => {
    const { tempToken, code } = req.body;
    try {
        const payload = AuthService.verifyToken(tempToken);
        if (!payload.mfaPending) throw new Error('Invalid token');

        const user = await AuthService.findUserById(payload.id);
        if (!user || !user.mfaSecret) return res.status(401).json({ error: 'MFA not configured' });

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: code
        });

        if (!verified) return res.status(401).json({ error: 'Invalid MFA code' });

        const token = AuthService.generateToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullNameEn: user.fullNameEn
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'MFA challenge failed' });
    }
});

router.post('/mfa/setup', authenticateToken, async (req: any, res) => {
    try {
        const user = await AuthService.findUserById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const secret = speakeasy.generateSecret({ name: `DindigulPortal (${user.username})` });
        await prisma.user.update({
            where: { id: user.id },
            data: { mfaSecret: secret.base32 }
        });

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');
        res.json({ secret: secret.base32, qrCode: qrCodeUrl });
    } catch (error) {
        res.status(500).json({ error: 'MFA setup failed' });
    }
});

router.post('/mfa/verify', authenticateToken, async (req: any, res) => {
    const { code } = req.body;
    try {
        const user = await AuthService.findUserById(req.user.id);
        if (!user || !user.mfaSecret) return res.status(400).json({ error: 'MFA not initialised' });

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: code
        });

        if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

        await prisma.user.update({
            where: { id: user.id },
            data: { mfaEnabled: true }
        });

        res.json({ message: 'MFA enabled successfully' });
    } catch (error) {
        res.status(500).json({ error: 'MFA verification failed' });
    }
});

export default router;
