import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        printerSettings: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    res.json({
      success: true,
      data: user.printerSettings || {},
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

    // Get current settings and merge
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { printerSettings: true },
    });

    const currentSettings = (currentUser?.printerSettings as any) || {};
    const updatedSettings = { ...currentSettings, ...printerSettings };

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        printerSettings: updatedSettings,
      },
      select: {
        printerSettings: true,
      },
    });

    res.json({
      success: true,
      data: user.printerSettings,
      message: 'Printer settings updated successfully',
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

    const defaultSettings = {
      defaultPrinter: '',
      printerWidth: '80mm',
      autoPrint: true,
      copies: 1,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        printerSettings: defaultSettings,
      },
    });

    res.json({
      success: true,
      data: defaultSettings,
      message: 'Printer settings reset to default',
    });
  } catch (error) {
    console.error('Error resetting printer settings:', error);
    return next(error);
  }
};
