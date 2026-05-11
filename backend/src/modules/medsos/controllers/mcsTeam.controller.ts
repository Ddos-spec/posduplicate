import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../../utils/prisma';

type JsonRecord = Record<string, any>;

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

// MCS module keys available as permissions
const MCS_MODULES = ['inbox', 'analytics', 'content', 'ads', 'settings', 'marketplace'] as const;
type McsModule = (typeof MCS_MODULES)[number];

function buildMcsPermissions(input: Partial<Record<McsModule, boolean>>): Record<McsModule, boolean> {
  const result = {} as Record<McsModule, boolean>;
  for (const mod of MCS_MODULES) {
    result[mod] = Boolean(input[mod]);
  }
  return result;
}

function extractMcsPermissions(user: { dashboard_preferences: unknown }): Record<McsModule, boolean> {
  const prefs = asRecord(user.dashboard_preferences);
  const mcs = asRecord(prefs.mcs);
  return buildMcsPermissions(mcs as Partial<Record<McsModule, boolean>>);
}

export const listTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    const members = await prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        roles: { name: 'mcs_member' },
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
        last_login: true,
        dashboard_preferences: true,
        roles: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      isActive: m.is_active,
      lastLogin: m.last_login,
      createdAt: m.created_at,
      mcsPermissions: extractMcsPermissions(m),
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createTeamMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { name, email, password, mcsPermissions } = req.body as {
      name: string;
      email: string;
      password: string;
      mcsPermissions?: Partial<Record<McsModule, boolean>>;
    };

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name, email, dan password wajib diisi.' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password minimal 6 karakter.' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.users.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email sudah terdaftar.' },
      });
    }

    // Ensure mcs_member role exists
    let mcsRole = await prisma.roles.findFirst({ where: { name: 'mcs_member' } });
    if (!mcsRole) {
      mcsRole = await prisma.roles.create({
        data: { name: 'mcs_member', permissions: { mcs: {} } },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const permissions = buildMcsPermissions(mcsPermissions || {});

    const user = await prisma.users.create({
      data: {
        tenant_id: tenantId,
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role_id: mcsRole.id,
        is_active: true,
        first_login: false,
        dashboard_preferences: { mcs: permissions },
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
        dashboard_preferences: true,
        roles: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at,
        mcsPermissions: extractMcsPermissions(user),
      },
      message: 'Anggota tim MCS berhasil dibuat.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeamMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const memberId = Number(req.params.memberId);
    const { name, password, mcsPermissions, isActive } = req.body as {
      name?: string;
      password?: string;
      mcsPermissions?: Partial<Record<McsModule, boolean>>;
      isActive?: boolean;
    };

    const existing = await prisma.users.findFirst({
      where: { id: memberId, tenant_id: tenantId, roles: { name: 'mcs_member' } },
      select: { id: true, dashboard_preferences: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Anggota tim tidak ditemukan.' },
      });
    }

    const currentPrefs = asRecord(existing.dashboard_preferences);
    const currentMcs = asRecord(currentPrefs.mcs);

    const updateData: Record<string, any> = { updated_at: new Date() };

    if (name) updateData.name = name.trim();
    if (typeof isActive === 'boolean') updateData.is_active = isActive;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password minimal 6 karakter.' },
        });
      }
      updateData.password_hash = await bcrypt.hash(password, 12);
    }
    if (mcsPermissions !== undefined) {
      const merged = { ...currentMcs, ...mcsPermissions };
      updateData.dashboard_preferences = { ...currentPrefs, mcs: buildMcsPermissions(merged as Partial<Record<McsModule, boolean>>) };
    }

    const updated = await prisma.users.update({
      where: { id: memberId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
        dashboard_preferences: true,
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        isActive: updated.is_active,
        createdAt: updated.created_at,
        mcsPermissions: extractMcsPermissions(updated),
      },
      message: 'Anggota tim diperbarui.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTeamMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const memberId = Number(req.params.memberId);

    const existing = await prisma.users.findFirst({
      where: { id: memberId, tenant_id: tenantId, roles: { name: 'mcs_member' } },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Anggota tim tidak ditemukan.' },
      });
    }

    // Soft delete — deactivate instead of hard delete to preserve audit trail
    await prisma.users.update({
      where: { id: memberId },
      data: { is_active: false, updated_at: new Date() },
    });

    res.json({ success: true, message: 'Anggota tim dinonaktifkan.' });
  } catch (error) {
    next(error);
  }
};

// Expose MCS_MODULES list for frontend info
export const getMcsModules = (_req: Request, res: Response) => {
  res.json({ success: true, data: MCS_MODULES });
};
