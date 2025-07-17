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
  const migrationsDir = path.resolve(process.cwd(), config.migrations.directory, 'mysql');

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const filePath = path.join(migrationsDir, fileName);
  const template = `// Migration file for MySQL: ${fileName}
/*
  Lipgrate provides a declarative way to define your schema changes.
  This template is specific to MySQL.

  === Column Definitions ===
  A column definition is a string with 'type:modifier1:modifier2'.
  Examples: 'string', 'text:notNullable', 'integer:unique', 'decimal(10, 2):default(0.00)'

  === Supported Data Types (MySQL 8+) ===
  Numeric: increments, integer, bigInteger, tinyInteger, decimal, float, double, boolean
  String:  string, text, tinyText, mediumText, longText, enum('val1', 'val2')
  Date/Time: date, time, datetime, timestamp
  Binary:  binary, tinyBlob, mediumBlob, longBlob
  Other:   json, uuid (as CHAR(36))
*/

exports.up = {
  createTable: {
    name: 'your_table_name', // <-- TODO: Change this table name
    columns: {
      id: 'increments',
      // product_name: 'string:notNullable:unique',
      // description: 'text',
      // price: 'decimal(8, 2):default(0)',
      // status: "enum('active', 'archived'):default('active')",
      // metadata: 'json',
      // is_active: 'boolean:default(true)'
    },
    options: {
      timestamps: true // Automatically adds created_at and updated_at
    }
  }
};

exports.down = {
  dropTable: 'your_table_name' // <-- TODO: Change this table name
};
`;

  fs.writeFileSync(filePath, template);
  logger.success(`Created MySQL migration: ${filePath}`);
}

module.exports = { execute };
