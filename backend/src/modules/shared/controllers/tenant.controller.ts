import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import bcrypt from 'bcrypt';
import { generateApiKey, hashApiKey } from '../../../utils/apiKeyGenerator';
import { normalizeEmailIdentity } from '../../../utils/email';

type ModuleKey = 'pos' | 'accounting' | 'inventory' | 'commerSocial';

const defaultModuleFlags: Record<ModuleKey, boolean> = {
  pos: true,
  accounting: true,
  inventory: true,
  commerSocial: true,
};

const toModuleFlags = (
  rawFeatures: unknown,
  fallback: Record<ModuleKey, boolean> = defaultModuleFlags
): Record<ModuleKey, boolean> => {
  const source =
    rawFeatures && typeof rawFeatures === 'object' && !Array.isArray(rawFeatures)
      ? rawFeatures as Record<string, any>
      : {};

  const explicitModules =
    source.modules && typeof source.modules === 'object' && !Array.isArray(source.modules)
      ? source.modules as Record<string, any>
      : source;

  return {
    pos: explicitModules.pos ?? fallback.pos,
    accounting: explicitModules.accounting ?? fallback.accounting,
    inventory: explicitModules.inventory ?? fallback.inventory,
    commerSocial: explicitModules.commerSocial ?? fallback.commerSocial,
  };
};

const buildTenantFeaturesPayload = (rawFeatures: unknown) => {
  const modules = toModuleFlags(rawFeatures);

  return {
    ...(rawFeatures && typeof rawFeatures === 'object' && !Array.isArray(rawFeatures)
      ? rawFeatures as Record<string, unknown>
      : {}),
    pos: modules.pos,
    accounting: modules.accounting,
    inventory: modules.inventory,
    commerSocial: modules.commerSocial,
    reports: true,
    multiOutlet: true,
    analytics: true,
    modules,
  };
};

/**
 * Get all tenants (Super Admin only)
 */
export const getAllTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, plan } = req.query;
    const where: any = { deleted_at: null };

    if (status && status !== 'all') {
      where.subscription_status = status as string;
    }
    if (plan && plan !== 'all') {
      where.subscription_plan = plan as string;
    }
    if (search) {
      where.OR = [
        { business_name: { contains: search as string, mode: 'insensitive' } },
        { owner_name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const tenants = await prisma.tenants.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: tenants });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get single tenant by ID
 */
export const getTenantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const tenant = await prisma.tenants.findUnique({
            where: { id: parseInt(id) },
        });
        if (!tenant) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
        }
        res.json({ success: true, data: tenant });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create new tenant
 */
export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      businessName,
      ownerName,
      email: rawEmail,
      password,
      phone,
      address,
      subscriptionPlan,
      subscriptionStatus,
      maxOutlets,
      maxUsers,
      businessType,
      billingEmail,
      paymentMethod,
      features,
    } = req.body;

    const email = normalizeEmailIdentity(rawEmail);

    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Business name, owner name, email, and password are required' },
      });
    }

    const normalizedFeatures = buildTenantFeaturesPayload(features);
    if (!Object.values(normalizedFeatures.modules).some(Boolean)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one product module must be enabled for a tenant' },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.users.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      const ownerRole = await tx.roles.findUnique({ where: { name: 'Owner' } });
      if (!ownerRole) {
        throw new Error('OWNER_ROLE_NOT_FOUND');
      }

      const now = new Date();
      const firstBillingDate = new Date();
      firstBillingDate.setMonth(firstBillingDate.getMonth() + 1);

      const safeMaxOutlets = Number.isFinite(Number(maxOutlets)) ? Number(maxOutlets) : 999;
      const safeMaxUsers = Number.isFinite(Number(maxUsers)) ? Number(maxUsers) : 999;

      const tenant = await tx.tenants.create({
        data: {
          business_name: businessName,
          owner_name: ownerName,
          email,
          phone,
          address,
          subscription_plan: subscriptionPlan || 'standard',
          subscription_status: subscriptionStatus || 'active',
          subscription_starts_at: now,
          subscription_expires_at: firstBillingDate,
          next_billing_date: firstBillingDate,
          max_outlets: safeMaxOutlets,
          max_users: safeMaxUsers,
          business_type: businessType || 'general',
          billing_email: billingEmail || email,
          payment_method: paymentMethod || 'manual',
          features: normalizedFeatures,
        },
      });

      const hashedPassword = await bcrypt.hash(password, 10);
      await tx.users.create({
        data: {
          name: ownerName,
          email: email,
          password_hash: hashedPassword,
          tenant_id: tenant.id,
          role_id: ownerRole.id,
          is_active: true,
        },
      });

      // Auto-generate API key for the new tenant
      const apiKey = generateApiKey();
      const hashedApiKey = hashApiKey(apiKey);

      await tx.api_keys.create({
        data: {
          tenant_id: tenant.id,
          key_name: 'Default API Key',
          api_key: hashedApiKey,
          is_active: true,
        },
      });

      return { tenant, apiKey };
    });

    res.status(201).json({
      success: true,
      data: result.tenant,
      apiKey: result.apiKey,
      message: 'Tenant and Owner account created successfully. IMPORTANT: Save your API key now, it will not be shown again.',
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(400).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
    }
    if (error.message === 'OWNER_ROLE_NOT_FOUND') {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_CONFIG_ERROR', message: 'Owner role is not configured in the database' },
      });
    }
    return next(error);
  }
};

