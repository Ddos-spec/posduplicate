import { createProduct, updateProduct } from '../../src/modules/fnb/controllers/product.controller';
import prisma from '../../src/utils/prisma';

// Mock Prisma
jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: {
        items: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        outlets: {
            findUnique: jest.fn(),
            findMany: jest.fn()
        }
    }
}));

describe('Product Controller Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createProduct', () => {
        it('should create product successfully', async () => {
            const req = {
                body: { name: 'Kopi Hitam', price: 15000, outletId: 1, categoryId: 5 },
                tenantId: 1
            } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

            // Mock Outlet Check
            (prisma.outlets.findUnique as jest.Mock).mockResolvedValue({ id: 1, tenant_id: 1 });

            // Mock Create
            (prisma.items.create as jest.Mock).mockResolvedValue({
                id: 100,
                name: 'Kopi Hitam',
                outlet_id: 1
            });

            await createProduct(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(201);
            expect(prisma.items.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    name: 'Kopi Hitam',
                    category_id: 5
                })
            }));
        });
    });

    describe('updateProduct', () => {
        it('should update product price', async () => {
            const req = {
                params: { id: '100' },
                body: { price: 18000 },
                tenantId: 1
            } as any;
            const res = { json: jest.fn() } as any;

            // Mock Product Exist Check
            (prisma.items.findUnique as jest.Mock).mockResolvedValue({ id: 100, outlet_id: 1 });
            // Mock Outlet Check
            (prisma.outlets.findUnique as jest.Mock).mockResolvedValue({ id: 1, tenant_id: 1 });

            await updateProduct(req, res, jest.fn());

            expect(prisma.items.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 100 },
                data: expect.objectContaining({ price: 18000 })
            }));
        });
    });
});
