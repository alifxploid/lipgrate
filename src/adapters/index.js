const path = require('path');
const { loadConfig } = require('../common/config');

const adapters = {};

function getDbAdapter() {
  const config = loadConfig();
  const { client } = config;

  // Map standard client names to internal adapter directory names
  const clientMap = {
    mysql2: 'mysql',
    pg: 'postgresql',
    sqlite3: 'sqlite',
  };

  const adapterName = clientMap[client] || client;

  if (adapters[adapterName]) {
    return adapters[adapterName](config);
  }

  try {
    const adapterPath = path.join(__dirname, adapterName, 'index.js');
    const adapterModule = require(adapterPath);
    adapters[adapterName] = adapterModule;
    return adapterModule(config);
  } catch (error) {
    console.error(`Failed to load adapter for client '${client}'. Path: ${path.join(__dirname, adapterName, 'index.js')}`);
    console.error('Underlying error:', error);
    throw new Error(`Database client '${client}' is not supported or the adapter is missing.`);
  }
}

module.exports = { getDbAdapter };
