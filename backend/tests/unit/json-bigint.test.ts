import express from 'express';
import request from 'supertest';
import { jsonBigIntReplacer } from '../../src/utils/json';

describe('JSON BigInt boundary', () => {
  test('database bigint identifiers are serialized as exact decimal strings', async () => {
    const app = express();
    app.set('json replacer', jsonBigIntReplacer);
    app.get('/value', (_req, res) => res.json({ id: 9_007_199_254_740_993n }));

    const response = await request(app).get('/value');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '9007199254740993' });
  });
});
