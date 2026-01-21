import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

// Get all connected accounts
export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;
    const accounts = await prisma.social_accounts.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        platform: true,
        account_name: true,
        is_active: true,
        created_at: true
      }
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
};

// Connect Account (Simulated)
export const connectAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform, accountName, accountId, accessToken } = req.body;
    const tenantId = (req as any).tenantId;

    // Basic validation
    if (!platform || !accountName || !accountId) {
        return res.status(400).json({ success: false, message: 'Platform, Account Name and ID are required' });
    }

    const account = await prisma.social_accounts.create({
      data: {
        tenant_id: tenantId,
        platform,
        account_name: accountName,
        account_id: accountId, // In real world, this comes from OAuth callback
        access_token: accessToken || 'mock_token',
        is_active: true
      }
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

// Disconnect Account
export const disconnectAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    await prisma.social_accounts.deleteMany({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    res.json({ success: true, message: 'Account disconnected' });
  } catch (error) {
    next(error);
  }
};
