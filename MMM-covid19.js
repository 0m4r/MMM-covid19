/* Magic Mirror
 * Module: MMM-covid19
 *
 * By 0m4r
 * 
 */

Module.register("MMM-covid19", {

  summary: [],
  results: [],
  version: null,
  interval: null,

  // Module config defaults.
  defaults: {
    updateInterval: 24 * 60 * 60 * 1000, // 24 hours
    countryCodes: ["DE", "IT"],
    world: false,
    live: true,
    debug: false
  },

  start: function () {
    Log.info("Starting module " + this.name);
    this.debug && Log.info("with config: " + JSON.stringify(this.config));
    this.scheduleUpdate();
  },

  stop: function () {
    Log.info("Stopping module " + this.name);
    clearInterval(this.interval)
  },

  resume: function () {
    Log.info("Resuming module " + this.name);
    this.debug && Log.info("with config: " + JSON.stringify(this.config));
    this.scheduleUpdate();
  },

  suspend: function () {
    Log.info("Suspending module " + this.name);
    clearInterval(this.interval)
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-covid19";

    if (!this.loaded) {
      wrapper.innerHTML = "Loading...";
      return wrapper;
    }

    const p_header = document.createElement("p")
    p_header.className = "mmm-covid19-header";
    const p_header_text = document.createTextNode("Daily COVID-19 numbers (provided by https://covid19api.com/)")
    p_header.appendChild(p_header_text)
    wrapper.appendChild(p_header)

    const table = document.createElement("table")
    table.className = "mmm-covid19-table"
    const tr = document.createElement("tr")

    const th_country = document.createElement("th")
    const text_country = document.createTextNode("Country")

    const th_active = document.createElement("th")
    const text_active = document.createTextNode("Active")

    const th_recovered = document.createElement("th")
    const text_recovered = document.createTextNode("Recovered")

    const th_deaths = document.createElement("th")
    const text_deaths = document.createTextNode("Deaths")

    const th_confirmed = document.createElement("th")
    const text_confirmed = document.createTextNode("Confirmed")

    table.appendChild(tr)
    th_country.appendChild(text_country)
    tr.appendChild(th_country)
    th_active.appendChild(text_active)
    tr.appendChild(th_active)
    th_recovered.appendChild(text_recovered)
    tr.appendChild(th_recovered)
    th_deaths.appendChild(text_deaths)
    tr.appendChild(th_deaths)
    th_confirmed.appendChild(text_confirmed)
    tr.appendChild(th_confirmed)

    const tr_headers = document.createElement('tr')
    table.appendChild(tr_headers)

    wrapper.appendChild(table)

    if (this.version && 'local' in this.version && 'remote' in this.version) {
      const p_footer = document.createElement("p")
      p_footer.classList.add("mmm-covid19-footer");
      if (this.version.local !== this.version.remote) {
        p_footer.classList.add("mmm-covid19-footer-version-update");
      }
      const p_footer_text = document.createTextNode("installed version: " + this.version.local + " | latest version: " + this.version.remote)
      p_footer.appendChild(p_footer_text)
      wrapper.appendChild(p_footer)
    }

    const buildTableRows = () => { 
      [...this.summary, ...this.results].forEach(i => {
        i.forEach((c, index) => {
          const tr = document.createElement("tr")
          tr.className = index === 0 ? 'mmm-covid19-row-totals' : 'mmm-covid19-row-deltas'
          if (index === 0) {
            const td_country = document.createElement("td")
            const text_country = document.createTextNode(c.Country)
            td_country.appendChild(text_country)
            td_country.rowSpan = 2
            tr.appendChild(td_country)
          }

          const prepareTableCellData = (data) => {
            const td = document.createElement("td")
            let text = data
            if (!isNaN(data)) {
              if (Number.prototype.toLocaleString) {
                text = data.toLocaleString()
              }
              td.className = index === 0 ? 'mmm-covid19-total' : parseFloat(data) >= 0 ? 'mmm-covid19-delta-increase' : 'mmm-covid19-delta-decrease'
            }
            td.appendChild(document.createTextNode(text))
            tr.appendChild(td)
          }

          prepareTableCellData(c.Active)
          prepareTableCellData(c.Recovered)
          prepareTableCellData(c.Deaths)
          prepareTableCellData(c.Confirmed)
          table.appendChild(tr)
        });
      });
    }

    buildTableRows();
    return wrapper;
  },

  scheduleUpdate: function () {
    this.interval = setInterval(() => {
      this.config.live && this.getLive();
      this.config.world && this.getWorld();
      this.getVersion();
    }, this.config.updateInterval);
    this.config.live && this.getLive();
    this.config.world && this.getWorld();
    this.getVersion();
  },

  getLive: function () {
    this.debug && Log.info(this.name, 'getLive')
    this.sendSocketNotification('GET_LIVE', this.config.countryCodes);
  },

  getWorld: function () {
    this.debug && Log.info(this.name, 'getWorld')
    this.sendSocketNotification('GET_WORLD');
  },

  getVersion: function () {
    this.debug && Log.info(this.name, 'getVersion')
    this.sendSocketNotification('GET_VERSION');
  },

  socketNotificationReceived: function (notification, payload) {
    this.debug && Log.info(this.name, 'socketNotificationReceived', notification)
    this.debug && Log.info(this.name, 'socketNotificationReceived', payload)

    if (notification === "VERSION_RESULTS") {
      this.loaded = true
      this.version = {}
      if (payload && Object.keys(payload).length > 0) {
        this.version = payload
      }
      this.updateDom()
    }

    if (notification === "LIVE_RESULTS") {
      this.loaded = true
      this.results = []
      if (payload && payload.length > 0) {
        const results = []
        payload.forEach(p => {
          if (p.body.length < 2) {
            const countryLabel = p.bod[0] && p.body[0].Country || p.countryCode
            const notAvailable = {
              Country: countryLabel,
              Active: '-',
              Confirmed: '-',
              Recovered: '-',
              Deaths: '-'
            }
            results.push([notAvailable, notAvailable])
          } else {
            const pastDays = p.body.slice(Math.max(p.length - 2, 0))
            const past = pastDays[0]
            const present = pastDays[1]
            const difference = {
              Country: present.Country,
              Active: present.Active - past.Active,
              Confirmed: present.Confirmed - past.Confirmed,
              Recovered: present.Recovered - past.Recovered,
              Deaths: present.Deaths - past.Deaths
            }
            results.push([present, difference])
          }
        })
        this.results = results
      }
      this.updateDom()
    }

    if (notification === "WORLD_RESULTS") {
      this.loaded = true
      this.summary = []
      let difference = {
        Country: 'World',
        Active: '-',
        Confirmed: '-',
        Recovered: '-',
        Deaths: '-'
      }

      let present = {
        Country: 'World',
        Active: '-',
        Confirmed: '-',
        Recovered: '-',
        Deaths: '-'
      }

      if (payload && payload.body && Object.keys(payload.body).length > 0) {
        difference = {
          Country: 'World',
          Active: parseFloat(payload.body.NewConfirmed) - parseFloat(payload.body.NewRecovered) - parseFloat(payload.body.NewDeaths),
          Confirmed: payload.body.NewConfirmed,
          Recovered: payload.body.NewRecovered,
          Deaths: payload.body.NewDeaths
        }

        present = {
          Country: 'World',
          Active: parseFloat(payload.body.TotalConfirmed) - parseFloat(payload.body.TotalRecovered) - parseFloat(payload.body.TotalDeaths),
          Confirmed: payload.body.TotalConfirmed,
          Recovered: payload.body.TotalRecovered,
          Deaths: payload.body.TotalDeaths
        }
      }
      this.summary = [[present, difference]]
      this.updateDom()
    }
  },

  getStyles: function () {
    return [
      this.file("css/style.css")
    ];
  }

});
