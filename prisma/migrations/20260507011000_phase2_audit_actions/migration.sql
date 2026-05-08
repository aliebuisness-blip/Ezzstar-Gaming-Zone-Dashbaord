ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'signup';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'logout';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'forgot_password';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'verify_email';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_profile';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'create_zone';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'update_zone';
