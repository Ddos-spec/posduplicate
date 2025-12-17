import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

/**
 * Get Users with Stats
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const tenantId = req.tenantId!;

    // 1. Get Tenant Stats (Slots)
    const tenant = await prisma.tenants.findUnique({
        where: { id: tenantId },
        select: { max_users: true }
    });

    const maxUsers = tenant?.max_users || 5;

    const totalUsers = await prisma.users.count({ where: { tenant_id: tenantId } });
    const activeUsers = await prisma.users.count({ where: { tenant_id: tenantId, is_active: true } });

    // Login Today (Approximation: lastLogin >= today 00:00)
    const today = new Date();
    today.setHours(0,0,0,0);
    const loginToday = await prisma.users.count({
        where: {
            tenant_id: tenantId,
            last_login: { gte: today }
        }
    });

    const slotsRemaining = Math.max(0, maxUsers - totalUsers);

    // 2. Fetch Users
    const where: any = { tenant_id: tenantId };

    if (role) {
         where.roles = { name: String(role) }; // Assume role is role name
    }

    if (search) {
        where.OR = [
            { name: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } }
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, totalCount] = await Promise.all([
        prisma.users.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy: { created_at: 'desc' },
            include: {
                roles: { select: { id: true, name: true } },
                outlets: { select: { id: true, name: true } }
            }
        }),
        prisma.users.count({ where })
    ]);

    // Format Users
    const formattedUsers = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.roles,
        outlet: u.outlets || { id: 0, name: 'All/None' },
        is_active: u.is_active,
        created_at: u.created_at,
        last_login: u.last_login
    }));

    return res.json({
        success: true,
        data: {
            stats: {
                totalUsers,
                activeUsers,
                loginToday,
                slotsRemaining,
                maxUsers
            },
            users: formattedUsers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: totalCount,
                totalPages: Math.ceil(totalCount / Number(limit))
            }
        }
    });

  } catch (error) {
    return next(error);
  }
};

/**
 * Create User (Accounting Module specific)
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, outletId, sendEmailNotification } = req.body;
    const tenantId = req.tenantId!;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, and role are required' }
      });
    }

    // 1. Validate Slots
    const tenant = await prisma.tenants.findUnique({
        where: { id: tenantId },
        select: { max_users: true }
    });

    const currentUsers = await prisma.users.count({ where: { tenant_id: tenantId } });
    if (currentUsers >= (tenant?.max_users || 5)) {
        return res.status(400).json({
            success: false,
            error: { code: 'SLOTS_FULL', message: 'User limit reached for this subscription plan' }
        });
    }

    // 2. Resolve Role ID
    const rawRole = String(role).trim();
    const roleMap: Record<string, string> = {
      distributor: 'Distributor',
      produsen: 'Produsen',
      retail: 'Retail',
      accountant: 'Accountant'
    };
    const resolvedRoleName = roleMap[rawRole.toLowerCase()] || rawRole;

    let roleRecord = await prisma.roles.findFirst({
      where: { name: { equals: resolvedRoleName, mode: 'insensitive' } }
    });

    if (!roleRecord) {
      const autoCreateRoles = new Set(Object.values(roleMap));
      if (autoCreateRoles.has(resolvedRoleName)) {
        roleRecord = await prisma.roles.create({
          data: { name: resolvedRoleName }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ROLE', message: `Role '${role}' not found` }
        });
      }
    }

    // 3. Create User
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
        return res.status(400).json({
            success: false,
            error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
        });
    }

    const rawPassword = typeof password === 'string' ? password.trim() : '';
    const tempPassword = rawPassword || `Temp${Math.floor(Math.random() * 10000)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.users.create({
        data: {
            tenant_id: tenantId,
            name,
            email,
            password_hash: passwordHash,
            role_id: roleRecord.id,
            outlet_id: outletId ? Number(outletId) : null,
            is_active: true,
        }
    });

    // 4. Send Email (Mock)
    if (sendEmailNotification) {
        console.log(`[Email Mock] To: ${email}, Subject: Welcome to MyAkuntan, Password: ${tempPassword}`);
    }

    return res.status(201).json({
        success: true,
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                tempPassword // Return only once
            },
            emailSent: sendEmailNotification
        }
    });

  } catch (error) {
    return next(error);
  }
};

/**
 * Update User Status
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const tenantId = req.tenantId!;

        const user = await prisma.users.findUnique({ where: { id: Number(id) } });

        if (!user || user.tenant_id !== tenantId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        }

        // Validate: Cannot deactivate self?
        if (user.id === req.userId) {
             return res.status(400).json({ success: false, error: { code: 'SELF_ACTION', message: 'Cannot deactivate your own account' } });
        }

        const updated = await prisma.users.update({
            where: { id: user.id },
            data: { is_active: is_active }
        });

        return res.json({ success: true, data: updated });

    } catch (error) {
        return next(error);
    }
}
