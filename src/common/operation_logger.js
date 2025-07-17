const chalk = require('chalk');

function describe(operationObject) {
  const operation = Object.keys(operationObject)[0];
  const schema = operationObject[operation];

  switch (operation) {
    case 'createTable':
      return `Creating table ${chalk.cyan(schema.name)}`;
    case 'dropTable':
      return `Dropping table ${chalk.cyan(schema)}`;
    case 'renameTable':
      return `Renaming table ${chalk.cyan(schema.from)} to ${chalk.cyan(schema.to)}`;
    case 'addColumn':
      return `Adding column ${chalk.cyan(schema.column)} to table ${chalk.cyan(schema.table)}`;
    case 'dropColumn':
      return `Dropping column ${chalk.cyan(schema.column)} from table ${chalk.cyan(schema.table)}`;
    case 'renameColumn':
      return `Renaming column ${chalk.cyan(schema.from)} to ${chalk.cyan(schema.to)} on table ${chalk.cyan(schema.table)}`;
    case 'alterColumn':
      return `Altering column ${chalk.cyan(schema.column)} on table ${chalk.cyan(schema.table)}`;
    case 'addIndex':
      const type = schema.type === 'unique' ? 'unique index' : 'index';
      return `Adding ${type} ${chalk.cyan(schema.name)} on table ${chalk.cyan(schema.table)}`;
    case 'dropIndex':
      return `Dropping index ${chalk.cyan(schema.name)} from table ${chalk.cyan(schema.table)}`;
    case 'addForeignKey':
      return `Adding foreign key ${chalk.cyan(schema.name)} on table ${chalk.cyan(schema.table)}`;
    case 'dropForeignKey':
      return `Dropping foreign key ${chalk.cyan(schema.name)} from table ${chalk.cyan(schema.table)}`;
    default:
      return `Executing unknown operation: ${operation}`;
  }
}

module.exports = { describe };
