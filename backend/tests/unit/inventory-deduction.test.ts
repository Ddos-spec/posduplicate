import { createTransaction } from '../../src/modules/fnb/controllers/transaction.controller';
import prisma from '../../src/utils/prisma';

// Mock Prisma Client
jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn((callback) => callback(prisma)), // Auto-execute callback
        outlets: { findFirst: jest.fn() },
        items: { findUnique: jest.fn(), update: jest.fn() },
        variants: { findUnique: jest.fn() },
        modifiers: { findUnique: jest.fn() },
        transactions: { create: jest.fn() },
        recipes: { findMany: jest.fn() },
        ingredients: { update: jest.fn() }
    }
}));

// Mock AutoJournal Service
jest.mock('../../src/services/autoJournal.service', () => ({
    generateJournalFromPOSTransaction: jest.fn().mockResolvedValue(true)
}));

describe('Inventory Deduction Logic (Unit Test)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should deduct ingredient stock based on recipe when creating transaction', async () => {
        // --- SETUP DATA MOCK ---

        // 1. Mock Outlet Check
        (prisma.outlets.findFirst as jest.Mock).mockResolvedValue({ id: 1, tenant_id: 1 });

        // 2. Mock Item Data (Es Teh Manis)
        (prisma.items.findUnique as jest.Mock).mockResolvedValue({
            id: 101,
            name: 'Es Teh Manis',
            price: 5000,
            track_stock: false 
        });

        // 3. Mock Recipe (1 Es Teh = 50gr Gula)
        (prisma.recipes.findMany as jest.Mock).mockResolvedValue([
            { id: 1, item_id: 101, ingredient_id: 500, quantity: 50 }
        ]);

        // 4. Mock Ingredient Update (Spy only)
        (prisma.ingredients.update as jest.Mock).mockResolvedValue({ id: 500, stock: 900 });

        // 5. Mock Transaction Create
        (prisma.transactions.create as jest.Mock).mockResolvedValue({
            id: 999,
            transaction_number: 'TRX-TEST',
            total: 10000,
            outlet_id: 1,
            created_at: new Date()
        });

        // --- EXECUTE ---
        const req = {
            body: {
                orderType: 'dine_in',
                outletId: 1,
                items: [
                    { itemId: 101, quantity: 2 } // Beli 2 Es Teh
                ],
                payments: [
                    { method: 'cash', amount: 10000 }
                ]
            },
            userId: 1,
            tenantId: 1
        } as any;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as any;
        
        const next = jest.fn();

        await createTransaction(req, res, next);

        // --- ASSERTIONS ---

        // 1. Pastikan Response Sukses
        expect(res.status).toHaveBeenCalledWith(201);
        
        // 2. CEK APAKAH RESEP DIAMBIL?
        expect(prisma.recipes.findMany).toHaveBeenCalledWith({
            where: { item_id: 101 }
        });

        // 3. CEK APAKAH STOK BAHAN BAKU DIKURANGI?
        // Skenario: Beli 2 Item. Resep butuh 50. Total kurang = 100.
        // Fungsi update harus dipanggil dengan decrement: 100
        expect(prisma.ingredients.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 500 },
                data: {
                    stock: {
                        decrement: 100 // 50 * 2
                    }
                }
            })
        );
    });
});
