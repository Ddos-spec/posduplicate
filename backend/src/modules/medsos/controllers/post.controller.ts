import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

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
