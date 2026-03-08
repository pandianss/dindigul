-- Add lastLoginAt and lastLoginIp to users
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "lastLoginIp"  TEXT;

-- Create login_audit_logs table for full auth trail
CREATE TABLE "login_audit_logs" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "userId"    TEXT,
    "username"  TEXT NOT NULL,
    "event"     TEXT NOT NULL,  -- LOGIN_SUCCESS | LOGIN_FAILED | LOGOUT | LOCKOUT | MFA_CHALLENGE | MFA_SUCCESS | MFA_FAILED | AUTO_LOGIN | SESSION_EXPIRED
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata"  TEXT,           -- JSON blob for extra context
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "login_audit_logs_userId_idx"   ON "login_audit_logs"("userId");
CREATE INDEX "login_audit_logs_event_idx"    ON "login_audit_logs"("event");
CREATE INDEX "login_audit_logs_createdAt_idx" ON "login_audit_logs"("createdAt");
