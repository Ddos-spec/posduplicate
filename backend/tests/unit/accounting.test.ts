// Mock Prisma
const prismaMock: any = {
    journal_entries: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
    },
    journal_entry_lines: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
    general_ledger: {
        findFirst: jest.fn(),
        create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(prismaMock)),
};

jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: prismaMock,
}));

import { postJournalToLedger } from '../../src/services/ledger.service';
import { generateJournalNumber } from '../../src/utils/journal.utils';
import { Decimal } from '@prisma/client/runtime/library';

describe('Accounting Module - Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Journal Utils', () => {
        it('should generate first journal number correctly', async () => {
            prismaMock.journal_entries.findFirst.mockResolvedValue(null);
            
            // Mock Date to return fixed year
            jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
            
            const num = await generateJournalNumber(1, 'general');
            expect(num).toBe('JU-2025-0001');
            
            jest.useRealTimers();
        });

        it('should increment journal number', async () => {
            prismaMock.journal_entries.findFirst.mockResolvedValue({
                journal_number: 'JU-2025-0125'
            });
            
            jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

            const num = await generateJournalNumber(1, 'general');
            expect(num).toBe('JU-2025-0126');
            
            jest.useRealTimers();
        });
    });

    describe('Ledger Service', () => {
        it('should throw error if journal is not balanced', async () => {
            prismaMock.journal_entries.findUnique.mockResolvedValue({
                id: 1,
                tenant_id: 1,
                status: 'draft',
                journal_entry_lines: [
                    { debit_amount: new Decimal(100), credit_amount: new Decimal(0), chart_of_accounts: { normal_balance: 'DEBIT' } },
                    { debit_amount: new Decimal(0), credit_amount: new Decimal(50), chart_of_accounts: { normal_balance: 'CREDIT' } }
                ]
            });

            await expect(postJournalToLedger(1, 1, 1)).rejects.toThrow('Journal is not balanced');
        });

        it('should post balanced journal successfully', async () => {
            prismaMock.journal_entries.findUnique.mockResolvedValue({
                id: 1,
                tenant_id: 1,
                status: 'draft',
                journal_entry_lines: [
                    { account_id: 1, debit_amount: new Decimal(100), credit_amount: new Decimal(0), chart_of_accounts: { normal_balance: 'DEBIT' } },
                    { account_id: 2, debit_amount: new Decimal(0), credit_amount: new Decimal(100), chart_of_accounts: { normal_balance: 'CREDIT' } }
                ]
            });

            // Mock Ledger findFirst to return previous balance
            prismaMock.general_ledger.findFirst.mockResolvedValue({ balance: new Decimal(0) });

            const result = await postJournalToLedger(1, 1, 1);

            expect(result).toEqual({ success: true });
            expect(prismaMock.general_ledger.create).toHaveBeenCalledTimes(2);
            expect(prismaMock.journal_entries.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({ status: 'posted' })
            });
        });

        it('should prevent posting already posted journal', async () => {
             prismaMock.journal_entries.findUnique.mockResolvedValue({
                id: 1,
                tenant_id: 1,
                status: 'posted', // Already posted
                journal_entry_lines: []
            });

            await expect(postJournalToLedger(1, 1, 1)).rejects.toThrow('Only draft journals can be posted');
        });
    });

});