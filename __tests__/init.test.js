const fs = require('fs');
const path = require('path');
const { execute } = require('../src/commands/init');
const logger = require('../src/common/logger');

// Mock the logger to prevent console output during tests
jest.mock('../src/common/logger', () => ({
  success: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
}));

// Mock fs module
jest.mock('fs');

describe('init command', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset console.log mock
    global.console = { log: jest.fn() };
  });

  it('should create config file and migrations directory if they do not exist', async () => {
    // Arrange: Simulate that files do not exist
    fs.existsSync.mockReturnValue(false);

    // Act
    await execute();

    // Assert
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'migrator.config.js'),
      expect.any(String)
    );
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'migrations')
    );
    expect(logger.success).toHaveBeenCalledWith('✔ Created configuration file: migrator.config.js');
    expect(logger.success).toHaveBeenCalledWith('✔ Created migrations directory: migrations/');
  });

  it('should show a warning if config file already exists', async () => {
    // Arrange: Simulate that config file exists
    fs.existsSync.mockImplementation((p) => p.endsWith('migrator.config.js'));

    // Act
    await execute();

    // Assert
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(logger.warning).toHaveBeenCalledWith("Configuration file 'migrator.config.js' already exists.");
  });
});
