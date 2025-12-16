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
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { maxUsers: true }
    });
    
    const maxUsers = tenant?.maxUsers || 5;

    const totalUsers = await prisma.user.count({ where: { tenantId } });
    const activeUsers = await prisma.user.count({ where: { tenantId, isActive: true } });
    
    // Login Today (Approximation: lastLogin >= today 00:00)
    const today = new Date();
    today.setHours(0,0,0,0);
    const loginToday = await prisma.user.count({ 
        where: { 
            tenantId, 
            lastLogin: { gte: today } 
        } 
    });

    const slotsRemaining = Math.max(0, maxUsers - totalUsers);

    // 2. Fetch Users
    const where: any = { tenantId };
    
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
        prisma.user.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
            include: {
                roles: { select: { id: true, name: true } },
                outlets: { select: { id: true, name: true } }
            }
        }),
        prisma.user.count({ where })
    ]);

    // Format Users
    const formattedUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.roles,
        outlet: u.outlets || { id: 0, name: 'All/None' },
        is_active: u.isActive,
        created_at: u.createdAt,
        last_login: u.lastLogin
    }));

    res.json({
        success: true,
        data: {
            stats: {
                totalUsers,
                activeUsers,
                loginToday,
                slotsRemaining
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
    next(error);
  }
};

/**
 * Create User (Accounting Module specific)
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, role, outletId, sendEmailNotification } = req.body;
    const tenantId = req.tenantId!;

    // 1. Validate Slots
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { maxUsers: true }
    });
    
    const currentUsers = await prisma.user.count({ where: { tenantId } });
    if (currentUsers >= (tenant?.maxUsers || 5)) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'SLOTS_FULL', message: 'User limit reached for this subscription plan' } 
        });
    }

    // 2. Resolve Role ID
    // Check if role exists by name, or use provided ID?
    // Prompt sends "role": "produsen".
    let roleId = 0;
    // Standardize role names: 'distributor', 'produsen', 'retail', 'owner', 'staff'
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (roleRecord) {
        roleId = roleRecord.id;
    } else {
        // Fallback or Error?
        // Let's create role if it's one of the standard accounting roles and doesn't exist?
        // Or return error.
        return res.status(400).json({ 
            success: false, 
            error: { code: 'INVALID_ROLE', message: `Role '${role}' not found` } 
        });
    }

    // 3. Create User
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(400).json({ 
            success: false, 
            error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } 
        });
    }

    const tempPassword = `Temp${Math.floor(Math.random() * 10000)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
        data: {
            tenantId,
            name,
            email,
            passwordHash,
            roleId,
            outletId: outletId ? Number(outletId) : null,
            isActive: true,
            // invitation_token? Not using it for now
        }
    });

    // 4. Send Email (Mock)
    if (sendEmailNotification) {
        console.log(`[Email Mock] To: ${email}, Subject: Welcome to MyAkuntan, Password: ${tempPassword}`);
    }

    res.status(201).json({
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
    next(error);
  }
};

/**
 * Update User Status
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { is_active, reason } = req.body;
        const tenantId = req.tenantId!;

        const user = await prisma.user.findUnique({ where: { id: Number(id) } });

        if (!user || user.tenantId !== tenantId) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        }

        // Validate: Cannot deactivate self?
        if (user.id === req.userId) {
             return res.status(400).json({ success: false, error: { code: 'SELF_ACTION', message: 'Cannot deactivate your own account' } });
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { isActive: is_active }
        });

        // Audit Log handles the rest via middleware (POST/PATCH) or we can add custom log for 'reason'
        // If we want to store 'reason' specifically, we might need a custom audit log call here 
        // because middleware only sees body, not "context" of why unless it's in body.
        // Middleware captures body.reason if present.

        res.json({ success: true, data: updated });

    } catch (error) {
        next(error);
    }
}
