const fs = require('fs');
const path = require('path');
const logger = require('../common/logger');
const chalk = require('chalk');

const defaultConfigContent = `// Lipgrate Configuration File
// For more information, visit [repository-link]

module.exports = {
  // Database adapter to use. Supported: 'postgresql', 'mysql', 'sqlite'
  adapter: 'postgresql',

  // Connection details for your database
  connection: {
    host: 'localhost',
    user: 'your_db_user',
    password: 'your_db_password',
    database: 'your_db_name',
    port: 5432, // Default for PostgreSQL
    // For SQLite, use: filename: './db.sqlite'
  },

  // Directory where your migration files are stored
  migrations: {
    directory: './migrations'
  },

  // Optional: Specify a schema for PostgreSQL
  // schema: 'public',
};
`;

const configFileName = 'migrator.config.js';

async function execute() {
  const configPath = path.resolve(process.cwd(), configFileName);

  if (fs.existsSync(configPath)) {
    logger.warning(`Configuration file '${configFileName}' already exists.`);
    return;
  }

  // Create the config file
  fs.writeFileSync(configPath, defaultConfigContent);
  logger.success(`✔ Created configuration file: ${configFileName}`);

  // Create the migrations directory
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir);
    logger.success(`✔ Created migrations directory: migrations/`);
  } else {
    logger.info('Migrations directory already exists.');
  }

  // Create example migration files
  createExampleMigrations(migrationsDir);

  console.log(chalk.blue('\nNext steps:'));
  console.log('1. Update migrator.config.js with your database credentials.');
  console.log('2. Review the example files in the migrations/ directory.');
  console.log(`3. Create your first migration with: ${chalk.cyan('node src/cli.js create <migration_name>')}`);
}

const examplePostgres = `exports.up = { createTable: { name: 'users', columns: { id: 'serial:primary', email: 'varchar(255):notNullable:unique', created_at: 'timestamptz:default(now())' } } };\nexports.down = { dropTable: 'users' };`;
const exampleMySql = `exports.up = { createTable: { name: 'products', columns: { id: 'increments', name: 'string:notNullable', price: 'decimal(10, 2)' }, options: { timestamps: true } } };\nexports.down = { dropTable: 'products' };`;
const exampleSqlite = `exports.up = { createTable: { name: 'posts', columns: { id: 'increments', title: 'string', content: 'text' } } };\nexports.down = { dropTable: 'posts' };`;

function createExampleMigrations(migrationsDir) {
  const examples = [
    { name: '001_postgres_example.js.example', content: examplePostgres },
    { name: '002_mysql_example.js.example', content: exampleMySql },
    { name: '003_sqlite_example.js.example', content: exampleSqlite },
  ];

  try {
    examples.forEach(example => {
      const filePath = path.join(migrationsDir, example.name);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, example.content);
      }
    });
    logger.success('✔ Created example migration files.');
  } catch (error) {
    logger.warning('Could not create example migration files.');
  }
}

module.exports = { execute };
