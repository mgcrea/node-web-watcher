# node-web-watcher


## Quickstart

Install globally

`npm i -g webwatch`

Run a watcher

`bin/webwatch text --url https://news.ycombinator.com --query ".score" --mandrill-api-key abcdef --email foo@bar.com`


## Help

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

Copyright 2015
```
