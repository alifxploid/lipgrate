const { get } = require('fast-levenshtein');

// MySQL specific SQL translator

const typeMappings = {
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

function getColumnDefinition(colDef, dialect = 'mysql') {
  const parts = colDef.split(':');
  const typeDef = parts[0];
  const modifiers = parts.slice(1);

  // Handle types with parentheses specifically to preserve their arguments
  const typesWithArgs = ['enum', 'set', 'char', 'varchar', 'decimal', 'float', 'double', 'real', 'bit', 'binary', 'varbinary'];
  if (typesWithArgs.some(type => typeDef.toLowerCase().startsWith(type + '('))) {
    let sql = typeDef;
    if (modifiers.includes('notNullable')) sql += ' NOT NULL';
    if (modifiers.includes('unique')) sql += ' UNIQUE';
    if (modifiers.includes('primary')) sql += ' PRIMARY KEY';
    const defaultModifier = modifiers.find(m => m.startsWith('default('));
    if (defaultModifier) {
      const match = defaultModifier.match(/^default\((.*)\)$/);
      if (match) {
        const defaultValue = match[1];
        const isQuoted = (str) => (str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'));
        const isFunction = defaultValue.toUpperCase().includes('(');
        const isNumeric = !isNaN(defaultValue);
        const isBoolean = ['true', 'false'].includes(defaultValue.toLowerCase());

        if (isFunction || isNumeric || isBoolean || isQuoted(defaultValue)) {
          sql += ` DEFAULT ${defaultValue}`;
        } else {
          sql += ` DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
        }
      }
    }
    return sql;
  }

  const typeMatch = typeDef.match(/(\w+)(?:\((.*)\))?/);
  const typeName = typeMatch[1];
  const typeArgs = typeMatch[2] ? typeMatch[2].split(',').map(s => s.trim()) : [];

  let sqlType;
  const mappedType = typeMappings[dialect][typeName];

  if (mappedType) {
    if (typeof mappedType === 'function') {
      sqlType = mappedType(...typeArgs);
    } else {
      sqlType = mappedType;
    }
  } else {
    const validTypes = Object.keys(typeMappings[dialect]);
    let bestMatch = null;
    let minDistance = Infinity;

    validTypes.forEach(validType => {
            const distance = get(typeName.toLowerCase(), validType.toLowerCase());
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = validType;
      }
    });

        if (bestMatch && minDistance <= 3) {
      throw new Error(`Unknown data type '${typeName}'. Did you mean '${bestMatch}'?`);
    } else {
      throw new Error(`Unknown data type '${typeName}'.`);
    }
  }

  let sql = sqlType;

  if (modifiers.includes('notNullable')) sql += ' NOT NULL';
  if (modifiers.includes('unique')) sql += ' UNIQUE';
  if (modifiers.includes('primary')) sql += ' PRIMARY KEY';

  const defaultModifier = modifiers.find(m => m.startsWith('default('));
  if (defaultModifier) {
    const match = defaultModifier.match(/^default\((.*)\)$/);
    if (match) {
      const defaultValue = match[1];
      if (defaultValue.toUpperCase().includes('(') || !isNaN(defaultValue)) {
        sql += ` DEFAULT ${defaultValue}`;
      } else {
        sql += ` DEFAULT '${defaultValue.replace(/'/g, "''")}'`;
      }
    }
  }

  return sql;
}

function createTable(schema) {
  const { name, columns, options = {} } = schema;
  const columnDefs = Object.entries(columns).map(([colName, colDef]) => {
    return `${colName} ${getColumnDefinition(colDef)}`;
  });

  if (options.timestamps) {
    columnDefs.push('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    columnDefs.push('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
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
  const colDef = getColumnDefinition(definition);
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
  const { table, from, to, definition } = schema;
  if (!table || !to || !definition) {
    throw new Error('Invalid schema for renameColumn: requires table, from, to, and definition.');
  }
  const colDef = getColumnDefinition(definition);
  return `ALTER TABLE ${table} CHANGE COLUMN ${from} ${to} ${colDef};`;
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
  const { table, name } = schema;
  if (!table || !name) {
    throw new Error('Invalid schema for dropIndex: requires table and name.');
  }
  return `DROP INDEX ${name} ON ${table};`;
}

function addForeignKey(schema) {
  const { table, columns, references, name, onDelete, onUpdate } = schema;
  if (!table || !columns || !references || !name) {
    throw new Error('Invalid schema for addForeignKey: requires table, columns, references, and name.');
  }
  const cols = Array.isArray(columns) ? columns.join(', ') : columns;
  const refTable = references.table;
  const refCols = Array.isArray(references.columns) ? references.columns.join(', ') : references.columns;

  let sql = `ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (${cols}) REFERENCES ${refTable}(${refCols})`;

  if (onDelete) sql += ` ON DELETE ${onDelete.toUpperCase()}`;
  if (onUpdate) sql += ` ON UPDATE ${onUpdate.toUpperCase()}`;

  return `${sql};`;
}

function dropForeignKey(schema) {
  const { table, name } = schema;
  if (!table || !name) {
    throw new Error('Invalid schema for dropForeignKey: requires table and name.');
  }
  return `ALTER TABLE ${table} DROP FOREIGN KEY ${name};`;
}

function alterColumn(schema) {
  const { table, column, definition } = schema;
  if (!table || !column || !definition) {
    throw new Error('Invalid schema for alterColumn: requires table, column, and definition.');
  }
  const colDef = getColumnDefinition(definition);
  return `ALTER TABLE ${table} MODIFY COLUMN ${column} ${colDef};`;
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
