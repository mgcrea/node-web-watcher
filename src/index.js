
import Promise from 'bluebird';
import mandrill from 'mandrill-api/mandrill';
import request from 'request';
import cheerio from 'cheerio';
import chalk from 'chalk';
import differ from 'differ';
import phantom from 'phantom';
import {defaults, size, sum, parseInt, last} from 'lodash';

const log = console.log.bind(console);
const requestAsync = Promise.promisify(request);

try { require('debug-utils'); } catch (err) {}; // eslint-disable-line

const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'; // eslint-disable-line max-len

exports.WebWatcher = class WebWatcher {

  constructor(options = {}) {
    this.config = defaults(options, {url: 'http://google.com', type: 'GET', query: 'html', delay: 5000});
    const {mandrillApiKey} = this.config;
    if (mandrillApiKey) {
      this.mandrill = new mandrill.Mandrill(mandrillApiKey);
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
            log('PhantomJS returned with %s-statusCode in %s-ms.',
              chalk.cyan(status),
              chalk.magenta(Date.now() - time)
            );
            page.evaluate(() => document.documentElement.outerHTML, (html) => { // eslint-disable-line no-undef
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
    log(`Requesting url="${url}"...`);

    const time = Date.now();
    const requestOptions = {
      type,
      uri: url,
      headers: {
        'User-Agent': userAgent
      }
    };
    return requestAsync(requestOptions)
    .then(res => {
      log('Request returned with %s-statusCode in %s-ms.',
        chalk.cyan(res.statusCode),
        chalk.magenta(Date.now() - time)
      );
      return res.body;
    })
    .catch((err) => {
      log('Failed to request url="%s"', url);
      log(chalk.grey(err.stack));
    });
  }

  parseData(data) {
    const {query} = this.config;
    const command = this.config._[0];

    const $ = cheerio.load(data);
    const $queryEl = $(query || 'html');
    log('Found %s-element%s matching query "%s".',
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
    if (!this.history.length) {
      log(`Found pristine data:\n${chalk.grey(data)}`);
      const diff = differ('', String(data));
      this.history.push({date: new Date(), count: 1, diff, data});
      return false;
    }

    const lastHistory = last(this.history);
    if (lastHistory.data == data) { // eslint-disable-line eqeqeq
      log('Found same data, %s-ms elapsed...', chalk.cyan(Date.now() - lastHistory.date));
      lastHistory.count++;
      return false;
    }

    const diff = differ(String(last.data), String(data));
    this.history.push({date: new Date(), count: 1, diff, data});
    return true;
  }

  sendEmail() {
    const {email, url, query} = this.config;

    const lastHistory = last(this.history);
    const message = {
      html: `
        <h2>Diff</h2><p>${lastHistory.diff.replace(/\n/g, '<br>')}</p>
        <h2>Config</h2><pre>${JSON.stringify({email, url, query}, null, 2)}</pre>
        <h2>History</h2><pre>${JSON.stringify(this.history, null, 2)}</pre>
      `,
      subject: 'Change Alert!',
      from_email: 'notify@webwatcher.io',
      from_name: 'WebWatcher',
      to: [{email}],
      tags: ['change-alert']
    };
    return new Promise((resolve, reject) => {
      this.mandrill.messages.send({message, async: false}, resolve, reject);
    })
    .then((res) => {
      log('Sent email to %s', chalk.yellow(email));
    })
    .catch((err) => {
      log('Failed to mail recipient="%s"', 'olouvignes@gmail.com');
      log(chalk.grey(err.stack));
    });
  }

  run() {
    const {email, phantomjs} = this.config;
    return Promise.bind(this)
      .then(phantomjs ? this.phantom : this.request)
      .then(this.parseData)
      .then(this.compareData)
      .then(this.handleChange)
      .then((changed) => {
        if (changed) {
          if (email) {
            this.sendEmail();
          }
          d('changed!', this.history);
        }
      })
      .delay(this.delay)
      .then(this.run);
  }
};