/**
 * Update tenant
 */
export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.email;

    const fieldMap: Record<string, string> = {
      businessName: 'business_name',
      ownerName: 'owner_name',
      subscriptionPlan: 'subscription_plan',
      subscriptionStatus: 'subscription_status',
      subscriptionStartsAt: 'subscription_starts_at',
      subscriptionExpiresAt: 'subscription_expires_at',
      nextBillingDate: 'next_billing_date',
      lastPaymentAt: 'last_payment_at',
      maxOutlets: 'max_outlets',
      maxUsers: 'max_users',
      billingEmail: 'billing_email',
      paymentMethod: 'payment_method',
      businessType: 'business_type',
      isActive: 'is_active',
      onboardingCompleted: 'onboarding_completed',
      onboardingStep: 'onboarding_step'
    };
    const mappedUpdate: any = {};
    Object.entries(updateData).forEach(([key, value]) => {
      mappedUpdate[fieldMap[key] || key] = value;
    });

    if (mappedUpdate.features !== undefined) {
      const normalizedFeatures = buildTenantFeaturesPayload(mappedUpdate.features);

      if (!Object.values(normalizedFeatures.modules).some(Boolean)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'At least one product module must remain enabled' },
        });
      }

      mappedUpdate.features = normalizedFeatures;
    }

    if (mappedUpdate.max_outlets !== undefined) {
      mappedUpdate.max_outlets = Number(mappedUpdate.max_outlets);
    }

    if (mappedUpdate.max_users !== undefined) {
      mappedUpdate.max_users = Number(mappedUpdate.max_users);
    }

    const tenant = await prisma.tenants.update({
      where: { id: parseInt(id) },
      data: mappedUpdate,
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Activate/Deactivate tenant
 */
export const toggleTenantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const tenant = await prisma.tenants.update({
      where: { id: parseInt(id) },
      data: { is_active: isActive },
    });

    res.json({
      success: true,
      data: tenant,
      message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update subscription
 */
export const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { plan, status, expiresAt } = req.body;
    const updateData: any = {};

    if (plan) {
      updateData.subscription_plan = plan;
    }
    if (status) {
      updateData.subscription_status = status;
    }
    if (expiresAt) {
      updateData.subscription_expires_at = new Date(expiresAt);
    }

    const tenant = await prisma.tenants.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current tenant info (for logged-in tenant admin)
 */
export const getMyTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false, error: { code: 'NO_TENANT', message: 'No tenant associated with this user' } });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: req.tenantId },
      include: {
        _count: {
          select: {
            outlets: true,
            users_users_tenant_idTotenants: true,
          },
        },
      },
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete tenant (soft delete)
 */
export const deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = parseInt(id);

    // Perform the soft delete
    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });

    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
