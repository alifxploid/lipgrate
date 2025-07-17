const chalk = require('chalk');
const logSymbols = require('log-symbols');

const logger = {
  info(message) {
    console.log(`${logSymbols.info} ${chalk.blue(message)}`);
  },
  success(message) {
    console.log(`${logSymbols.success} ${chalk.green(message)}`);
  },
  warning(message) {
    console.log(`${logSymbols.warning} ${chalk.yellow(message)}`);
  },
  error(message) {
    console.error(`${logSymbols.error} ${chalk.red(message)}`);
  },
  // A specific style for running migrations
  running(message) {
    console.log(`${chalk.yellow('›')} ${message}`);
  }
};

module.exports = logger;
