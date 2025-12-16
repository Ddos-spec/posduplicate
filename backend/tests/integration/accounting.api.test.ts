import request from 'supertest';
import app from '../../src/server';
import prisma from '../../src/utils/prisma';

// Mock Auth Middleware to bypass real JWT check
jest.mock('../../src/middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 1;
    req.tenantId = 1;
    req.userRole = 'Owner';
    next();
  },
  roleMiddleware: (_roles: string[]) => (_req: any, _res: any, next: any) => {
    next(); // Bypass role check
  }
}));

// Mock Tenant Middleware
jest.mock('../../src/middlewares/tenant.middleware', () => ({
  tenantMiddleware: (req: any, _res: any, next: any) => {
    req.tenantId = 1;
    next();
  }
}));

// Mock Audit Middleware
jest.mock('../../src/middlewares/audit.middleware', () => ({
  auditLogger: (_req: any, _res: any, next: any) => next()
}));

// Mock Prisma for Integration
jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: {
        chart_of_accounts: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        journal_entries: {
            findMany: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(), // Added findUnique
        },
        $queryRaw: jest.fn(),
    }
}));

describe('Accounting API Integration (Mocked DB)', () => {

    describe('GET /api/accounting/coa', () => {
        it('should return tree of accounts', async () => {
            // Mock DB response
            (prisma.chart_of_accounts.findMany as jest.Mock).mockResolvedValue([
                { id: 1, account_code: '1000', account_name: 'Assets', parent_id: null },
                { id: 2, account_code: '1100', account_name: 'Current Assets', parent_id: 1 }
            ]);
            (prisma.$queryRaw as jest.Mock).mockResolvedValue([]); // Mock balances

            const res = await request(app).get('/api/accounting/coa');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.accounts).toHaveLength(1); // Root node
            expect(res.body.data.accounts[0].children).toHaveLength(1); // Child node
        });
    });

    describe('POST /api/accounting/journal/create', () => {
        it('should create a journal entry', async () => {
            (prisma.journal_entries.findFirst as any).mockResolvedValue(null); // For journal number gen
            (prisma.journal_entries.create as jest.Mock).mockResolvedValue({
                id: 1,
                journal_number: 'JU-2025-0001',
                status: 'draft'
            });

            const res = await request(app)
                .post('/api/accounting/journal/create')
                .send({
                    journal_type: 'general',
                    transaction_date: '2025-01-01',
                    description: 'Test Journal',
                    lines: [
                        { account_id: 1, debit_amount: 100, credit_amount: 0 },
                        { account_id: 2, debit_amount: 0, credit_amount: 100 }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.journal_number).toBe('JU-2025-0001');
        });

        it('should fail if unbalanced', async () => {
            const res = await request(app)
                .post('/api/accounting/journal/create')
                .send({
                    lines: [
                        { account_id: 1, debit_amount: 100, credit_amount: 0 },
                        { account_id: 2, debit_amount: 0, credit_amount: 50 } // Unbalanced
                    ]
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error.code).toBe('NOT_BALANCED');
        });
    });

});