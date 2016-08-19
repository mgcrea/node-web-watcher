# node-web-watcher

[![npm version](https://img.shields.io/npm/v/web-watcher.svg)](https://www.npmjs.com/package/web-watcher)
[![license](https://img.shields.io/github/license/mgcrea/node-web-watcher.svg?style=flat)](https://tldrlegal.com/license/mit-license) [![build status](http://img.shields.io/travis/mgcrea/node-web-watcher/master.svg?style=flat)](http://travis-ci.org/mgcrea/node-web-watcher) [![dependencies status](https://img.shields.io/david/mgcrea/node-web-watcher.svg?style=flat)](https://david-dm.org/mgcrea/node-web-watcher) [![devDependencies status](https://img.shields.io/david/dev/mgcrea/node-web-watcher.svg?style=flat)](https://david-dm.org/mgcrea/node-web-watcher#info=devDependencies) [![coverage status](http://img.shields.io/codeclimate/coverage/github/mgcrea/node-web-watcher.svg?style=flat)](https://codeclimate.com/github/mgcrea/node-web-watcher) [![climate status](https://img.shields.io/codeclimate/github/mgcrea/node-web-watcher.svg?style=flat)](https://codeclimate.com/github/mgcrea/node-web-watcher)
[![npm downloads](https://img.shields.io/npm/dm/web-watcher.svg)](https://www.npmjs.com/package/easyrsa)

NodeJS agent that monitors a web page and act upon changes.

## Usage

Install CLI globally

```bash
npm i -g webwatch
```

### Examples

1. Monitor `news.ycombinator.com` for scores update

```bash
webwatch text --url https://news.ycombinator.com --query ".score"
```

1. Monitor `status.github.com` for availability changes and send a mail using mandrill

```bash
webwatch text --url https://status.github.com --query "#graphs .graph:nth-child(2) .number" --mandrill-api-key abcdef --email foo@bar.com
```

### Help

```
$ webwatch --help
Usage: bin/webwatch <command> [options]

Commands:
  html   Watch a request html raw result
  text   Watch a request text result
  count  Watch a request count result
  sum    Watch a request sum'ed result

Options:
  -u, --url        Url to request                                     [required]
  -q, --query      Query to perform
  -d, --delay      Delay between queries
  -m, --mandrill   Mandrill API key
  -e, --email      Notified email
  -p, --phantomjs  Use PhantomJS
  -h, --help       Show help                                           [boolean]

Examples:
  bin/webwatch html -h http://google.com  Watch google homepage for changes

```


### Contributing

Please submit all pull requests the against master branch. If your unit test contains javascript patches or features, you should include relevant unit tests. Thanks!


### Available scripts

| **Script** | **Description** |
|----------|-------|
| start | Alias of test:watch |
| test | Run mocha unit tests |
| test:watch | Run and watch mocha unit tests |
| lint | Run eslint static tests |
| compile | Compile the library |
| compile:watch | Compile and watch the library |


## Authors

**Olivier Louvignes**

+ http://olouv.com
+ http://github.com/mgcrea


## Copyright and license

```
The MIT License

Copyright (c) 2016 Olivier Louvignes http://olouv.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

```
