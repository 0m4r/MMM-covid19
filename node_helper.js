/* Magic Mirror
 * Module: MMM-covid19
 *
 * By 0m4r
 * 
 */

const NodeHelper = require('node_helper');
const request = require('request');
const { version } = require('./package.json')

module.exports = NodeHelper.create({

  start: function () {
    console.log("Starting node helper for: " + this.name);
  },

  stop: function () {
    console.log("Stopping node helper for: " + this.name);
  },

  getFromTo: function (delta = 2) {

    const buildDate = function () {
      let d = new Date();
      d.setHours(0)
      d.setMinutes(0)
      d.setSeconds(0)
      d.setMilliseconds(0)
      return d
    }

    let to = buildDate()
    let from = buildDate()
    from.setDate(to.getDate() - delta);

    to = to.toISOString()
    from = from.toISOString()

    return { from, to }
  },

  fetchLive: function (countryCodes = []) {
    const requests = []

    countryCodes.forEach(countryCode => {
      const req = new Promise((resolve, reject) => request({
        rejectUnauthorized: false,
        url: `https://api.covid19api.com/total/country/${countryCode}`,
        qs: this.getFromTo(),
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
        this.sendSocketNotification('LIVE_RESULTS', res);
      })
      .catch(() => this.sendSocketNotification('LIVE_RESULTS', []))

  },

  fetchWorld: function () {
    request({
      rejectUnauthorized: false,
      url: "https://api.covid19api.com/world",
      method: 'GET',
      qs: this.getFromTo(1),
    }, (error, response, body) => {
      let results = {}
      if (body && body !== 'null\n' && !error && response.statusCode == 200) {
        results = JSON.parse(body)[0]
      }
      this.sendSocketNotification('WORLD_RESULTS', { countryCode: 'world', body: results });
    });
  },

  fetchVersion: function () {
    request({
      rejectUnauthorized: false,
      url: "https://raw.githubusercontent.com/0m4r/MMM-covid19/main/package.json",
      method: 'GET',
      qs: this.getFromTo(1),
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
    if (notification === 'GET_LIVE') {
      this.fetchLive(payload || []);
    }
    if (notification === 'GET_WORLD') {
      this.fetchWorld(payload || []);
    }
    if (notification === 'GET_VERSION') {
      this.fetchVersion(payload || null);
    }
  }
});
