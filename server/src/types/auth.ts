export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullNameEn: string;
  role: string;
  section?: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  mfaEnabled: boolean;
  mfaSecret: string | null;
}

export interface JWTPayload {
  id: string;
  username: string;
  role?: string;
  mfaPending?: boolean;
}
