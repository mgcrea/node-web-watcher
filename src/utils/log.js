import chalk from 'chalk';
import util from 'util';

const isObject = maybeObject => typeof maybeObject === 'object';

export const inspect = (...args) => (
  isObject(args[0]) ? util.inspect(...args, false, 10, true) : util.format(...args)
);

export const log = {
  info: (...args) => {
    const time = new Date().toISOString();
    console.log(chalk.white(time), util.format(...args));
  },
  warn: (...args) => {
    const time = new Date().toISOString();
    console.log(chalk.white.bgRed(time), util.format(...args));
  }
};

export default log;
