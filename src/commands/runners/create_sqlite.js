const { loadConfig } = require('../../common/config');
const logger = require('../../common/logger');
const path = require('path');
const fs = require('fs');

function execute(args, options) {
  const [migrationName] = args;
  if (!migrationName) {
    throw new Error('Migration name is required. Usage: node src/cli.js create <migration_name>');
  }

  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');

  const fileName = `lipgrade_${timestamp}_${migrationName}.js`;
  const config = loadConfig();
  const migrationsDir = path.resolve(process.cwd(), config.migrations.directory, 'sqlite');

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const filePath = path.join(migrationsDir, fileName);
  const template = `// Migration file for SQLite: ${fileName}
/*
  Lipgrate provides a declarative way to define your schema changes.
  This template is specific to SQLite.

  === Column Definitions ===
  A column definition is a string with 'type:modifier1:modifier2'.
  Examples: 'string', 'text:notNullable', 'integer:unique'

  === Supported Data Types (SQLite) ===
  Affinity: TEXT, NUMERIC, INTEGER, REAL, BLOB
  Shorthands: increments, string, text, integer, boolean, blob, datetime
*/

exports.up = {
  createTable: {
    name: 'your_table_name', // <-- TODO: Change this table name
    columns: {
      id: 'increments', // INTEGER PRIMARY KEY AUTOINCREMENT
      // name: 'string:notNullable', // TEXT
      // value: 'real:default(0.0)', // REAL
      // data: 'blob', // BLOB
      // is_active: 'boolean:default(true)' // INTEGER 0 or 1
    },
    options: {
      timestamps: true // Automatically adds created_at and updated_at (as TEXT)
    }
  }
};

exports.down = {
  dropTable: 'your_table_name' // <-- TODO: Change this table name
};
`;

  fs.writeFileSync(filePath, template);
  logger.success(`Created SQLite migration: ${filePath}`);
}

module.exports = { execute };
