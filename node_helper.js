/* Magic Mirror
 * Module: MMM-covid19
 *
 * By 0m4r
 *
 */

const NodeHelper = require('node_helper');
const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const { version } = require('./package.json');
const Log = require('../../js/logger.js');

module.exports = NodeHelper.create({
  interval: null,
  defaults: {
    countryCodes: ['DE', 'IT'],
    world: false,
    live: true,
    updateInterval: 24 * 60 * 60 * 1000, // 24 hours (only used if useScheduler=false)
    useScheduler: false,
    schedulerConfig: '0 0 */12 * * */1' //00 and 12 of every dayOfWeek (only used if useScheduler=true)
  },
  baseURL: 'https://corona.lmao.ninja/v2',
  scheduler: null,
  config: {},

  start: function () {
    Log.log('Starting node helper for: ' + this.name);
  },

  stop: function () {
    Log.log('Stopping node helper for: ' + this.name);
    if (this.scheduler !== null) {
      this.scheduler.cancel()
    }
  },

  fetchTotal: async function (countryCodes = []) {
    countryCodes.sort()
    Log.debug(this.name, 'fetchTotal', countryCodes);
    const url = new URL(`${this.baseURL}/countries/${countryCodes.join(',')}?yesterday=true&strict=true&`);
    Log.info(this.name, 'fetchTotal', url.href);
    let results = []
    const resp = await fetch(url);
    if (resp.status === 200) {
      const data = await resp.json();
      if (data) {
        results.push(data)
        results = [].concat.apply([], results).map(cc => ({
          body: [
            {
              country: cc.country,
              active: null,
              confirmed: cc.cases,
              recovered: cc.recovered,
              death: cc.deaths,
              test: null,
              date: new Date(cc.updated).toISOString()
            }, {
              country: cc.country,
              active: cc.active,
              confirmed: cc.todayCases,
              recovered: cc.todayRecovered,
              death: cc.todayDeaths,
              test: cc.tests,
              date: new Date(cc.updated).toISOString()
            }]
        }))
      }
    } else {
      Log.error(this.name, 'fetchTotal', countryCodes.join(','), resp);
      results = countryCodes.map(m => ({ countryCode: m, body: [] }))
    }
    this.sendSocketNotification(this.name + 'TOTAL_RESULTS', results)
  },

  fetchVersion: async function () {
    let remote = 0;
    const url = 'https://raw.githubusercontent.com/0m4r/MMM-covid19/main/package.json';
    Log.debug(this.name, 'fetchVersion', url);
    const resp = await fetch(url);
    if (resp.status === 200) {
      const data = await resp.json();
      remote = data.version || 0;
    }
    this.sendSocketNotification(this.name + 'VERSION_RESULTS', {
      local: version,
      remote,
    });
  },

  fetchAll: function (config = this.config) {
    Log.info(this.name, 'fetchAll', JSON.stringify(config));
    config.live && this.fetchTotal(config.countryCodes);
    this.fetchVersion();
  },

  fetchAllWithInterval: function () {
    try {
      clearInterval(this.interval);
      const fetch = () => {
        this.fetchAll();
        this.sendSocketNotification(this.name + 'NEXT_UPDATE', [new Date(), new Date(Date.now() + this.config.updateInterval)]);
        Log.info(this.name, 'fetchAllWithInterval| next execution scheduled for', new Date(Date.now() + this.config.updateInterval));
      }
      this.interval = setInterval(fetch, this.config.updateInterval);
      fetch();
    } catch (e) {
      Log.error(this.name, 'fetchAllWithInterval', e)
    }
  },

  fetchAllWithSchedule() {
    try {
      const schedule = require('node-schedule');
      if (this.scheduler !== null) {
        this.scheduler.cancel()
      }

      const fetch = () => {
        this.fetchAll();
        this.sendSocketNotification(this.name + 'NEXT_UPDATE', [new Date(), new Date(this.scheduler.nextInvocation())]);
        Log.info(this.name, 'fetchAllWithSchedule | next execution scheduled for:', new Date(this.scheduler.nextInvocation()).toLocaleString());
      }

      const scheduleConfig = this.config.schedulerConfig;
      this.scheduler = schedule.scheduleJob(scheduleConfig, fetch)
      fetch();
    } catch (e) {
      Log.error(this.name, 'fetchAllWithSchedule', e)
    }
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug(this.name, notification, JSON.stringify(payload));
    if (notification === this.name + 'CONFIG') {
      this.config = {
        ...this.defaults,
        ...payload,
      };
      Log.info(this.name, 'socketNotificationReceived', 'useScheduler:', payload.useScheduler);
      if (payload.useScheduler) {
        this.fetchAllWithSchedule(payload)
      } else {
        this.fetchAllWithInterval(payload);
      }

    }
  },
});
