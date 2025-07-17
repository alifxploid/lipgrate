const path = require('path');
const { getDbAdapter } = require('../../adapters');
const { translate } = require('../../common/translators');
const { loadConfig } = require('../../common/config');
const logger = require('../../common/logger');
const { describe } = require('../../common/operation_logger');
const chalk = require('chalk');
const fs = require('fs');

async function execute(args, options = {}) {
  const db = getDbAdapter();
  const client = await db.getClient();
  const runnerOptions = { ...options, client };

  try {
    await client.query('BEGIN');
    const config = loadConfig();
    const migrationsDir = path.resolve(process.cwd(), config.migrations.directory, config.client);

    if (!fs.existsSync(migrationsDir)) {
      logger.warning('Migrations directory does not exist. Nothing to roll back.');
      return;
    }

    if (runnerOptions.dryRun) {
      logger.info(chalk.yellow('Dry Run Mode: No changes will be made to the database.'));
    }

    await db.ensureMigrationsTable(runnerOptions);

    const completedMigrations = await db.getCompletedMigrations(runnerOptions);

    if (completedMigrations.length === 0) {
      logger.warning('There are no applied migrations to roll back.');
      return;
    }

    const lastMigrationFile = completedMigrations[completedMigrations.length - 1];
    const migration = require(path.join(migrationsDir, lastMigrationFile));

    logger.running(`Rolling back migration: ${lastMigrationFile}`);

    if (typeof migration.down === 'function') {
      const migrator = {
        raw: (sql, params = []) => db.query(sql, params, runnerOptions),
        createTable: (name, columns, schemaOptions = {}) => {
          const op = { createTable: { name, columns, options: schemaOptions } };
          logger.info(`  -> ${describe(op)}`);
          const sql = translate(op, config.client);
          return db.query(sql, [], runnerOptions);
        },
        dropTable: (name) => {
          const op = { dropTable: name };
          logger.info(`  -> ${describe(op)}`);
          const sql = translate(op, config.client);
          return db.query(sql, [], runnerOptions);
        }
      };
      await migration.down(migrator);
    } else {
      const operations = Array.isArray(migration.down) ? migration.down : [migration.down];
      for (const op of operations) {
        logger.info(`  -> ${describe(op)}`);
        const sql = translate(op, config.client);
        await db.query(sql, [], runnerOptions);
      }
    }

    await db.removeMigration(lastMigrationFile, runnerOptions);
    logger.success(`Finished rollback: ${lastMigrationFile}`);
    await client.query('COMMIT');

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    if (client) {
      client.release();
    }
    await db.disconnect();
  }
}

module.exports = { execute };
