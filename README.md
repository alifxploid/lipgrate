# Lipgrate: A Lightweight Database Migration Tool

Lipgrate is a simple, declarative, and framework-agnostic database migration tool designed for Node.js. It helps you manage your database schema evolution with ease, using plain JavaScript files to define changes.

## Installation

Install Lipgrate globally to use it as a command-line tool:

```bash
npm install -g lipgrate
```

## Quick Start

1. **Initialize your project:**
   This creates a `migrator.config.js` file and a `migrations` directory with examples.
   ```bash
   lipgrate init
   ```

2. **Configure your database:**
   Edit `migrator.config.js` with your database connection details.

3. **Create a migration:**
   ```bash
   lipgrate create your_migration_name
   ```

4. **Run migrations:**
   ```bash
   lipgrate migrate
   ```

5. **Roll back the last migration:**
   ```bash
   lipgrate rollback
   ```

6. **Check status:**
   ```bash
   lipgrate status
   ```

## Features

- **Declarative Migrations**: Define schema changes using simple JavaScript objects.
- **Multi-Operation Migrations**: Run multiple schema changes in a single migration file.
- **Database Agnostic**: Supports PostgreSQL, MySQL, and SQLite.
- **Clear Logging**: Get human-readable feedback for every operation during migration and rollback.
- **Intelligent Error Handling**: Get helpful "Did you mean?" suggestions for typos in data type names.
- **Safe Dry Runs**: Preview the SQL for any migration or rollback without executing it using the `--dry-run` flag.

## Installation

```bash
npm install -g lipgrate
# Or use it as a local dev dependency
npm install --save-dev lipgrate
```

## Usage

### 1. Create a Migration

Generate a new, database-specific migration file. Lipgrate reads your `migrator.config.js` to determine the database client (e.g., `postgresql`, `mysql`, `sqlite`) and provides a template with relevant examples for that database.

```bash
lipgrate create <migration_name>
```

**Example:**

```bash
# Assuming your config client is 'postgresql'
lipgrate create create_users_table
```

This will create a file inside the correct directory (e.g., `migrations/postgresql/`) containing a PostgreSQL-specific template, ready for you to edit.

### 2. Run Migrations

Apply all pending migrations.

```bash
node src/cli.js migrate
```

### 3. Rollback Migrations

Roll back the most recent batch of migrations.

```bash
node src/cli.js rollback
```

### 4. Check Migration Status

See which migrations have been applied and which are pending.

```bash
node src/cli.js status
```

### Dry Run Mode

To ensure safety and predictability, you can preview the SQL commands for any migration or rollback without applying them to the database. Use the `--dry-run` flag with the `migrate` or `rollback` commands.

**Example:**
```sh
$ node src/cli.js migrate --dry-run
```

This will output all the SQL statements that would have been executed, prefixed with `[DRY RUN]`, allowing you to review changes before they go live.

## Example Migration File

A migration file exports `up` and `down` objects. You can define a single operation or an array of operations to be executed in order.

```javascript
// Defines the UP migration action.
exports.up = [
  {
    createTable: {
      name: 'users',
      columns: {
        id: 'increments',
        username: 'string:unique:notNullable',
        email: 'string(191):unique:notNullable',
        status: "enum('active', 'pending', 'banned'):default('pending')",
        bio: 'text'
      },
      options: {
        timestamps: true // Adds created_at and updated_at
      }
    }
  },
  {
    addIndex: { 
      table: 'users', 
      columns: 'email', 
      name: 'users_email_idx' 
    }
  }
];

// Defines the DOWN migration action.
exports.down = [
  {
    dropIndex: { 
      table: 'users', 
      name: 'users_email_idx' 
    }
  },
  {
    dropTable: 'users'
  }
];
```

## Configuration

Create a `migrator.config.js` file in your project root to define your database connections. You can specify different environments, such as `development` and `production`.

**PostgreSQL Example:**
```javascript
module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'your_user',
      password: 'your_password',
      database: 'your_dev_db'
    }
  }
};
```

**SQLite Example:**
```javascript
module.exports = {
  development: {
    client: 'sqlite',
    connection: {
      filename: './lipgrate.db'
    }
  }
};
```

## Supported Data Types

### PostgreSQL

