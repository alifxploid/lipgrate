// PostgreSQL specific SQL translator

const typeMappings = {
  // Common shorthands
  increments: 'SERIAL PRIMARY KEY',
  string: (len = 255) => `VARCHAR(${len})`,
  binary: 'BYTEA',
  datetime: 'TIMESTAMP',

  // Numeric Types
  smallint: 'SMALLINT',
  int2: 'SMALLINT',
  integer: 'INTEGER',
  int: 'INTEGER',
  int4: 'INTEGER',
  bigint: 'BIGINT',
  int8: 'BIGINT',
  decimal: (p, s) => `DECIMAL(${p || 10}, ${s || 2})`,
  numeric: (p, s) => `NUMERIC(${p || 10}, ${s || 2})`,
  real: 'REAL',
  float4: 'REAL',
  double: 'DOUBLE PRECISION',
  float8: 'DOUBLE PRECISION',
  smallserial: 'SMALLSERIAL',
  serial2: 'SMALLSERIAL',
  serial: 'SERIAL',
  serial4: 'SERIAL',
  bigserial: 'BIGSERIAL',
  serial8: 'BIGSERIAL',

  // Monetary Types
  money: 'MONEY',

  // Character Types
  varchar: (n) => `VARCHAR(${n})`,
  char: (n) => `CHAR(${n})`,
  text: 'TEXT',

  // Binary Data Types
  bytea: 'BYTEA',

  // Date/Time Types
  timestamp: (p) => `TIMESTAMP${p ? `(${p})` : ''}`,
  timestamptz: (p) => `TIMESTAMP${p ? `(${p})` : ''} WITH TIME ZONE`,
  date: 'DATE',
  time: (p) => `TIME${p ? `(${p})` : ''}`,
  timetz: (p) => `TIME${p ? `(${p})` : ''} WITH TIME ZONE`,
  interval: 'INTERVAL',

  // Boolean Type
  boolean: 'BOOLEAN',
  bool: 'BOOLEAN',

  // Bit String Types
  bit: (n) => `BIT(${n})`,
  varbit: (n) => `VARBIT(${n})`,

  // Text Search Types
  tsvector: 'TSVECTOR',
  tsquery: 'TSQUERY',

  // UUID Type
  uuid: 'UUID',

  // XML Type
  xml: 'XML',

  // JSON Types
  json: 'JSON',
  jsonb: 'JSONB',

  // Geometric Types
  point: 'POINT',
  line: 'LINE',
  lseg: 'LSEG',
  box: 'BOX',
  path: 'PATH',
  polygon: 'POLYGON',
  circle: 'CIRCLE',

  // Network Address Types
  cidr: 'CIDR',
  inet: 'INET',
  macaddr: 'MACADDR',
  macaddr8: 'MACADDR8',

  // Other Types
  pg_lsn: 'PG_LSN',
  pg_snapshot: 'PG_SNAPSHOT',
  txid_snapshot: 'TXID_SNAPSHOT'
};

function getColumnDefinition(colDef) {
  const parts = colDef.split(':');
  const typeDef = parts[0];
  const modifiers = parts.slice(1);

  const typeMatch = typeDef.match(/(\w+)(?:\((.*)\))?/);
  const typeName = typeMatch[1];
  const typeArgs = typeMatch[2] ? typeMatch[2].split(',').map(s => s.trim()) : [];

  let sqlType;
  const mappedType = typeMappings[typeName];

  if (mappedType) {
    // It's a known type, use our mapping
    if (typeof mappedType === 'function') {
      sqlType = mappedType(...typeArgs);
    } else {
      sqlType = mappedType;
    }
  } else {
    // It's an unknown type, pass it through directly
    sqlType = typeDef.toUpperCase();
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
      const isQuoted = (str) => (str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'));

      const isFunction = defaultValue.toUpperCase().includes('(');
      const isNumeric = !isNaN(defaultValue);
      const isBoolean = defaultValue.toLowerCase() === 'true' || defaultValue.toLowerCase() === 'false';

      // Use the value directly if it's a function, numeric, a boolean keyword, or already quoted.
      if (isFunction || isNumeric || isBoolean || isQuoted(defaultValue)) {
        sql += ` DEFAULT ${defaultValue}`;
      } else {
        // Otherwise, quote and escape it.
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
    columnDefs.push('created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');
    columnDefs.push('updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');
  }

  return `CREATE TABLE IF NOT EXISTS ${name} (${columnDefs.join(', ')});`;
}

function dropTable(tableName) {
  return `DROP TABLE IF EXISTS ${tableName};`;
}

function addColumn(schema) {
  const { table, column, definition } = schema;
  const columnSql = getColumnDefinition(definition);
  return `ALTER TABLE ${table} ADD COLUMN ${column} ${columnSql};`;
}

function dropColumn(schema) {
  const { table, column } = schema;
  return `ALTER TABLE ${table} DROP COLUMN ${column};`;
}

function renameTable(schema) {
  const { from, to } = schema;
  return `ALTER TABLE ${from} RENAME TO ${to};`;
}

function renameColumn(schema) {
  const { table, from, to } = schema;
  return `ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}";`;
}

function alterColumn(schema) {
  const { table, column, definition } = schema;
  const columnSql = getColumnDefinition(definition);
  // NOTE: PostgreSQL requires separate statements for type, default, and nullability.
  // This simplified version primarily targets type changes.
  const newType = columnSql.split(' ')[0];
  return `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${newType} USING "${column}"::${newType};`;
}

function addIndex(schema) {
  const { table, columns, type, name } = schema;
  const colList = Array.isArray(columns) ? columns.join('", "') : columns;
  const indexType = type === 'unique' ? 'UNIQUE INDEX' : 'INDEX';
  const indexName = name || `${table}_${Array.isArray(columns) ? columns.join('_') : columns}_${type || 'idx'}`;
  return `CREATE ${indexType} "${indexName}" ON "${table}" ("${colList}");`;
}

function dropIndex(schema) {
  const { name } = schema; // PostgreSQL drops index by name
  return `DROP INDEX IF EXISTS "${name}";`;
}

function addForeignKey(schema) {
  const { table, columns, references, name, onUpdate, onDelete } = schema;
  const constraintName = name || `${table}_${columns.join('_')}_fkey`;
  const cols = columns.join('", "');
  const refCols = references.columns.join('", "');
  let sql = `ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${cols}") REFERENCES "${references.table}" ("${refCols}")`;
  if (onDelete) sql += ` ON DELETE ${onDelete.toUpperCase()}`;
  if (onUpdate) sql += ` ON UPDATE ${onUpdate.toUpperCase()}`;
  return `${sql};`;
}

function dropForeignKey(schema) {
  const { table, name } = schema;
  return `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}";`;
}

module.exports = {
  createTable,
  dropTable,
  addColumn,
  dropColumn,
  renameTable,
  renameColumn,
  alterColumn,
  addIndex,
  dropIndex,
  addForeignKey,
  dropForeignKey
};
