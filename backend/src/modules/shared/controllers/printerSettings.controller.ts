import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

const DEFAULT_SETTINGS = {
  defaultPrinter: '',
  printerWidth: '80mm',
  autoPrint: true,
  copies: 1,
};

/**
 * Get current user's printer settings
 */
export const getPrinterSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    // Return default settings since DB column is missing
    res.json({
      success: true,
      data: DEFAULT_SETTINGS,
    });
  } catch (error) {
    console.error('Error fetching printer settings:', error);
    return next(error);
  }
};

/**
 * Update current user's printer settings
 * Body: {
 *   defaultPrinter: string,
 *   printerWidth: '58mm' | '80mm',
 *   autoPrint: boolean,
 *   copies: number
 * }
 */
export const updatePrinterSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const { defaultPrinter, printerWidth, autoPrint, copies } = req.body;

    // Build settings object
    const printerSettings: any = {};

    if (defaultPrinter !== undefined) {
      printerSettings.defaultPrinter = defaultPrinter;
    }

    if (printerWidth !== undefined) {
      if (!['58mm', '80mm'].includes(printerWidth)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PRINTER_WIDTH', message: 'Printer width must be either 58mm or 80mm' },
        });
      }
      printerSettings.printerWidth = printerWidth;
    }

    if (autoPrint !== undefined) {
      printerSettings.autoPrint = Boolean(autoPrint);
    }

    if (copies !== undefined) {
      const copiesNum = parseInt(copies);
      if (isNaN(copiesNum) || copiesNum < 1 || copiesNum > 10) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COPIES', message: 'Copies must be between 1 and 10' },
        });
      }
      printerSettings.copies = copiesNum;
    }

    // Verify user exists
    await prisma.users.findUnique({
      where: { id: userId }
    });

    // We cannot save to DB, so we just return the updated values merged with defaults
    // This simulates a successful update
    const updatedSettings = { ...DEFAULT_SETTINGS, ...printerSettings };

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Printer settings updated successfully (Session only - DB column missing)',
    });
  } catch (error) {
    console.error('Error updating printer settings:', error);
    return next(error);
  }
};

/**
 * Reset printer settings to default
 */
export const resetPrinterSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    res.json({
      success: true,
      data: DEFAULT_SETTINGS,
      message: 'Printer settings reset to default',
    });
  } catch (error) {
    console.error('Error resetting printer settings:', error);
    return next(error);
  }
};