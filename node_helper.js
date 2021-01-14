/* Magic Mirror
 * Module: MMM-covid19
 *
 * By 0m4r
 *
 */

const NodeHelper = require('node_helper');
const request = require('request');
const { version } = require('./package.json')
const Log = require("../../js/logger.js");

module.exports = NodeHelper.create({

  start: function () {
    Log.log("Starting node helper for: " + this.name);
  },

  stop: function () {
    Log.log("Stopping node helper for: " + this.name);
  },

  getFromTo: function (delta = 2) {
    const buildDate = function () {
      let d = new Date();
      d.setUTCHours(0,0,0,0);
      return d
    }

    let to = buildDate()
    let from = buildDate()
    from.setDate(to.getDate() - delta);

    to = to.toISOString()
    from = from.toISOString()

    return { from, to }
  },

  fetchTotal: function (countryCodes = []) {
    const requests = []
    const qs = this.getFromTo()
    countryCodes.forEach(countryCode => {
      const url = `https://api.covid19api.com/total/country/${countryCode}`
      Log.log(this.name, 'fetchTotal', url, qs)
      const req = new Promise((resolve, reject) => request({
        rejectUnauthorized: false,
        url,
        qs,
        method: 'GET'
      }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          resolve({ countryCode, body: JSON.parse(body) })
        }
        reject({ countryCode, body: [] })
      }));

      requests.push(req);
    });

    Promise.all(requests)
      .then(res => {
        this.sendSocketNotification('TOTAL_RESULTS', res);
      })
      .catch(() => this.sendSocketNotification('TOTAL_RESULTS', []))

  },

  fetchWorld: function () {
    const qs = this.getFromTo(1)
    const url = "https://api.covid19api.com/world"
    Log.log(this.name, 'fetchWorld', url, qs)
    request({
      rejectUnauthorized: false,
      url,
      method: 'GET',
      qs,
    }, (error, response, body) => {
      let results = {}
      if (body && body !== 'null\n' && !error && response.statusCode == 200) {
        results = JSON.parse(body)[0]
      }
      this.sendSocketNotification('WORLD_RESULTS', { countryCode: 'world', body: results });
    });
  },

  fetchVersion: function () {
    const url = "https://raw.githubusercontent.com/0m4r/MMM-covid19/main/package.json"
    Log.log(this.name, 'fetchVersion', url)
    request({
      rejectUnauthorized: false,
      url,
      method: 'GET',
    }, (error, response, body) => {
      let remote = 0
      if (!error && response.statusCode == 200) {
        results = JSON.parse(body);
        remote = results.version || 0
      }
      this.sendSocketNotification('VERSION_RESULTS', { local: version, remote });
    });
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug(this.name, notification, payload)
    if (notification === 'GET_TOTAL') {
      this.fetchTotal(payload || []);
    }
    if (notification === 'GET_WORLD') {
      this.fetchWorld(payload || []);
    }
    if (notification === 'GET_VERSION') {
      this.fetchVersion(payload || null);
    }
  }
});
