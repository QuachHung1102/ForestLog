import { getDatabase } from './database';

let writeQueue = Promise.resolve();

function enqueueWrite(write: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.catch(() => undefined).then(write);
  return writeQueue;
}

export async function getAppState(key: string): Promise<string | undefined> {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT value FROM app_state WHERE key = ? LIMIT 1',
    [key],
  );
  const value = result.rows[0]?.value;
  return value === null || value === undefined ? undefined : String(value);
}

export async function setAppState(key: string, value: string): Promise<void> {
  return enqueueWrite(async () => {
    const database = await getDatabase();
    await database.execute(
      `INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()],
    );
  });
}

export async function removeAppState(key: string): Promise<void> {
  return enqueueWrite(async () => {
    const database = await getDatabase();
    await database.execute('DELETE FROM app_state WHERE key = ?', [key]);
  });
}
