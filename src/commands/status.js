const path = require('path');
const { loadConfig } = require('../common/config');
const logger = require('../common/logger');

async function execute(args, options = {}) {
  const config = loadConfig();
  const client = config.client;

  if (!client) {
    throw new Error('Database client not specified in config. Aborting.');
  }

  try {
    const runner = require(path.join(__dirname, 'runners', `status_${client}.js`));
    await runner.execute(args, options);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      logger.error(`Unsupported database client: ${client}`);
      throw new Error(`No runner found for '${client}'.`);
    }
    throw e;
  }
}

module.exports = { execute };

module.exports = { execute };
