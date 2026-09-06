-- Additive only: existing users, assignments, sessions and audit records are preserved.
ALTER TYPE "AuditAction" ADD VALUE 'USER_ACCESS_CHANGED';
ALTER TABLE "AuditEvent" ADD COLUMN "details" JSONB;

