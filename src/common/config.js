const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = path.resolve(process.cwd(), 'migrator.config.js');

  if (!fs.existsSync(configPath)) {
    throw new Error('Configuration file not found! Please create migrator.config.js in your project root.');
  }

  const config = require(configPath);

  // Directly return the loaded configuration object without environment nesting.
  return config;
}

module.exports = { loadConfig };
