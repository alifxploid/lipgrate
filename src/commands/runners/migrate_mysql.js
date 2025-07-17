const fs = require('fs');
const path = require('path');
const { getDbAdapter } = require('../../adapters');
const { translate } = require('../../common/translators');
const { loadConfig } = require('../../common/config');
const logger = require('../../common/logger');
const chalk = require('chalk');
const { describe } = require('../../common/operation_logger');

async function execute(args, options = {}) {
  const db = getDbAdapter();
  const client = await db.getClient();
  const runnerOptions = { ...options, client };

  try {
    await client.query('BEGIN');
    const config = loadConfig();
    const migrationsDir = path.resolve(process.cwd(), config.migrations.directory, config.client);

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      logger.info(`Created database-specific migration directory: ${migrationsDir}`);
      logger.success('Database is up to date.');
      return;
    }

    const allMigrations = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    for (const migrationFile of allMigrations) {
      if (!migrationFile.startsWith('lipgrade_')) {
        throw new Error(`Invalid migration file name: '${migrationFile}'. Please use 'node src/cli.js create' to generate migrations.`);
      }
    }

    if (runnerOptions.dryRun) {
      logger.info(chalk.yellow('Dry Run Mode: No changes will be made to the database.'));
    }

    await db.ensureMigrationsTable(runnerOptions);

    const completedMigrations = runnerOptions.dryRun ? [] : await db.getCompletedMigrations(runnerOptions);

    const pendingMigrations = allMigrations.filter(m => !completedMigrations.includes(m));

    if (pendingMigrations.length === 0) {
      logger.success('Database is up to date.');
      return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migrations.`);

    for (const migrationFile of pendingMigrations) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migration = require(migrationPath);

      logger.running(`Running migration: ${migrationFile}`);

      // This block handles both declarative and programmatic migrations.
      const operations = Array.isArray(migration.up) ? migration.up : [migration.up];
      for (const op of operations) {
        logger.info(`  -> ${describe(op)}`);
        const sql = translate(op, config.client);
        await db.query(sql, [], runnerOptions);
      }

      // Log the migration only after all its operations have succeeded.
      await db.addMigration(migrationFile, runnerOptions);
      logger.success(`Finished migration: ${migrationFile}`);
    }

    logger.success('All migrations completed successfully.');
    await client.query('COMMIT');

  } catch (e) {
    await client.query('ROLLBACK');
    throw e; // Re-throw the original error to be caught by the CLI
  } finally {
    if (client) {
      client.release();
    }
    await db.disconnect();
  }
}

module.exports = { execute };
