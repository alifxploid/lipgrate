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
  const migrationsDir = path.resolve(process.cwd(), config.migrations.directory, 'postgresql');

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const filePath = path.join(migrationsDir, fileName);
  const template = `// Migration file for PostgreSQL: ${fileName}
/*
  Lipgrate provides a declarative way to define your schema changes.
  This template is specific to PostgreSQL.

  === Column Definitions ===
  A column definition is a string with 'type:modifier1:modifier2'.
  Examples: 'string', 'text:notNullable', 'integer:unique', 'decimal(10, 2):default(0.00)'

  === Supported Data Types (PostgreSQL) ===
  Numeric: increments, smallint, integer, bigint, decimal, numeric, real, double, serial, money
  Character: string, varchar(n), char(n), text
  Date/Time: timestamp, timestamptz, date, time, timetz, interval
  Other: boolean, bytea, uuid, xml, json, jsonb, point, line, circle
*/

exports.up = {
  createTable: {
    name: 'your_table_name', // <-- TODO: Change this table name
    columns: {
      id: 'increments',
      // user_uuid: 'uuid:default(gen_random_uuid())',
      // event_data: 'jsonb:notNullable',
      // balance: 'money:default(0)',
      // created_on: 'timestamptz:default(now())'
    },
    options: {
      timestamps: true // Automatically adds created_at and updated_at (as TIMESTAMPTZ)
    }
  }
};

exports.down = {
  dropTable: 'your_table_name' // <-- TODO: Change this table name
};
`;

  fs.writeFileSync(filePath, template);
  logger.success(`Created PostgreSQL migration: ${filePath}`);
}

module.exports = { execute };
