import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { users } from '../config/schema';
import { createTenantSchema } from '../validators/tenant.validator';
import { onboardNewTenant } from '../services/tenant.service';

export const onboardTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createTenantSchema.parse(req.body);
    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // 1. Proactive lookup to avoid creating orphaned transactions or DB errors
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      res.status(409).json({
        status: 'error',
        field: 'email',
        message: 'This email is already registered. Please sign in or use another email.',
      });
      return;
    }

    // 2. Delegate to service layer
    const result = await onboardNewTenant(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Workspace and administrator created successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }

    const pgErrorCode = error.code || error.cause?.code;
    const pgConstraint = error.constraint || error.cause?.constraint;

    if (pgErrorCode === '23505') {
      if (
        pgConstraint === 'users_email_unique' ||
        error.detail?.includes('email') ||
        error.cause?.detail?.includes('email')
      ) {
        res.status(409).json({
          status: 'error',
          field: 'email',
          message: 'This email is already registered. Please sign in or use another email.',
        });
        return;
      }

      res.status(409).json({
        status: 'error',
        message: 'A restaurant workspace with these details already exists.',
      });
      return;
    }

    console.error('[Onboarding Error]:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to complete workspace registration. Please try again later.',
    });
  }
};