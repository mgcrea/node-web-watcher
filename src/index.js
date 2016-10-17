
import Promise from 'bluebird';
import nodemailer from 'nodemailer';
import request from 'request';
import cheerio from 'cheerio';
import chalk from 'chalk';
import {diffChars, diffJson} from 'diff';
import phantom from 'phantom';
import {defaults, size, sum, parseInt, last, get} from 'lodash';

import {log} from './utils/log';
// const log = console.log.bind(console);

if (process.env.NODE_ENV === 'development') {
  require('debug-utils'); // eslint-disable-line
}

const requestAsync = Promise.promisify(request);
const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'; // eslint-disable-line max-len

export class WebWatcher {

  static defaults = {
    url: null,
    type: 'GET',
    query: 'html',
    delay: 5000,
    from: 'webwatcher@mgcrea.io',
    to: null,
    smtp: null
  }

  constructor(options = {}) {
    if (!options.url) {
      throw new Error('You must provide an url');
    }
    this.config = defaults(options, WebWatcher.defaults);
    if (this.config.smtp) {
      this.transporter = nodemailer.createTransport(this.config.smtp);
    }
    this.run();
  }

  get history() {
    return this.$$history || (this.$$history = []);
  }

  get delay() {
    const {delay} = this.config;
    return (delay / 2) + Math.floor(Math.random() * (delay / 2));
  }

  phantom() {
    const {url} = this.config;

    const time = Date.now();
    return new Promise((resolve, reject) => {
      phantom.create((ph) => {
        ph.createPage((page) => {
          page.set('settings.userAgent', userAgent);
          page.open(url, (status) => {
            log.info('PhantomJS returned with %s-statusCode in %s-ms.',
              chalk.cyan(status),
              chalk.magenta(Date.now() - time)
            );
            page.evaluate(() => document.documentElement.outerHTML, (html) => { // eslint-disable-line
              ph.exit();
              resolve(html);
            });
          });
        });
      });
    });
  }

  request() {
    const {type, url} = this.config;
    log.info(`Requesting url="${url}"...`);

    const time = Date.now();
    const requestOptions = {
      type,
      uri: url,
      headers: {
        'User-Agent': userAgent
      }
    };
    return requestAsync(requestOptions)
    .then((res) => {
      log.info('Request returned with %s-statusCode in %s-ms.',
        chalk.cyan(res.statusCode),
        chalk.magenta(Date.now() - time)
      );
      return res.body;
    })
    .catch((err) => {
      log.info('Failed to request url="%s"', url);
      log.info(chalk.grey(err.stack));
    });
  }

  parseData(data) {
    const {query} = this.config;
    const command = this.config._[0];

    if (command === 'raw') {
      return data;
    } else if (command === 'json') {
      if (query) {
        try {
          const parsedData = JSON.parse(data);
          return JSON.stringify(get(parsedData, query));
        } catch (err) {
          return JSON.stringify({err, data});
        }
      }
      return data;
    }

    const $ = cheerio.load(data);
    const $queryEl = $(query || 'html');
    log.info('Found %s-element%s matching query "%s".',
      chalk.cyan($queryEl.length),
      $queryEl.length !== 1 ? 's' : '', chalk.yellow(query)
      );

    switch (command) {
      case 'html':
        return $queryEl.map((i, el) => $(el).html()).get().join('\n');
      case 'text':
        return $queryEl.map((i, el) => $(el).text()).get().join('\n');
      case 'count':
        return size($queryEl);
      case 'sum':
        return sum($queryEl.map((i, el) => parseInt($(el).text())).get());
      default:
        throw new Error(`Unsupported command ${command}`);
    }
  }

  compareData(data) {
    const command = this.config._[0];
    const differ = command === 'json' ? diffJson : diffChars;

    if (!this.history.length) {
      log.warn(`Found pristine data:\n${chalk.grey(data)}`);
      const diff = differ('', String(data));
      this.history.push({date: new Date(), count: 1, diff, data});
      return true;
    }

    const lastHistory = last(this.history);
    if (lastHistory.data == data) { // eslint-disable-line eqeqeq
      log.info('Found same data, %s-ms elapsed...', chalk.cyan(Date.now() - lastHistory.date));
      lastHistory.count += 1;
      return false;
    }

    const diff = differ(String(last.data), String(data));
    this.history.push({date: new Date(), count: 1, diff, data});
    return true;
  }

  sendEmail() {
    const {smtp, from, to, url, query} = this.config;
    if (!smtp) {
      return Promise.resolve();
    }

    const lastHistory = last(this.history) || {diff: ''};
    const mailOptions = {
      html: `
        <h2>Diff</h2><p>${JSON.stringify(lastHistory.diff)}</p>
        <h2>Config</h2><pre>${JSON.stringify({to, url, query}, null, 2)}</pre>
        <h2>History</h2><pre>${JSON.stringify(this.history, null, 2)}</pre>
      `,
      subject: 'WebWatcher Change Alert!',
      from,
      to
    };
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(mailOptions, (error, res) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(res);
      });
    })
    .then((res) => {
      log.info(`Sent email to ${chalk.yellow(to)}`);
    })
    .catch((err) => {
      log.info('Failed to mail recipient="%s"', 'olouvignes@gmail.com');
      log.info(chalk.grey(err.stack));
    });
  }

  run() {
    const {phantomjs} = this.config;
    return Promise.bind(this)
      .then(phantomjs ? this.phantom : this.request)
      .then(this.parseData)
      .then(this.compareData)
      .then(this.handleChange)
      .then((changed) => {
        if (changed) {
          log.warn(`Watched content changed!\n${chalk.grey(JSON.stringify(changed, null, 2))}`);
          this.sendEmail();
        }
      })
      .delay(this.delay)
      .then(this.run);
  }
}

export default WebWatcher;
