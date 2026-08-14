const queryRaw = jest.fn();
const executeRaw = jest.fn();
const tx = { $queryRaw: queryRaw, $executeRaw: executeRaw };
const transaction = jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx));

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: transaction,
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

import { registerMarketingEvent } from '../../src/modules/medsos/services/marketingEvent.p3.service';
import { submitMarketingSurvey } from '../../src/modules/medsos/services/marketingSurvey.p3.service';

const future = new Date(Date.now() + 60 * 60 * 1000);

beforeEach(() => {
  queryRaw.mockReset();
  executeRaw.mockReset();
  transaction.mockClear();
});

describe('P3.5 marketing engagement behavioral invariants', () => {
  test('event retry with the same submission hash returns existing registration before capacity/write', async () => {
    const existing = { id: 41, event_id: 7, attendee_name: 'Retry', seats: 2, status: 'registered' };
    queryRaw
      .mockResolvedValueOnce([{ id: 7, status: 'published', registration_open: true, starts_at: future, capacity: 2 }])
      .mockResolvedValueOnce([existing]);

    await expect(registerMarketingEvent(1, null, 7, { attendeeName: 'Retry', seats: 2 }, 'a'.repeat(64))).resolves.toBe(existing);
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  test('event registration over capacity fails before registration insert or audit event', async () => {
    queryRaw
      .mockResolvedValueOnce([{ id: 7, status: 'published', registration_open: true, starts_at: future, capacity: 10 }])
      .mockResolvedValueOnce([{ occupied: 9n }]);

    await expect(registerMarketingEvent(1, 9, 7, { attendeeName: 'Too many', seats: 2 })).rejects.toMatchObject({
      code: 'MARKETING_EVENT_CAPACITY_EXCEEDED', status: 409,
    });
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  test('survey retry with the same submission hash returns existing response without new answers or audit event', async () => {
    const existing = { id: 71, survey_id: 5, status: 'submitted' };
    queryRaw
      .mockResolvedValueOnce([{ id: 5, status: 'published' }])
      .mockResolvedValueOnce([existing]);

    await expect(submitMarketingSurvey(1, null, 5, { answers: [] }, 'b'.repeat(64))).resolves.toBe(existing);
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  test('survey rejects an answer for a question outside the survey before response insert', async () => {
    queryRaw
      .mockResolvedValueOnce([{ id: 5, status: 'published' }])
      .mockResolvedValueOnce([{ id: 10, question_type: 'short_text', required: false, options: [] }]);

    await expect(submitMarketingSurvey(1, 9, 5, { answers: [{ questionId: 11, answer: 'wrong survey' }] })).rejects.toMatchObject({
      code: 'SURVEY_QUESTION_SCOPE_MISMATCH', status: 409,
    });
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  test('survey validates rating before inserting the response row', async () => {
    queryRaw
      .mockResolvedValueOnce([{ id: 5, status: 'published' }])
      .mockResolvedValueOnce([{ id: 10, question_type: 'rating', required: true, options: [] }]);

    await expect(submitMarketingSurvey(1, 9, 5, { answers: [{ questionId: 10, answer: 6 }] })).rejects.toMatchObject({
      code: 'INVALID_SURVEY_ANSWER', status: 400,
    });
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
