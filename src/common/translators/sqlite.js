const { get } = require('fast-levenshtein');

// SQLite specific SQL translator

const typeMappings = {
  sqlite: {
    // This mapping is simplified because SQLite uses type affinities.
    // The core logic is in getColumnDefinition.
    increments: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    integer: 'INTEGER',
    string: 'TEXT',
    text: 'TEXT',
    boolean: 'INTEGER',
    float: 'REAL',
    decimal: 'NUMERIC',
    date: 'TEXT',
    datetime: 'TEXT',
    json: 'TEXT',
    binary: 'BLOB',
    uuid: 'TEXT'
  },
  mysql: {
    // Numeric
    increments: 'INT AUTO_INCREMENT PRIMARY KEY',
    integer: 'INT',
    bigInteger: 'BIGINT',
    mediumInteger: 'MEDIUMINT',
    smallInteger: 'SMALLINT',
    tinyInteger: 'TINYINT',
    decimal: 'DECIMAL',
    float: 'FLOAT',
    double: 'DOUBLE',
    real: 'REAL',
    bit: 'BIT',
    boolean: 'TINYINT(1)',
    serial: 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE',

    // String & Text
    string: 'VARCHAR(255)',
    char: 'CHAR',
    text: 'TEXT',
    tinyText: 'TINYTEXT',
    mediumText: 'MEDIUMTEXT',
    longText: 'LONGTEXT',
    set: 'SET',

    // Date & Time
    date: 'DATE',
    time: 'TIME',
    datetime: 'DATETIME',
    timestamp: 'TIMESTAMP',
    year: 'YEAR',
    timestamps: '', // Special case handled in createTable

    // Binary & Blob
    binary: 'BINARY',
    varbinary: 'VARBINARY',
    tinyBlob: 'TINYBLOB',
    blob: 'BLOB',
    mediumBlob: 'MEDIUMBLOB',
    longBlob: 'LONGBLOB',

    // JSON & UUID
    json: 'JSON',
    uuid: 'CHAR(36)'
  }
};

