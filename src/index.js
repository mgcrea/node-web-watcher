'use strict';

var Promise = require('bluebird');
var mandrill = require('mandrill-api/mandrill');
var requestAsync = Promise.promisify(require('request'));
var cheerio = require('cheerio');
var chalk = require('chalk');
var differ = require('node-diff');
var phantom = require('phantom');
var log = console.log.bind(console);
var _ = require('lodash');

exports.WebWatcher = class WebWatcher {

  constructor(config = {}) {
    this._config = _.defaults(config, {host: 'http://google.com', type: 'GET', query: 'html', delay: 5000});
    if(config.mandrillApiKey) {
      this.mandrill = new mandrill.Mandrill(config.mandrillApiKey);
    }
    this.run();
  }

  get history() {
    return this._history || (this._history = []);
  }

  get delay() {
    return (this._config.delay / 2) + Math.floor(Math.random() * (this._config.delay / 2));
  }

  _phantom() {
    const config = this._config;

    let time = Date.now();
    return new Promise((resolve, reject) => {
      phantom.create((ph) => {
        ph.createPage((page) => {
          page.set('settings.userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25')
          page.open(config.url, (status) => {
            log('PhantomJS returned with %s-statusCode in %s-ms.', chalk.cyan(status), chalk.magenta(Date.now() - time));
            page.evaluate(() => document.documentElement.outerHTML, (html) => {
              ph.exit();
              resolve(html);
            });
          });
        });
      });
    });
  }

  _request() {
    const config = this._config;

    let time = Date.now();
    return requestAsync({
        type: config.type,
        url : config.url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'
        }
      })
      .spread((res, data) => {
        log('Request returned with %s-statusCode in %s-ms.', chalk.cyan(res.statusCode), chalk.magenta(Date.now() - time));
        return data;
      })
      .catch((err) => {
        log('Failed to request host="%s"', config.host);
        log(chalk.grey(err.stack));
      });
  }

  _parseData(data) {
    const config = this._config;
    const command = config._[0];

    let $ = cheerio.load(data);
    let query = $(config.query || 'html');
    log('Found %s-element%s matching query "%s".', chalk.cyan(query.length), query.length !== 1 ? 's' : '', chalk.yellow(config.query));

    switch (command) {
      case 'html':
        return query.map(function(i, el) {
          return $(el).html();
        }).get().join('\n');
      case 'text':
        return query.map(function(i, el) {
          return $(el).text();
        }).get().join('\n');
      case 'count':
        return _.size(query);
      case 'sum':
        return _.sum(query.map(function(i, el) {
          return _.parseInt($(el).text());
        }).get());
      default:
        throw new Error('Unsupported command ' + command);
    }
  }

  _compareData(data) {
    const config = this._config;

    if (!this.history.length) {
      log('Found pristine data:\n' + chalk.grey(data));
      let diff = differ('', String(data));
      this.history.push({date: new Date(), count: 1, diff: diff, data: data});
      return false;
    } else {
      let last = _.last(this.history);
      if (last.data == data) {
        log('Found same data, %s-ms elapsed...', chalk.cyan(Date.now() - last.date));
        last.count++;
        return false;
      } else {
        let diff = differ(String(last.data), String(data));
        this.history.push({date: new Date(), count: 1, diff: diff, data: data});
        return true;
      }
    }
  }

  _sendEmail() {
    const config = this._config;

    let last = _.last(this.history);
    let message = {
      html: [
        '<h2>Diff</h2><p>' + last.diff.replace(/\n/g, '<br>') + '<p>',
        '<h2>Config</h2><pre>' + JSON.stringify(_.pick(config, 'email', 'url', 'query'), null, 2)  + '</pre>',
        '<h2>History</h2><pre>' + JSON.stringify(this.history, null, 2) + '</pre>'
      ].join(''),
      subject: 'Change Alert!',
      from_email: 'notify@webwatcher.io',
      from_name: 'WebWatcher',
      to: [{email: config.email}],
      tags: ['change-alert']
    };
    return new Promise((resolve, reject) => {
        this.mandrill.messages.send({message: message, async: false}, resolve, reject)
      })
      .then((res) => {
        log('Sent email to %s', chalk.yellow(config.email));
      })
      .catch((err) => {
        log('Failed to mail recipient="%s"', 'olouvignes@gmail.com');
        log(chalk.grey(err.stack));
      });
  }

  run() {
    const config = this._config;

    return Promise.bind(this)
      .then(config.phantomjs ? this._phantom : this._request)
      .then(this._parseData)
      .then(this._compareData)
      .then(this._handleChange)
      .then((changed) => {
        if (changed) {
          if (config.email) {
            this._sendEmail();
          }
          d('changed!', this.history);
        }
      })
      .delay(this.delay)
      .then(this.run);
  }

}
