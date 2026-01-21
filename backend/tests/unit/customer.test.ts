import { createCustomer, getCustomers } from '../../src/modules/fnb/controllers/customer.controller';
import prisma from '../../src/utils/prisma';

// Mock Prisma
jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: {
        customers: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        },
        outlets: {
            findMany: jest.fn(),
            findUnique: jest.fn()
        }
    }
}));

describe('Customer Controller Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCustomer', () => {
        it('should create customer successfully', async () => {
            const req = {
                body: { name: 'Budi', phone: '08123', outlet_id: 1 },
                tenantId: 1
            } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

            // Mock Outlet Check
            (prisma.outlets.findUnique as jest.Mock).mockResolvedValue({ id: 1, tenant_id: 1 });
            
            // Mock Create
            (prisma.customers.create as jest.Mock).mockResolvedValue({
                id: 10,
                name: 'Budi',
                phone: '08123',
                outlet_id: 1
            });

            await createCustomer(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(201);
            expect(prisma.customers.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    name: 'Budi',
                    phone: '08123'
                })
            }));
        });

        it('should deny if outlet does not belong to tenant', async () => {
            const req = { body: { name: 'Budi', phone: '08123', outlet_id: 99 }, tenantId: 1 } as any;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

            // Outlet 99 belongs to tenant 2
            (prisma.outlets.findUnique as jest.Mock).mockResolvedValue({ id: 99, tenant_id: 2 });

            await createCustomer(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
