const memorySessions = new Map();
let pool = null;
let initialized = false;

export async function initStorage() {
  if (initialized) {
    return;
  }

  initialized = true;

  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Using in-memory storage.");
    return;
  }

  const { Pool } = await import("pg");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false }
  });

  await query(`
    CREATE TABLE IF NOT EXISTS order_sessions (
      chat_id TEXT PRIMARY KEY,
      is_open BOOLEAN NOT NULL DEFAULT FALSE,
      is_closed BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      chat_id TEXT NOT NULL,
      user_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      item TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (chat_id, user_key)
    )
  `);
}

export async function getSession(chatId) {
  if (!pool) {
    return getMemorySession(chatId);
  }

  const result = await query(
    `INSERT INTO order_sessions (chat_id)
     VALUES ($1)
     ON CONFLICT (chat_id) DO UPDATE SET chat_id = EXCLUDED.chat_id
     RETURNING is_open, is_closed`,
    [chatId]
  );

  return {
    isOpen: result.rows[0].is_open,
    isClosed: result.rows[0].is_closed
  };
}

export async function openSession(chatId) {
  if (!pool) {
    const session = getMemorySession(chatId);
    session.isOpen = true;
    session.isClosed = false;
    session.orders.clear();
    return;
  }

  await query("BEGIN");
  try {
    await query(
      `INSERT INTO order_sessions (chat_id, is_open, is_closed, updated_at)
       VALUES ($1, TRUE, FALSE, NOW())
       ON CONFLICT (chat_id)
       DO UPDATE SET is_open = TRUE, is_closed = FALSE, updated_at = NOW()`,
      [chatId]
    );
    await query("DELETE FROM orders WHERE chat_id = $1", [chatId]);
    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
}

export async function clearSession(chatId) {
  if (!pool) {
    const session = getMemorySession(chatId);
    session.isOpen = false;
    session.isClosed = false;
    session.orders.clear();
    return;
  }

  await query("BEGIN");
  try {
    await query(
      `INSERT INTO order_sessions (chat_id, is_open, is_closed, updated_at)
       VALUES ($1, FALSE, FALSE, NOW())
       ON CONFLICT (chat_id)
       DO UPDATE SET is_open = FALSE, is_closed = FALSE, updated_at = NOW()`,
      [chatId]
    );
    await query("DELETE FROM orders WHERE chat_id = $1", [chatId]);
    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
}

export async function closeSession(chatId) {
  if (!pool) {
    const session = getMemorySession(chatId);
    session.isOpen = false;
    session.isClosed = true;
    return;
  }

  await query(
    `INSERT INTO order_sessions (chat_id, is_open, is_closed, updated_at)
     VALUES ($1, FALSE, TRUE, NOW())
     ON CONFLICT (chat_id)
     DO UPDATE SET is_open = FALSE, is_closed = TRUE, updated_at = NOW()`,
    [chatId]
  );
}

export async function setOrder({ chatId, userKey, userId, name, item }) {
  if (!pool) {
    const session = getMemorySession(chatId);
    session.orders.set(userKey, { userId, name, item });
    return;
  }

  await query(
    `INSERT INTO orders (chat_id, user_key, user_id, name, item, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (chat_id, user_key)
     DO UPDATE SET user_id = EXCLUDED.user_id,
                   name = EXCLUDED.name,
                   item = EXCLUDED.item,
                   updated_at = NOW()`,
    [chatId, userKey, userId, name, item]
  );
}

export async function deleteOrder({ chatId, userKey }) {
  if (!pool) {
    const session = getMemorySession(chatId);
    session.orders.delete(userKey);
    return;
  }

  await query("DELETE FROM orders WHERE chat_id = $1 AND user_key = $2", [
    chatId,
    userKey
  ]);
}

export async function listOrders(chatId) {
  if (!pool) {
    return [...getMemorySession(chatId).orders.values()];
  }

  const result = await query(
    `SELECT user_id AS "userId", name, item
     FROM orders
     WHERE chat_id = $1
     ORDER BY item, name`,
    [chatId]
  );

  return result.rows;
}

export function resetMemoryStorageForTests() {
  memorySessions.clear();
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

function getMemorySession(chatId) {
  if (!memorySessions.has(chatId)) {
    memorySessions.set(chatId, {
      isOpen: false,
      isClosed: false,
      orders: new Map()
    });
  }

  return memorySessions.get(chatId);
}
