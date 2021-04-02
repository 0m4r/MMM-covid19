/* Magic Mirror
 * Module: MMM-covid19
 *
 * By 0m4r
 *
 */

const NodeHelper = require('node_helper');
const request = require('request');
const { version } = require('./package.json');
const Log = require('../../js/logger.js');

module.exports = NodeHelper.create({
  interval: null,
  defaults: {
    updateInterval: 1 * 60 * 60 * 1000, // 1 hours
    countryCodes: [],
    world: true,
    live: true,
  },
  baseURL: 'https://api.covid19api.com',

  start: function () {
    Log.log('Starting node helper for: ' + this.name);
  },

  stop: function () {
    Log.log('Stopping node helper for: ' + this.name);
  },

  getFromTo: function (delta = 2) {
    const buildDate = function () {
      let d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    let to = buildDate();
    let from = buildDate();
    from.setDate(to.getDate() - delta);

    to = to.toISOString();
    from = from.toISOString();

    return { from, to };
  },

  fetchTotal: function (countryCodes = []) {
    Log.debug(this.name, 'fetchTotal', countryCodes);
    const requests = [];
    const qs = this.getFromTo();
    countryCodes.forEach((countryCode) => {
      const url = `${this.baseURL}/total/country/${countryCode}`;
      Log.debug(this.name, 'fetchTotal', url, JSON.stringify(qs));
      const req = new Promise((resolve, reject) =>
        request(
          {
            rejectUnauthorized: false,
            url,
            qs,
            method: 'GET',
          },
          (error, response, body) => {
            if (!error && response.statusCode === 200) {
              resolve({ countryCode, body: JSON.parse(body) });
            }
            Log.error(this.name, error);
            reject({ countryCode, body: [] });
          }
        )
      );

      requests.push(req);
    });

    Promise.all(requests)
      .then((res) => {
        this.sendSocketNotification('TOTAL_RESULTS', res);
      })
      .catch(() => this.sendSocketNotification('TOTAL_RESULTS', []));
  },

  fetchWorld: function () {
    const qs = this.getFromTo(1);
    const url = `${this.baseURL}/world`;
    Log.debug(this.name, 'fetchWorld', url, JSON.stringify(qs));
    request(
      {
        rejectUnauthorized: false,
        url,
        method: 'GET',
        qs,
      },
      (error, response, body) => {
        let results = {};
        if (
          body &&
          body !== 'null\n' &&
          !error &&
          response.statusCode === 200
        ) {
          results = JSON.parse(body)[0];
        }
        this.sendSocketNotification('WORLD_RESULTS', {
          countryCode: 'world',
          body: results,
        });
      }
    );
  },

  fetchVersion: function () {
    const url =
      'https://raw.githubusercontent.com/0m4r/MMM-covid19/main/package.json';
    Log.debug(this.name, 'fetchVersion', url);
    request(
      {
        rejectUnauthorized: false,
        url,
        method: 'GET',
      },
      (error, response, body) => {
        let remote = 0;
        if (!error && response.statusCode === 200) {
          const results = JSON.parse(body);
          remote = results.version || 0;
        }
        this.sendSocketNotification('VERSION_RESULTS', {
          local: version,
          remote,
        });
      }
    );
  },

  fetchAll: function (config) {
    config = {
      ...this.defaults,
      ...config,
    };
    clearInterval(this.interval);
    Log.log(this.name, 'fetchAll', JSON.stringify(config));
    this.interval = setInterval(() => {
      config.live && this.fetchTotal(config.countryCodes);
      config.world && this.fetchWorld();
      this.fetchVersion();
    }, config.updateInterval);
    config.live && this.fetchTotal(config.countryCodes);
    config.world && this.fetchWorld();
    this.fetchVersion();
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug(this.name, notification, JSON.stringify(payload));
    if (notification === 'CONFIG') {
      this.fetchAll(payload);
    }
    if (notification === 'GET_TOTAL') {
      this.fetchTotal(payload || []);
    }
    if (notification === 'GET_WORLD') {
      this.fetchWorld(payload || []);
    }
    if (notification === 'GET_VERSION') {
      this.fetchVersion(payload || null);
    }
  },
});
