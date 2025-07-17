#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const commands = {};
const commandsPath = path.join(__dirname, 'commands');
const logger = require('./common/logger');

// Load all commands dynamically
fs.readdirSync(commandsPath).forEach(file => {
  if (file.endsWith('.js')) {
    const commandName = path.basename(file, '.js');
    commands[commandName] = require(path.join(commandsPath, file));
  }
});

async function main() {
  const [,, commandName, ...rawArgs] = process.argv;

  if (!commandName || !commands[commandName]) {
    logger.error(`Command not found. Available commands: ${Object.keys(commands).join(', ')}`);
    // You can add a more detailed help display function here if you want.
    process.exit(1);
  }

  // Separate arguments from options/flags
  const args = rawArgs.filter(arg => !arg.startsWith('--'));
  const options = rawArgs
    .filter(arg => arg.startsWith('--'))
    .reduce((acc, arg) => {
      const [key, value] = arg.substring(2).split('=');
      acc[key] = value === undefined ? true : value; // Handles --flag and --key=value
      return acc;
    }, {});

  try {
    const command = commands[commandName];
    await command.execute(args, options);
    // Success message is now handled within the command runners for more specific feedback.
  } catch (error) {
    logger.error(`Error executing command '${commandName}': ${error.message}`);
    // For debugging, you might want to see the full stack trace:
    // console.error(error);
    process.exit(1);
  }
}

main();
