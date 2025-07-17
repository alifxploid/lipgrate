const path = require('path');
const { loadConfig } = require('../common/config');
const logger = require('../common/logger');

async function execute(args, options = {}) {
  const config = loadConfig();
  const runnerName = `migrate_${config.client}.js`;
  const runnerPath = path.join(__dirname, 'runners', runnerName);

  try {
    const runner = require(runnerPath);
    await runner.execute(args, options);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      logger.error(`Migration runner for database client '${config.client}' not found.`);
      logger.error(`Please ensure a runner file named '${runnerName}' exists in 'src/commands/runners'.`);
    } else {
      // Re-throw other errors to be handled by the main CLI handler
      throw error;
    }
  }
}

module.exports = {
  execute,
  description: 'Runs all pending migrations for the configured database client.',
};

module.exports = { execute };
