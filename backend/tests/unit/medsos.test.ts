import { createPost, getPosts, updatePost, deletePost } from '../../src/modules/medsos/controllers/post.controller';
import prisma from '../../src/utils/prisma';

// Mock Prisma
jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: {
        social_posts: {
            create: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        social_analytics: {
            create: jest.fn()
        }
    }
}));

describe('Medsos Controller Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createPost', () => {
        it('should create a scheduled post successfully', async () => {
            // Mock Req/Res
            const req = {
                body: { content: 'Promo Merdeka!', platform: 'instagram', scheduledAt: '2026-08-17' },
                tenantId: 1,
                userId: 1
            } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
            const next = jest.fn();

            // Mock DB Response
            (prisma.social_posts.create as jest.Mock).mockResolvedValue({
                id: 1,
                content: 'Promo Merdeka!',
                status: 'draft'
            });

            await createPost(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(prisma.social_posts.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    content: 'Promo Merdeka!',
                    platform: 'instagram'
                })
            }));
        });

        it('should fail if content empty', async () => {
            const req = { body: {}, tenantId: 1 } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
            
            await createPost(req, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getPosts (Calendar)', () => {
        it('should filter by date range', async () => {
            const req = {
                query: { startDate: '2026-01-01', endDate: '2026-01-31' },
                tenantId: 1
            } as any;
            const res = { json: jest.fn() } as any;

            await getPosts(req, res, jest.fn());

            expect(prisma.social_posts.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    scheduled_at: {
                        gte: expect.any(Date),
                        lte: expect.any(Date)
                    }
                })
            }));
        });
    });
});
