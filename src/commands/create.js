const { loadConfig } = require('../common/config');
const path = require('path');

async function execute(args, options) {
  const config = loadConfig();
  // Client can be specified via command-line flag or from config
  const client = options.client || config.client;

  if (!client) {
    throw new Error('Database client not specified. Please set it in your config or use the --client option.');
  }

  const runnerPath = path.join(__dirname, 'runners', `create_${client}.js`);
  try {
    const runner = require(runnerPath);
    await runner.execute(args, { ...options, client });
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(`Unsupported client for 'create' command: ${client}. No runner found.`);
    }
    // Re-throw other errors
    throw error;
  }
}

module.exports = { execute };
