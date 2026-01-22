import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

// OAuth Configuration (in production, these would be in env vars)
const OAUTH_CONFIG: Record<string, { authUrl: string; tokenUrl: string; scopes: string[] }> = {
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['user_profile', 'user_media']
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement']
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/auth/authorize/',
    tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
    scopes: ['user.info.basic', 'video.upload']
  }
};

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
        token_expires: true,
        created_at: true
      }
    });

    // Add token status to each account
    const accountsWithStatus = accounts.map(acc => ({
      ...acc,
      tokenStatus: acc.token_expires
        ? (new Date(acc.token_expires) > new Date() ? 'valid' : 'expired')
        : 'unknown'
    }));

    res.json({ success: true, data: accountsWithStatus });
  } catch (error) {
    next(error);
  }
};

// Initialize OAuth flow - returns authorization URL
export const initOAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = req.body;
    const tenantId = (req as any).tenantId;

    if (!platform || !OAUTH_CONFIG[platform]) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLATFORM', message: 'Platform tidak didukung. Gunakan: instagram, facebook, tiktok' }
      });
    }

    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const redirectUri = process.env[`${platform.toUpperCase()}_REDIRECT_URI`];
    if (!clientId || !redirectUri) {
      return res.status(500).json({
        success: false,
        error: { code: 'OAUTH_NOT_CONFIGURED', message: `OAuth ${platform} belum dikonfigurasi` }
      });
    }

    const config = OAUTH_CONFIG[platform];
    const state = Buffer.from(JSON.stringify({ tenantId, platform, timestamp: Date.now() })).toString('base64');

    // Build OAuth authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(','),
      response_type: 'code',
      state
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    res.json({
      success: true,
      data: {
        authUrl,
        platform,
        message: 'Redirect user ke authUrl untuk memulai OAuth flow'
      }
    });
  } catch (error) {
    next(error);
  }
};

// OAuth Callback - exchange code for tokens
export const oauthCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Code dan state wajib ada' }
      });
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'State tidak valid' }
      });
    }

    const { tenantId, platform } = stateData;
    const config = OAUTH_CONFIG[platform];

    if (!config) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLATFORM', message: 'Platform tidak valid' }
      });
    }

    const tokenResponse = await exchangeCodeForTokens(platform, code as string);

    if (!tokenResponse.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXCHANGE_FAILED', message: tokenResponse.error }
      });
    }

    // Calculate token expiry (most platforms give expires_in in seconds)
    const expiresAt = new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000);

    // Create or update account
    const account = await prisma.social_accounts.upsert({
      where: {
        tenant_id_platform_account_id: {
          tenant_id: tenantId,
          platform,
          account_id: tokenResponse.user_id || tokenResponse.account_id
        }
      },
      update: {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
        token_expires: expiresAt,
        account_name: tokenResponse.username || tokenResponse.name,
        is_active: true,
        updated_at: new Date()
      },
      create: {
        tenant_id: tenantId,
        platform,
        account_id: tokenResponse.user_id || tokenResponse.account_id,
        account_name: tokenResponse.username || tokenResponse.name,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
        token_expires: expiresAt,
        is_active: true
      }
    });

    res.json({
      success: true,
      data: {
        id: account.id,
        platform: account.platform,
        accountName: account.account_name,
        message: 'Akun berhasil terhubung'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const account = await prisma.social_accounts.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Akun tidak ditemukan' }
      });
    }

    if (!account.refresh_token) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Akun tidak memiliki refresh token. Silakan hubungkan ulang.' }
      });
    }

    const tokenResponse = await refreshAccessToken(account.platform, account.refresh_token);

    if (!tokenResponse.success) {
      // Mark account as inactive if refresh fails
      await prisma.social_accounts.update({
        where: { id: account.id },
        data: { is_active: false }
      });

      return res.status(400).json({
        success: false,
        error: { code: 'REFRESH_FAILED', message: 'Gagal refresh token. Silakan hubungkan ulang akun.' }
      });
    }

    const expiresAt = new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000);

    await prisma.social_accounts.update({
      where: { id: account.id },
      data: {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || account.refresh_token,
        token_expires: expiresAt,
        is_active: true,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Token berhasil di-refresh',
      data: { expiresAt }
    });
  } catch (error) {
    next(error);
  }
};

// Connect Account (Manual/Development mode)
export const connectAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform, accountName, accountId, accessToken, refreshToken, expiresIn } = req.body;
    const tenantId = (req as any).tenantId;

    if (!platform || !accountName || !accountId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Platform, Account Name dan Account ID wajib diisi' }
      });
    }

    // Validate platform
    if (!OAUTH_CONFIG[platform]) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLATFORM', message: 'Platform tidak didukung' }
      });
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'ACCESS_TOKEN_REQUIRED', message: 'Access token wajib diisi' }
      });
    }

    // Calculate token expiry
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    const account = await prisma.social_accounts.create({
      data: {
        tenant_id: tenantId,
        platform,
        account_name: accountName,
        account_id: accountId,
        access_token: accessToken || null,
        refresh_token: refreshToken || null,
        token_expires: expiresAt,
        is_active: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: account.id,
        platform: account.platform,
        accountName: account.account_name,
        tokenExpires: account.token_expires
      },
      message: 'Akun berhasil ditambahkan'
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Exchange authorization code for tokens
async function exchangeCodeForTokens(platform: string, code: string): Promise<any> {
  const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];
  const redirectUri = process.env[`${platform.toUpperCase()}_REDIRECT_URI`];

  if (!clientId || !clientSecret || !redirectUri) {
    return { success: false, error: `OAuth ${platform} belum dikonfigurasi` };
  }

  // Production: Make actual HTTP request to token endpoint
  const config = OAUTH_CONFIG[platform];
  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || ''
      })
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      return { success: false, error: data.error_description || data.error || 'Token exchange failed' };
    }

    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600,
      user_id: data.user_id || data.id,
      username: data.username || data.name
    };
  } catch (error: any) {
    console.error(`[OAuth] Token exchange error for ${platform}:`, error);
    return { success: false, error: error.message };
  }
}

// Helper: Refresh access token
async function refreshAccessToken(platform: string, refreshToken: string): Promise<any> {
  const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

  if (!clientId || !clientSecret) {
    return { success: false, error: `OAuth ${platform} belum dikonfigurasi` };
  }

  // Production: Make actual HTTP request to refresh token
  const config = OAUTH_CONFIG[platform];
  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      return { success: false, error: data.error_description || data.error || 'Token refresh failed' };
    }

    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in || 3600
    };
  } catch (error: any) {
    console.error(`[OAuth] Token refresh error for ${platform}:`, error);
    return { success: false, error: error.message };
  }
}

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
