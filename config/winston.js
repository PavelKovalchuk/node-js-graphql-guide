const appRoot = require('app-root-path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, colorize, printf, splat } = format;

const options = {
  file: {
    level: 'info',
    filename: `${appRoot}/logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: process.stdout.isTTY,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    prettyPrint: true,
    colorize: process.stdout.isTTY,
  },
};

const appFormat = printf(info => {
  return `${info.timestamp} ${info.label} ${info.level}: ${info.message}`;
});

const logger = createLogger({ 
  format: combine(
    colorize(),
    label({ label: '[app-server]' }),
    timestamp(),
    splat(),
    appFormat
  ),
  transports: [
    new transports.File(options.file),
    new transports.Console(options.console)
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function (message, encoding) {
    logger.info(message);
  },
};

module.exports = logger;