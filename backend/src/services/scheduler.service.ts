import cron from 'node-cron';
import prisma from '../utils/prisma';

// Run every minute
const scheduler = cron.schedule('* * * * *', async () => {
  console.log('[Scheduler] Checking for scheduled posts...');
  
  try {
    const now = new Date();
    
    // Find posts ready to publish
    const scheduledPosts = await prisma.social_posts.findMany({
      where: {
        status: 'scheduled',
        scheduled_at: {
          lte: now
        }
      }
    });

    for (const post of scheduledPosts) {
        // Here we would call the actual Social Media API (FB/IG Graph API)
        // Since we don't have real credentials, we just mark as published.
        
        console.log(`[Scheduler] Publishing post ID ${post.id} to ${post.platform}...`);
        
        await prisma.social_posts.update({
            where: { id: post.id },
            data: {
                status: 'published',
                published_at: now
            }
        });
        
        // Mock Analytics update
        await prisma.social_analytics.upsert({
            where: { post_id: post.id },
            create: { post_id: post.id, likes_count: 0, reach_count: 0 },
            update: { last_updated: now }
        });
    }
    
  } catch (error) {
    console.error('[Scheduler] Error:', error);
  }
});

export default scheduler;
