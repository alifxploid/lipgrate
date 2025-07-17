const path = require('path');
const { getDbAdapter } = require('../../adapters');
const { translate } = require('../../common/translators');
const { loadConfig } = require('../../common/config');
const logger = require('../../common/logger');
const { describe } = require('../../common/operation_logger');
const chalk = require('chalk');
const fs = require('fs');

async function execute(args, options = {}) {
  const config = loadConfig();
  const migrationsDir = path.resolve(process.cwd(), config.migrations.directory, config.client);

  if (!fs.existsSync(migrationsDir)) {
    logger.warning('Migrations directory does not exist. Nothing to roll back.');
    return;
  }

  const allMigrations = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'));

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

  const completedMigrations = options.dryRun
    ? fs.readdirSync(migrationsDir).filter(file => file.endsWith('.js')).sort()
    : await db.getCompletedMigrations(options);

  if (completedMigrations.length === 0) {
    logger.warning('There are no applied migrations to roll back.');
    return;
  }

  const lastMigrationFile = completedMigrations[completedMigrations.length - 1];
  const migration = require(path.join(migrationsDir, lastMigrationFile));

  logger.running(`Rolling back migration: ${lastMigrationFile}`);

  if (typeof migration.down === 'function') {
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
    await migration.down(migrator);
  } else {
    const operations = Array.isArray(migration.down) ? migration.down : [migration.down];
    for (const op of operations) {
      console.log(`  ${chalk.gray('->')} ${describe(op)}`);
      const sql = translate(op, config.client);
      await db.query(sql, [], options);
    }
  }

  await db.removeMigration(lastMigrationFile, options);
  logger.success(`Finished rollback: ${lastMigrationFile}`);
}

module.exports = { execute };