function getColumnDefinition(colDef, colName, dialect = 'sqlite') {
  const parts = colDef.split(':');
  const typeString = parts[0].toLowerCase();
  const modifiers = parts.slice(1);

  let baseType = '';
  let checkConstraint = '';

  // Determine SQLite Type Affinity
  if (typeString.includes('int')) {
    baseType = 'INTEGER';
  } else if (typeString.includes('char') || typeString.includes('clob') || typeString.includes('text')) {
    baseType = 'TEXT';
  } else if (typeString.includes('blob') || typeString === '') {
    baseType = 'BLOB';
  } else if (typeString.includes('real') || typeString.includes('floa') || typeString.includes('doub')) {
    baseType = 'REAL';
  } else if (typeString.includes('numeric') || typeString.includes('decimal') || typeString.includes('boolean') || typeString.includes('date') || typeString.includes('datetime')) {
    baseType = 'NUMERIC';
  } else {
    baseType = 'TEXT'; // Default fallback
  }

  // Handle special cases
  if (typeString.startsWith('increments')) {
    baseType = 'INTEGER PRIMARY KEY AUTOINCREMENT';
  } else if (typeString.startsWith('enum(')) {
    const match = parts[0].match(/^enum\((.*)\)$/i);
    if (match) {
      const values = match[1];
      baseType = 'TEXT';
      // Use the actual column name in the CHECK constraint
      checkConstraint = ` CHECK(${colName} IN (${values}))`;
    }
  }

  let sql = baseType;

  // Add modifiers, avoiding duplicates for increments
  if (!sql.includes('PRIMARY KEY') && modifiers.includes('primary')) sql += ' PRIMARY KEY';
  if (modifiers.includes('notNullable')) sql += ' NOT NULL';
  if (modifiers.includes('unique')) sql += ' UNIQUE';

  // Handle default values
  const defaultModifier = modifiers.find(m => m.startsWith('default('));
  if (defaultModifier) {
    const match = defaultModifier.match(/^default\((.*)\)$/);
    if (match) {
      let defaultValue = match[1];
      const isQuoted = (str) => (str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'));

      if (defaultValue.toLowerCase() === 'true') defaultValue = '1';
      else if (defaultValue.toLowerCase() === 'false') defaultValue = '0';

      const isFunction = defaultValue.toUpperCase().includes('(');
      const isNumeric = !isNaN(defaultValue);

      if (isFunction || isNumeric || isQuoted(defaultValue)) {
        sql += ` DEFAULT ${defaultValue}`;
      } else {
        sql += ` DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
      }
    }
  }

  if (checkConstraint) {
    sql += checkConstraint;
  }

  return sql;
}

function createTable(schema) {
  const { name, columns, options = {} } = schema;
  const columnDefs = Object.entries(columns).map(([colName, colDef]) => {
    // Pass the column name to getColumnDefinition
    return `${colName} ${getColumnDefinition(colDef, colName)}`;
  });

  if (options.timestamps) {
    // SQLite uses DATETIME('now') for dynamic defaults
    columnDefs.push("created_at TEXT DEFAULT (datetime('now', 'localtime'))");
    columnDefs.push("updated_at TEXT DEFAULT (datetime('now', 'localtime'))");
  }

  return `CREATE TABLE IF NOT EXISTS ${name} (${columnDefs.join(', ')});`;
}

function dropTable(tableName) {
  return `DROP TABLE IF EXISTS ${tableName};`;
}

function renameTable(schema) {
  const { from, to } = schema;
  if (!from || !to) {
    throw new Error('Invalid schema for renameTable: requires from and to.');
  }
  return `ALTER TABLE ${from} RENAME TO ${to};`;
}

function addColumn(schema) {
  const { table, column, definition } = schema;
  if (!table || !column || !definition) {
    throw new Error('Invalid schema for addColumn: requires table, column, and definition.');
  }
  // Pass the column name to getColumnDefinition
  const colDef = getColumnDefinition(definition, column);
  return `ALTER TABLE ${table} ADD COLUMN ${column} ${colDef};`;
}

function dropColumn(schema) {
  const { table, column } = schema;
  if (!table || !column) {
    throw new Error('Invalid schema for dropColumn: requires table and column.');
  }
  return `ALTER TABLE ${table} DROP COLUMN ${column};`;
}

function renameColumn(schema) {
  const { table, from, to } = schema;
  if (!table || !from || !to) {
    throw new Error('Invalid schema for renameColumn: requires table, from, and to.');
  }
  // SQLite uses a simpler RENAME COLUMN syntax
  return `ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to};`;
}

function addIndex(schema) {
  const { table, columns, name, type } = schema;
  if (!table || !columns || !name) {
    throw new Error('Invalid schema for addIndex: requires table, columns, and name.');
  }
  const cols = Array.isArray(columns) ? columns.join(', ') : columns;
  const indexType = type === 'unique' ? 'UNIQUE ' : '';
  return `CREATE ${indexType}INDEX ${name} ON ${table} (${cols});`;
}

function dropIndex(schema) {
  const { name } = schema;
  if (!name) {
    throw new Error('Invalid schema for dropIndex: requires index name.');
  }
  // SQLite's DROP INDEX syntax does not include the table name.
  return `DROP INDEX IF EXISTS ${name};`;
}

function addForeignKey(schema) {
  throw new Error('`addForeignKey` is not supported in SQLite. Foreign keys must be defined during table creation.');
}

function dropForeignKey(schema) {
  throw new Error('`dropForeignKey` is not supported in SQLite. To drop a foreign key, you must recreate the table.');
}

function alterColumn(schema) {
  // SQLite has very limited support for altering columns. 
  // A full implementation requires creating a new table and copying data.
  // For now, we'll throw an error to prevent unexpected behavior.
  throw new Error('`alterColumn` is not supported in SQLite. Please create a new migration to manage column changes.');
}

module.exports = {
  createTable,
  dropTable,
  renameTable,
  addColumn,
  dropColumn,
  renameColumn,
  alterColumn,
  addIndex,
  dropIndex,
  addForeignKey,
  dropForeignKey
};
