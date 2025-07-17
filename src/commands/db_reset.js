const { getDbAdapter } = require('../adapters');
const { loadConfig } = require('../common/config');
const logger = require('../common/logger');
const chalk = require('chalk');
const migrate = require('./migrate');

async function execute(args, options = {}) {
  logger.warning(chalk.bold.red('ATTENTION: This will delete ALL data in your database.'));

  const config = loadConfig();
  const db = getDbAdapter();

  try {
    logger.running('Dropping all tables...');
    const dropQuery = `
      DO $do$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables in the public schema
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;

        -- Drop all custom ENUM types in the public schema
        FOR r IN (SELECT t.typname FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' GROUP BY t.typname) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $do$;
    `;
    await db.query(dropQuery);
    logger.success('All tables dropped.');

    logger.running('Re-running all migrations...');
    await migrate.execute([], options);
    logger.success('Database reset and migrated successfully.');

  } catch (error) {
    logger.error(`Database reset failed: ${error.message}`);
    throw error;
  }
}

module.exports = { execute };