- **Numeric**: `smallint` (alias `int2`), `integer` (aliases `int`, `int4`), `bigint` (alias `int8`), `decimal`, `numeric`, `real` (alias `float4`), `double precision` (alias `float8`).
- **Auto-Incrementing**: `smallserial` (alias `serial2`), `serial` (alias `serial4`), `bigserial` (alias `serial8`), `increments` (alias for `serial`).
- **Monetary**: `money`.
- **Character**: `character(n)` (alias `char(n)`), `character varying(n)` (alias `varchar(n)`), `text`.
- **Binary**: `bytea`.
- **Date/Time**: `timestamp`, `timestamp with time zone` (alias `timestamptz`), `date`, `time`, `time with time zone` (alias `timetz`), `interval`.
- **Boolean**: `boolean` (alias `bool`).
- **Geometric**: `point`, `line`, `lseg`, `box`, `path`, `polygon`, `circle`.
- **Network Address**: `cidr`, `inet`, `macaddr`, `macaddr8`.
- **Bit String**: `bit(n)`, `bit varying(n)` (alias `varbit(n)`).
- **Text Search**: `tsvector`, `tsquery`.
- **UUID**: `uuid`.
- **XML**: `xml`.
- **JSON**: `json`, `jsonb`.
- **Internal**: `pg_lsn`, `pg_snapshot`, `txid_snapshot`.
- **Arrays**: Any data type can be made into an array, e.g., `text[]`, `integer[]`.

### SQLite

SQLite uses a more general, dynamic type system referred to as type affinity. When you specify a type, SQLite converts and stores it as one of the following storage classes:

- **TEXT**: For `string`, `char`, `text`, `date`, `datetime`, `json`, `uuid`.
- **INTEGER**: For `integer`, `bigInteger`, `boolean`.
- **REAL**: For `float`, `double`, `decimal`.
- **BLOB**: For `binary` data.
- **INTEGER PRIMARY KEY AUTOINCREMENT**: For `increments`.

### MySQL

## Supported Schema Operations

The level of support for schema operations can vary between database systems due to their differing capabilities.

| Operation         | PostgreSQL | MySQL | SQLite | Notes                                                 |
| ----------------- | :--------: | :---: | :----: | ----------------------------------------------------- |
| `createTable`     |     ✅      |   ✅   |   ✅    |                                                       |
| `dropTable`       |     ✅      |   ✅   |   ✅    |                                                       |
| `renameTable`     |     ✅      |   ✅   |   ✅    |                                                       |
| `addColumn`       |     ✅      |   ✅   |   ✅    |                                                       |
| `dropColumn`      |     ✅      |   ✅   |   ✅    |                                                       |
| `renameColumn`    |     ✅      |   ✅   |   ✅    |                                                       |
| `alterColumn`     |     ✅      |   ✅   |   ❌    | SQLite has limited support; recreate table instead.   |
| `addIndex`        |     ✅      |   ✅   |   ✅    |                                                       |
| `dropIndex`       |     ✅      |   ✅   |   ✅    |                                                       |
| `addForeignKey`   |     ✅      |   ✅   |   ❌    | Add FKs during `createTable` in SQLite.               |
| `dropForeignKey`  |     ✅      |   ✅   |   ❌    | Recreate table to drop FKs in SQLite.                 |

*   ✅ = Supported
*   ❌ = Not Supported (or requires manual table recreation)

## Intelligent Error Handling

To improve the developer experience, Lipgrate includes a smart error-handling mechanism. If you accidentally make a typo when specifying a data type in your migration, Lipgrate will detect it and provide a helpful suggestion instead of a generic SQL error.

**Example:**
If you write `'inteeger'` instead of `'integer'`, you will see the following error:
`✖ Migration failed: Unknown data type 'inteeger'. Did you mean 'integer'?'`

This helps you quickly identify and fix schema definition errors.

## Column Definitions

A column definition is a string composed of a type and optional modifiers, separated by colons (`:`).

- **Syntax**: `'type(args):modifier1:modifier2'`
- **Examples**:
  - `'increments'`
  - `'string:notNullable'`
  - `'string(100):unique'`
  - `'decimal(10, 2):default(0.00)'`
  - `"enum('a', 'b'):default('a')"`

### Supported Data Types (MySQL)

This list covers the internal data type aliases. Lipgrate will also pass through any valid MySQL data type definition directly.

- **Numeric**: `increments`, `tinyInteger`, `smallInteger`, `mediumInteger`, `integer`, `bigInteger`, `decimal`, `float`, `double`, `real`, `bit`, `boolean`, `serial`
- **Date & Time**: `date`, `datetime`, `timestamp`, `time`, `year`
- **String & Text**: `string` (for VARCHAR), `char`, `tinyText`, `text`, `mediumText`, `longText`, `enum(...)`, `set(...)`
- **Binary & Blob**: `binary`, `varbinary`, `tinyBlob`, `blob`, `mediumBlob`, `longBlob`
- **Spatial**: `geometry`, `point`, `linestring`, `polygon`, `multipoint`, `multilinestring`, `multipolygon`, `geometrycollection` (all passed as-is)
- **JSON**: `json`
- **Other**: `uuid` (as CHAR(36))
