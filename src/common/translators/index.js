// Dynamically loads the correct translator based on the client.
const path = require('path');

function getTranslator(client) {
  const clientMap = {
    mysql2: 'mysql',
    pg: 'postgresql',
    sqlite3: 'sqlite',
  };
  const translatorName = clientMap[client] || client;

  try {
    const translatorPath = path.join(__dirname, `${translatorName}.js`);
    return require(translatorPath);
  } catch (error) {
    console.error(`Failed to load translator for client '${client}'.`);
    throw new Error(`Unsupported database client for translator: ${client}`);
  }
}

function translate(migrationObject, client) {
  const translator = getTranslator(client);

  const operation = Object.keys(migrationObject)[0]; // e.g., 'createTable'
  const schema = migrationObject[operation];

  // Dynamically find the matching function in the translator, e.g., 'createTable' -> translator.createTable
  if (typeof translator[operation] === 'function') {
    return translator[operation](schema);
  }

  throw new Error(`Unsupported migration operation '${operation}' for client '${client}'.`);
}

module.exports = { translate };
