const fs = require('fs');
const path = require('path');
const { getDbAdapter } = require('../../adapters');
const { loadConfig } = require('../../common/config');
const logger = require('../../common/logger');
const chalk = require('chalk');

async function execute(args, options = {}) {
  const db = getDbAdapter();
  const client = await db.getClient();
  const runnerOptions = { ...options, client };

  try {
    const config = loadConfig();
    const migrationsDir = path.resolve(process.cwd(), config.migrations.directory, config.client);

    await db.ensureMigrationsTable(runnerOptions);

    const allMigrations = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter(file => file.endsWith('.js')).sort()
      : [];

    const completedMigrations = await db.getCompletedMigrations(runnerOptions);

    logger.info('Migration Status:');

    if (allMigrations.length === 0) {
      logger.warning('No migrations found in the migrations directory.');
      return;
    }

    allMigrations.forEach(migrationFile => {
      if (completedMigrations.includes(migrationFile)) {
        console.log(`  ${chalk.green('✔ [Applied]')}  ${migrationFile}`);
      } else {
        console.log(`  ${chalk.yellow('● [Pending]')}  ${migrationFile}`);
      }
    });

    const pendingCount = allMigrations.length - completedMigrations.length;
    if (pendingCount === 0) {
        logger.success('\nDatabase is up to date.');
    } else {
        logger.info(`\nFound ${pendingCount} pending migration(s).`);
    }
  } finally {
    // For SQLite, client might not have a release method, so check for it.
    if (client && typeof client.release === 'function') {
      client.release();
    }
    await db.disconnect();
  }
}

module.exports = { execute };
