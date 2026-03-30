import nodemailer from 'nodemailer';
import prisma from '../../../utils/prisma';

export interface TenantNotificationPreferences {
  notificationEmail: string | null;
  emailNotifications: boolean;
  approvalEmailAlerts: boolean;
  lowStockAlerts: boolean;
  dailySalesReport: boolean;
  whatsappNotifications: boolean;
}

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const DEFAULT_NOTIFICATION_PREFERENCES: TenantNotificationPreferences = {
  notificationEmail: null,
  emailNotifications: true,
  approvalEmailAlerts: true,
  lowStockAlerts: true,
  dailySalesReport: false,
  whatsappNotifications: false
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
};

const toNullableEmail = (value: unknown, fallback: string | null = null) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const normalizeTenantNotificationPreferences = (
  value: unknown,
  fallbackEmail: string | null = null
): TenantNotificationPreferences => {
  const candidate = toRecord(value);

  return {
    notificationEmail: toNullableEmail(candidate.notificationEmail, fallbackEmail),
    emailNotifications: toBoolean(candidate.emailNotifications, DEFAULT_NOTIFICATION_PREFERENCES.emailNotifications),
    approvalEmailAlerts: toBoolean(candidate.approvalEmailAlerts, DEFAULT_NOTIFICATION_PREFERENCES.approvalEmailAlerts),
    lowStockAlerts: toBoolean(candidate.lowStockAlerts, DEFAULT_NOTIFICATION_PREFERENCES.lowStockAlerts),
    dailySalesReport: toBoolean(candidate.dailySalesReport, DEFAULT_NOTIFICATION_PREFERENCES.dailySalesReport),
    whatsappNotifications: false
  };
};

const parsePort = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
};

export const isEmailDeliveryConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

export const getNotificationDeliveryStatus = () => ({
  emailConfigured: isEmailDeliveryConfigured(),
  whatsappConfigured: false
});

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!isEmailDeliveryConfigured()) {
    throw new Error('SMTP sender belum dikonfigurasi di server.');
  }

  if (!transporter) {
    const port = parsePort(process.env.SMTP_PORT);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return transporter;
};

const getSenderAddress = () => {
  const address = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  if (!address) {
    throw new Error('Alamat pengirim email belum dikonfigurasi.');
  }

  const senderName = process.env.SMTP_FROM_NAME || 'MyPOS Notifications';
  return `"${senderName}" <${address}>`;
};

export const sendEmail = async ({ to, subject, text, html }: SendEmailInput) => {
  const mailer = getTransporter();
  return mailer.sendMail({
    from: getSenderAddress(),
    to,
    subject,
    text,
    html
  });
};

export const getTenantNotificationPreferences = async (tenantId: number) => {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      business_name: true,
      email: true,
      settings: true
    }
  });

  if (!tenant) {
    throw new Error('Tenant tidak ditemukan.');
  }

  const settings = toRecord(tenant.settings);
  const preferences = normalizeTenantNotificationPreferences(settings, tenant.email || null);

  return {
    businessName: tenant.business_name,
    fallbackEmail: tenant.email || null,
    preferences
  };
};

export const sendTenantNotificationEmail = async (
  tenantId: number,
  input: Omit<SendEmailInput, 'to'>
) => {
  const tenantNotification = await getTenantNotificationPreferences(tenantId);
  const recipient = tenantNotification.preferences.notificationEmail;

  if (!recipient || !tenantNotification.preferences.emailNotifications) {
    return null;
  }

  return sendEmail({
    to: recipient,
    ...input
  });
};
