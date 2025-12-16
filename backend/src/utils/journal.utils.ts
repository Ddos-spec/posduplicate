import prisma from '../utils/prisma';

/**
 * Generate Journal Number
 * Format: JU-YYYY-XXXX (e.g., JU-2025-0001)
 */
export const generateJournalNumber = async (tenantId: number, type: string = 'general'): Promise<string> => {
  const year = new Date().getFullYear();
  
  // Determine prefix based on type
  let prefix = 'JU';
  if (type === 'sales') prefix = 'JS';
  if (type === 'purchase') prefix = 'JP';
  if (type === 'expense') prefix = 'JE';
  if (type === 'adjustment') prefix = 'JA';
  // Default to JU for general

  const prefixPattern = `${prefix}-${year}-`;

  // Get last number for this year and type
  const lastJournal = await prisma.journal_entries.findFirst({
    where: {
      tenant_id: tenantId,
      journal_number: {
        startsWith: prefixPattern
      }
    },
    orderBy: {
      journal_number: 'desc'
    },
    select: {
      journal_number: true
    }
  });

  let nextNumber = 1;
  if (lastJournal && lastJournal.journal_number) {
    const parts = lastJournal.journal_number.split('-');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }
  }

  return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
};
