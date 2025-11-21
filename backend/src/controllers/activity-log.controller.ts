import { Request, Response } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
  user?: any;
}

// Create activity log
export const createActivityLog = async (
  userId: number,
  actionType: string,
  entityType: string,
  entityId: number | null,
  oldValue: any,
  newValue: any,
  reason: string | null,
  outletId?: number | null
) => {
  try {
    const log = await prisma.activityLog.create({
      data: {
        user_id: userId,
        outlet_id: outletId || null,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        reason: reason,
      },
    });
    return log;
  } catch (error) {
    console.error('Error creating activity log:', error);
    throw error;
  }
};

// Get activity logs for owner
export const getActivityLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, actionType, entityType, userId, startDate, endDate } = req.query;
    const outletId = req.user.outletId;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      outlet_id: outletId,
    };

    if (actionType) {
      where.action_type = actionType;
    }

    if (entityType) {
      where.entity_type = entityType;
    }

    if (userId) {
      where.user_id = Number(userId);
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.created_at.lte = new Date(endDate as string);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil log aktivitas',
      error: error.message,
    });
  }
};

// Get activity logs for specific entity
export const getEntityActivityLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const outletId = req.user.outletId;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          outlet_id: outletId,
          entity_type: entityType,
          entity_id: Number(entityId),
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.activityLog.count({
        where: {
          outlet_id: outletId,
          entity_type: entityType,
          entity_id: Number(entityId),
        },
      }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error getting entity activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil log aktivitas entitas',
      error: error.message,
    });
  }
};

// Get recent activities summary
export const getRecentActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { hours = 24 } = req.query;
    const outletId = req.user.outletId;

    const startDate = new Date();
    startDate.setHours(startDate.getHours() - Number(hours));

    const logs = await prisma.activityLog.findMany({
      where: {
        outlet_id: outletId,
        created_at: {
          gte: startDate,
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
    });

    // Group by action type
    const activitySummary = logs.reduce((acc: any, log) => {
      const actionType = log.action_type;
      if (!acc[actionType]) {
        acc[actionType] = {
          count: 0,
          recent: [],
        };
      }
      acc[actionType].count += 1;
      if (acc[actionType].recent.length < 5) {
        acc[actionType].recent.push(log);
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        logs,
        summary: activitySummary,
        totalActivities: logs.length,
        timeRange: {
          from: startDate,
          to: new Date(),
          hours: Number(hours),
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil aktivitas terbaru',
      error: error.message,
    });
  }
};

// Get user activity summary
export const getUserActivitySummary = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const outletId = req.user.outletId;

    const where: any = {
      outlet_id: outletId,
      user_id: Number(userId),
    };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.created_at.lte = new Date(endDate as string);
      }
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
    });

    // Group by action type
    const actionTypeSummary = logs.reduce((acc: any, log) => {
      const actionType = log.action_type;
      if (!acc[actionType]) {
        acc[actionType] = 0;
      }
      acc[actionType] += 1;
      return acc;
    }, {});

    // Group by entity type
    const entityTypeSummary = logs.reduce((acc: any, log) => {
      const entityType = log.entity_type;
      if (!acc[entityType]) {
        acc[entityType] = 0;
      }
      acc[entityType] += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        userId: Number(userId),
        totalActivities: logs.length,
        actionTypeSummary,
        entityTypeSummary,
        recentLogs: logs.slice(0, 10),
      },
    });
  } catch (error: any) {
    console.error('Error getting user activity summary:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil ringkasan aktivitas user',
      error: error.message,
    });
  }
};
