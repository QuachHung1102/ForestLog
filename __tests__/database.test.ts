const mockExecute = jest.fn();

jest.mock('@op-engineering/op-sqlite', () => ({
  open: () => ({
    execute: (sql: string) => mockExecute(sql),
    transaction: jest.fn(),
  }),
}));

import { getDatabase } from '../src/data/database';

test('retries database initialization after a transient failure', async () => {
  mockExecute
    .mockRejectedValueOnce(new Error('temporary failure'))
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ user_version: 5 }] });

  await expect(getDatabase()).rejects.toThrow('temporary failure');
  await expect(getDatabase()).resolves.toMatchObject({
    execute: expect.any(Function),
  });
  expect(mockExecute).toHaveBeenCalledTimes(3);
});
