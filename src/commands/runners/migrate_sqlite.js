const fs = require('fs');
const path = require('path');
const { getDbAdapter } = require('../../adapters');
const { translate } = require('../../common/translators');
const { loadConfig } = require('../../common/config');
const logger = require('../../common/logger');
const chalk = require('chalk');
const { describe } = require('../../common/operation_logger');

async function execute(args, options = {}) {
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

  const db = getDbAdapter();

  if (options.dryRun) {
    logger.info(chalk.yellow('Dry Run Mode: No changes will be made to the database.'));
  }

  await db.ensureMigrationsTable(options);

  const completedMigrations = options.dryRun ? [] : await db.getCompletedMigrations(options);

  const pendingMigrations = allMigrations.filter(m => !completedMigrations.includes(m));

  if (pendingMigrations.length === 0) {
    logger.success('Database is up to date.');
    return;
  }

  logger.info(`Found ${pendingMigrations.length} pending migrations.`);

  for (const migrationFile of pendingMigrations) {
    const migration = require(path.join(migrationsDir, migrationFile));
    logger.running(`Running migration: ${migrationFile}`);

    if (typeof migration.up === 'function') {
      const migrator = {
        raw: (sql, params = []) => {
          console.log(`  ${chalk.gray('->')} Executing raw SQL`);
          return db.query(sql, params, options);
        },
        createTable: (name, columns, schemaOptions = {}) => {
          const op = { createTable: { name, columns, options: schemaOptions } };
          console.log(`  ${chalk.gray('->')} ${describe(op)}`);
          const sql = translate(op, config.client);
          return db.query(sql, [], options);
        },
        dropTable: (name) => {
          const op = { dropTable: name };
          console.log(`  ${chalk.gray('->')} ${describe(op)}`);
          const sql = translate(op, config.client);
          return db.query(sql, [], options);
        }
      };
      await migration.up(migrator);
    } else {
      const operations = Array.isArray(migration.up) ? migration.up : [migration.up];
      for (const op of operations) {
        console.log(`  ${chalk.gray('->')} ${describe(op)}`);
        const sql = translate(op, config.client);
        await db.query(sql, [], options);
      }
    }

    await db.addMigration(migrationFile, options);
    logger.success(`Finished migration: ${migrationFile}`);
  }

  logger.success('All migrations completed successfully.');
}

module.exports = { execute };
