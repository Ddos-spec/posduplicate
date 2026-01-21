import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

// Scheduler state (in production, use a proper job queue like Bull/BullMQ)
let schedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;

// Get all posts (supports filtering for calendar)
export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, platform, status } = req.query;
    const tenantId = (req as any).tenantId;

    const where: any = { tenant_id: tenantId };

    // Date range filter (for Calendar View)
    if (startDate && endDate) {
      where.scheduled_at = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (platform) where.platform = platform;
    if (status) where.status = status;

    const posts = await prisma.social_posts.findMany({
      where,
      include: {
        social_accounts: {
          select: { account_name: true, platform: true }
        },
        social_analytics: true
      },
      orderBy: { scheduled_at: 'asc' }
    });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    next(error);
  }
};

// Create a new post
export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, mediaUrls, platform, scheduledAt, accountId, status } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    // Validation
    if (!content && (!mediaUrls || mediaUrls.length === 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Content or Media is required' }
      });
    }

    const post = await prisma.social_posts.create({
      data: {
        tenant_id: tenantId,
        created_by: userId,
        content,
        media_urls: mediaUrls || [],
        platform: platform || 'instagram',
        scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
        account_id: accountId ? parseInt(accountId) : null,
        status: status || 'draft'
      }
    });

    // Mock Analytics entry
    await prisma.social_analytics.create({
      data: {
        post_id: post.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// Update post
export const updatePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { content, mediaUrls, scheduledAt, status } = req.body;
    const tenantId = (req as any).tenantId;

    const post = await prisma.social_posts.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.status === 'published') {
      return res.status(400).json({ success: false, message: 'Cannot edit published post' });
    }

    const updated = await prisma.social_posts.update({
      where: { id: parseInt(id) },
      data: {
        content,
        media_urls: mediaUrls,
        scheduled_at: scheduledAt ? new Date(scheduledAt) : post.scheduled_at,
        status
      }
    });

    res.json({
      success: true,
      message: 'Post updated',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// Delete post
export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const post = await prisma.social_posts.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await prisma.social_posts.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
};

// ============= SCHEDULER & PUBLISHER =============

/**
 * Manually publish a post
 */
export const publishPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const post = await prisma.social_posts.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId },
      include: { social_accounts: true }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post tidak ditemukan' }
      });
    }

    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_PUBLISHED', message: 'Post sudah dipublish' }
      });
    }

    if (!post.social_accounts) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_ACCOUNT', message: 'Post belum terhubung ke akun sosial media' }
      });
    }

    // Attempt to publish
    const result = await publishToSocialMedia(post, post.social_accounts);

    if (result.success) {
      await prisma.social_posts.update({
        where: { id: post.id },
        data: {
          status: 'published',
          published_at: new Date(),
          external_id: result.externalId
        }
      });

      res.json({
        success: true,
        message: 'Post berhasil dipublish',
        data: { externalId: result.externalId }
      });
    } else {
      await prisma.social_posts.update({
        where: { id: post.id },
        data: {
          status: 'failed',
          error_message: result.error
        }
      });

      res.status(400).json({
        success: false,
        error: { code: 'PUBLISH_FAILED', message: result.error }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Start the scheduler (should be called on server startup)
 */
export const startScheduler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (schedulerRunning) {
      return res.json({
        success: true,
        message: 'Scheduler sudah berjalan'
      });
    }

    schedulerRunning = true;
    console.log('[Medsos Scheduler] Starting scheduler...');

    // Run every minute
    schedulerInterval = setInterval(async () => {
      await processScheduledPosts();
    }, 60 * 1000);

    // Run immediately on start
    await processScheduledPosts();

    res.json({
      success: true,
      message: 'Scheduler berhasil dijalankan'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stop the scheduler
 */
export const stopScheduler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!schedulerRunning) {
      return res.json({
        success: true,
        message: 'Scheduler tidak sedang berjalan'
      });
    }

    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    schedulerRunning = false;

    console.log('[Medsos Scheduler] Scheduler stopped');

    res.json({
      success: true,
      message: 'Scheduler berhasil dihentikan'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pendingCount = await prisma.social_posts.count({
      where: { status: 'scheduled' }
    });

    res.json({
      success: true,
      data: {
        running: schedulerRunning,
        pendingPosts: pendingCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process scheduled posts (called by scheduler)
 */
async function processScheduledPosts(): Promise<void> {
  try {
    const now = new Date();

    // Find posts that are scheduled and due
    const duePosts = await prisma.social_posts.findMany({
      where: {
        status: 'scheduled',
        scheduled_at: { lte: now }
      },
      include: { social_accounts: true }
    });

    console.log(`[Medsos Scheduler] Processing ${duePosts.length} scheduled posts`);

    for (const post of duePosts) {
      if (!post.social_accounts) {
        await prisma.social_posts.update({
          where: { id: post.id },
          data: {
            status: 'failed',
            error_message: 'No social account linked'
          }
        });
        continue;
      }

      const result = await publishToSocialMedia(post, post.social_accounts);

      if (result.success) {
        await prisma.social_posts.update({
          where: { id: post.id },
          data: {
            status: 'published',
            published_at: new Date(),
            external_id: result.externalId
          }
        });
        console.log(`[Medsos Scheduler] Published post ${post.id}`);
      } else {
        await prisma.social_posts.update({
          where: { id: post.id },
          data: {
            status: 'failed',
            error_message: result.error
          }
        });
        console.log(`[Medsos Scheduler] Failed to publish post ${post.id}: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('[Medsos Scheduler] Error processing scheduled posts:', error);
  }
}

/**
 * Publish to social media platform
 */
async function publishToSocialMedia(post: any, account: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
  console.log(`[Publisher] Publishing to ${account.platform}: "${post.content?.substring(0, 50)}..."`);

  // Check if account has valid token
  if (!account.access_token) {
    return { success: false, error: 'Access token tidak valid' };
  }

  if (account.token_expires && new Date(account.token_expires) < new Date()) {
    return { success: false, error: 'Access token expired. Silakan refresh token atau hubungkan ulang akun.' };
  }

  // Production: Make actual API call based on platform
  try {
    let response;
    let externalId: string;

    switch (account.platform) {
      case 'instagram':
        // Instagram Graph API
        response = await fetch(`https://graph.facebook.com/v18.0/${account.account_id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caption: post.content,
            image_url: post.media_urls?.[0],
            access_token: account.access_token
          })
        });
        break;

      case 'facebook':
        // Facebook Graph API
        response = await fetch(`https://graph.facebook.com/v18.0/${account.account_id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: post.content,
            access_token: account.access_token
          })
        });
        break;

      case 'tiktok':
        // TikTok API (video upload is more complex, simplified here)
        response = await fetch('https://open-api.tiktok.com/share/video/upload/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_url: post.media_urls?.[0],
            title: post.content?.substring(0, 150)
          })
        });
        break;

      default:
        return { success: false, error: `Platform ${account.platform} tidak didukung` };
    }

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || data.error_description || 'Publish failed' };
    }

    externalId = data.id || data.post_id || `${account.platform}_${Date.now()}`;
    return { success: true, externalId };
  } catch (error: any) {
    console.error(`[Publisher] Error publishing to ${account.platform}:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// ============= ANALYTICS =============

/**
 * Get post analytics
 */
export const getPostAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const post = await prisma.social_posts.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId },
      include: { social_analytics: true, social_accounts: true }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post tidak ditemukan' }
      });
    }

    // If post is published and has external_id, try to sync analytics
    if (post.status === 'published' && post.external_id && post.social_accounts) {
      const freshAnalytics = await fetchAnalyticsFromPlatform(post.external_id, post.social_accounts);

      if (freshAnalytics) {
        // Update analytics in database
        await prisma.social_analytics.upsert({
          where: { post_id: post.id },
          update: {
            impressions: freshAnalytics.impressions,
            reach: freshAnalytics.reach,
            likes: freshAnalytics.likes,
            comments: freshAnalytics.comments,
            shares: freshAnalytics.shares,
            saves: freshAnalytics.saves,
            engagement_rate: freshAnalytics.engagementRate,
            updated_at: new Date()
          },
          create: {
            post_id: post.id,
            impressions: freshAnalytics.impressions,
            reach: freshAnalytics.reach,
            likes: freshAnalytics.likes,
            comments: freshAnalytics.comments,
            shares: freshAnalytics.shares,
            saves: freshAnalytics.saves,
            engagement_rate: freshAnalytics.engagementRate
          }
        });

        return res.json({
          success: true,
          data: freshAnalytics,
          source: 'api'
        });
      }
    }

    // Return cached analytics
    res.json({
      success: true,
      data: post.social_analytics || { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0 },
      source: 'cache'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync analytics for all published posts
 */
export const syncAllAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId;

    const publishedPosts = await prisma.social_posts.findMany({
      where: {
        tenant_id: tenantId,
        status: 'published',
        external_id: { not: null }
      },
      include: { social_accounts: true }
    });

    let synced = 0;
    let failed = 0;

    for (const post of publishedPosts) {
      if (!post.social_accounts) continue;

      const analytics = await fetchAnalyticsFromPlatform(post.external_id!, post.social_accounts);

      if (analytics) {
        await prisma.social_analytics.upsert({
          where: { post_id: post.id },
          update: {
            impressions: analytics.impressions,
            reach: analytics.reach,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            saves: analytics.saves,
            engagement_rate: analytics.engagementRate,
            updated_at: new Date()
          },
          create: {
            post_id: post.id,
            impressions: analytics.impressions,
            reach: analytics.reach,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            saves: analytics.saves,
            engagement_rate: analytics.engagementRate
          }
        });
        synced++;
      } else {
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Analytics sync complete`,
      data: { total: publishedPosts.length, synced, failed }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch analytics from platform API
 */
async function fetchAnalyticsFromPlatform(externalId: string, account: any): Promise<any | null> {
  console.log(`[Analytics] Fetching analytics for ${externalId} from ${account.platform}`);

  // Check token validity
  if (!account.access_token) {
    console.log('[Analytics] No access token');
    return null;
  }

  // Production: Make actual API call based on platform
  try {
    let response;

    switch (account.platform) {
      case 'instagram':
        // Instagram Insights API
        response = await fetch(
          `https://graph.facebook.com/v18.0/${externalId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${account.access_token}`
        );
        break;

      case 'facebook':
        // Facebook Insights API
        response = await fetch(
          `https://graph.facebook.com/v18.0/${externalId}/insights?metric=post_impressions,post_reach,post_reactions_like_total,post_comments,post_shares&access_token=${account.access_token}`
        );
        break;

      case 'tiktok':
        // TikTok Analytics API
        response = await fetch(
          `https://open-api.tiktok.com/video/query/?video_id=${externalId}`,
          {
            headers: { 'Authorization': `Bearer ${account.access_token}` }
          }
        );
        break;

      default:
        return null;
    }

    const data = await response.json();
    if (!response.ok) {
      console.error(`[Analytics] API error for ${account.platform}:`, data);
      return null;
    }

    // Parse response based on platform
    if (account.platform === 'instagram' || account.platform === 'facebook') {
      const metrics = data.data || [];
      const getValue = (name: string) => metrics.find((m: any) => m.name === name)?.values?.[0]?.value || 0;
      return {
        impressions: getValue('impressions') || getValue('post_impressions'),
        reach: getValue('reach') || getValue('post_reach'),
        likes: getValue('likes') || getValue('post_reactions_like_total'),
        comments: getValue('comments') || getValue('post_comments'),
        shares: getValue('shares') || getValue('post_shares'),
        saves: getValue('saved') || 0,
        engagementRate: 0 // Calculate separately
      };
    } else if (account.platform === 'tiktok') {
      const video = data.data || {};
      return {
        impressions: video.play_count || 0,
        reach: video.view_count || 0,
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
        saves: video.download_count || 0,
        engagementRate: 0
      };
    }

    return null;
  } catch (error) {
    console.error('[Analytics] Error fetching analytics:', error);
    return null;
  }
}
