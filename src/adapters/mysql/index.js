const mysql = require('mysql2/promise');
const logger = require('../../common/logger');
const chalk = require('chalk');

module.exports = (config) => {
  const pool = mysql.createPool(config.connection);

  return {
    async getClient() {
      return pool.getConnection();
    },

    async disconnect() {
      await pool.end();
      logger.info('Disconnected from MySQL database.');
    },

    async query(sql, params = [], options = {}) {
      const conn = options.client || pool;
      const connType = options.client ? 'TRANSACTIONAL_CLIENT' : 'POOL_CONNECTION';

      if (options.dryRun) {
        let formattedSql = sql;
        if (params.length > 0) {
          formattedSql = mysql.format(sql, params);
        }
        console.log(`${chalk.yellow('[DRY RUN]')} ${chalk.gray('EXECUTE:')} ${formattedSql}`);
        // For SELECT, return a structure that mimics the real response
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return [[], []];
        }
        return;
      }

      console.log(`${chalk.blue(`[SQL EXECUTE - ${connType}]`)} ${sql.trim().replace(/\n/g, ' ')}`, chalk.cyan(JSON.stringify(params)));
      return conn.query(sql, params);
    },

    async ensureMigrationsTable(options = {}) {
      const sql = `
        CREATE TABLE IF NOT EXISTS lipgrate_migrations (
          migration VARCHAR(255) PRIMARY KEY
        )
      `;
      return this.query(sql, [], options);
    },

    async getCompletedMigrations(options = {}) {
      const [rows] = await this.query('SELECT migration FROM lipgrate_migrations ORDER BY migration ASC', [], options);
      // Ensure `rows` is an array before mapping. If the table is empty, `rows` can be undefined or not an array.
      if (!Array.isArray(rows)) {
        return [];
      }
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
