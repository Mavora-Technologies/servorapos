import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { users } from '../config/schema';
import { LoginInput } from '../validators/auth.validator';

export const loginUser = async (data: LoginInput) => {
  // Find user by email
  const userResult = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  const user = userResult[0];

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate secure session token[cite: 2]
  const token = jwt.sign(
    { 
      userId: user.id, 
      tenantId: user.tenantId 
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId
    }
  };
};