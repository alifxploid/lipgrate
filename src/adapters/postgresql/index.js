const { Client } = require('pg');
const logger = require('../../common/logger');
const chalk = require('chalk');

module.exports = (config) => {
  const pool = new (require('pg').Pool)(config.connection);

  return {
    async getClient() {
      return pool.connect();
    },

    async disconnect() {
      await pool.end();
      logger.info('Disconnected from PostgreSQL database.');
    },

    async query(sql, params = [], options = {}) {
      const conn = options.client || pool;
      const connType = options.client ? 'TRANSACTIONAL_CLIENT' : 'POOL_CONNECTION';
      if (options.dryRun) {
        // In dry-run mode, just log the SQL that would be executed.
        let formattedSql = sql;
        if (params.length > 0) {
          // Replace $1, $2, etc. with actual parameters for logging
          formattedSql = params.reduce((currentSql, param, index) => {
            return currentSql.replace(`$${index + 1}`, typeof param === 'string' ? `'${param}'` : param);
          }, sql);
        }
        console.log(`${chalk.yellow('[DRY RUN]')} ${chalk.gray('EXECUTE:')} ${formattedSql}`);
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
      const res = await this.query('SELECT migration FROM lipgrate_migrations ORDER BY migration ASC', [], options);
      return res.rows.map(r => r.migration);
    },

    async addMigration(migrationName, options = {}) {
      // Directly call the query method with the correct SQL, params, and options
      return this.query('INSERT INTO lipgrate_migrations (migration) VALUES ($1)', [migrationName], options);
    },

    async removeMigration(migrationName, options = {}) {
      // Directly call the query method with the correct SQL, params, and options
      return this.query('DELETE FROM lipgrate_migrations WHERE migration = $1', [migrationName], options);
    }
  };
};
