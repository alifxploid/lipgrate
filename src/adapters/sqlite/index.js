const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const logger = require('../../common/logger');
const chalk = require('chalk');

module.exports = (config) => {
  let db; // A single, persistent database connection object.

  const connect = async () => {
    if (db) return db;
    db = await open({
      filename: config.connection.filename,
      driver: sqlite3.Database
    });
    logger.info(`Connected to SQLite database: ${config.connection.filename}`);
    return db;
  };

  return {
    async getClient() {
      // For SQLite, the 'client' is the single, persistent database connection.
      return connect();
    },

    async disconnect() {
      if (db) {
        await db.close();
        db = null;
        logger.info('Disconnected from SQLite database.');
      }
    },

    async query(sql, params = [], options = {}) {
      // With SQLite, the transactional client and the main connection are the same.
      const conn = options.client || await connect();
      const connType = options.client ? 'TRANSACTIONAL_CLIENT' : 'MAIN_CONNECTION';

      if (options.dryRun) {
        let formattedSql = sql;
        // Basic parameter replacement for logging.
        params.forEach(p => { formattedSql = formattedSql.replace('?', typeof p === 'string' ? `'${p}'` : p); });
        console.log(`${chalk.yellow('[DRY RUN]')} ${chalk.gray('EXECUTE:')} ${formattedSql}`);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return [];
        }
        return;
      }

      console.log(`${chalk.blue(`[SQL EXECUTE - ${connType}]`)} ${sql.trim().replace(/\n/g, ' ')}`, chalk.cyan(JSON.stringify(params)));
      
      const stmt = sql.trim().toUpperCase();
      if (stmt.startsWith('SELECT')) {
        return conn.all(sql, params);
      } else if (stmt.startsWith('INSERT') || stmt.startsWith('UPDATE') || stmt.startsWith('DELETE') || stmt.startsWith('BEGIN') || stmt.startsWith('COMMIT') || stmt.startsWith('ROLLBACK')) {
        return conn.run(sql, params);
      } else {
        return conn.exec(sql);
      }
    },

    async ensureMigrationsTable(options = {}) {
      const sql = `CREATE TABLE IF NOT EXISTS lipgrate_migrations (migration TEXT PRIMARY KEY)`;
      return this.query(sql, [], options);
    },

    async getCompletedMigrations(options = {}) {
      const rows = await this.query('SELECT migration FROM lipgrate_migrations ORDER BY migration ASC', [], options);
      return rows.map(r => r.migration);
    },

    async addMigration(migrationName, options = {}) {
      return this.query('INSERT INTO lipgrate_migrations (migration) VALUES (?)', [migrationName], options);
    },

    async removeMigration(migrationName, options = {}) {
      return this.query('DELETE FROM lipgrate_migrations WHERE migration = ?', [migrationName], options);
    }
  };
};
