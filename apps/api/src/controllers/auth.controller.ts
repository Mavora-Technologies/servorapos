import { Request, Response } from 'express';
import { loginSchema } from '../validators/auth.validator';
import { loginUser } from '../services/auth.service';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const result = await loginUser(validatedData);
    
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    if (error.message === 'Invalid credentials' || error.message === 'Account is disabled') {
      res.status(401).json({ status: 'error', message: error.message });
      return;
    }
    
    console.error('[Auth Controller Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};