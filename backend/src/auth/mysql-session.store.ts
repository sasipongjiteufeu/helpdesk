import { Store, SessionData } from 'express-session';
import { createPool, Pool, RowDataPacket } from 'mysql2/promise';

/** Shared, expiring sessions; independent of TypeORM schema synchronization. */
export class MysqlSessionStore extends Store {
  private readonly pool: Pool;
  private cleanup?: NodeJS.Timeout;

  constructor() {
    super();
    this.pool = createPool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT || 3306),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: 3,
    });
  }

  async initialize() {
    await this.pool.execute(`CREATE TABLE IF NOT EXISTS helpdesk_sessions (
      sid VARCHAR(128) NOT NULL PRIMARY KEY,
      data MEDIUMTEXT NOT NULL,
      expires BIGINT NOT NULL,
      INDEX idx_session_expiry (expires)
    )`);
    this.cleanup = setInterval(() => {
      void this.pool.execute('DELETE FROM helpdesk_sessions WHERE expires <= ?', [Date.now()])
        .catch(() => this.emit('disconnect'));
    }, 15 * 60 * 1000);
    this.cleanup.unref();
  }

  get(sid: string, callback: (err: any, session?: SessionData | null) => void) {
    this.pool.execute<RowDataPacket[]>(
      'SELECT data FROM helpdesk_sessions WHERE sid = ? AND expires > ?', [sid, Date.now()],
    ).then(([rows]) => {
      let session: SessionData | null = null;
      try { session = rows.length ? JSON.parse(rows[0].data) : null; }
      catch (error) { callback(error); return; }
      callback(null, session);
    }, callback);
  }

  set(sid: string, session: SessionData, callback: (err?: any) => void = () => {}) {
    const expires = session.cookie.expires
      ? new Date(session.cookie.expires).getTime() : Date.now() + 8 * 60 * 60 * 1000;
    this.pool.execute(
      'INSERT INTO helpdesk_sessions (sid, data, expires) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)',
      [sid, JSON.stringify(session), expires],
    ).then(() => callback(), callback);
  }

  destroy(sid: string, callback: (err?: any) => void = () => {}) {
    this.pool.execute('DELETE FROM helpdesk_sessions WHERE sid = ?', [sid])
      .then(() => callback(), callback);
  }

  async close() {
    if (this.cleanup) clearInterval(this.cleanup);
    await this.pool.end();
  }
}
