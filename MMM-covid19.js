/* Magic Mirror
 * Module: MMM-covid19
 *
 * By 0m4r
 *
 */

Module.register('MMM-covid19', {
  summary: [],
  results: [],
  nextUpdate: [],
  version: null,
  notAvailable: '-',
  locale: null,

  start: function () {
    Log.info('Starting module ' + this.name);
    Log.info('with config: ' + JSON.stringify(this.config));
    this.sendSocketNotification(this.name + 'CONFIG', this.config);
    this.locale = navigator.language;
    if (![undefined, null].includes(this.config.locale)) {
      this.locale = this.config.locale
      Log.debug('using locale: ' + this.locale);
    }
  },

  stop: function () {
    Log.info('Stopping module ' + this.name);
  },

  resume: function () {
    Log.info('Resuming module ' + this.name);
    Log.info('with config: ' + JSON.stringify(this.config));
    this.sendSocketNotification('CONFIG', this.config);
    this.locale = navigator.language;
    if (![undefined, null].includes(this.config.locale)) {
      this.locale = this.config.locale
      Log.debug('using locale: ' + this.locale);
    }
  },

  getDom: function () {
    const wrapper = document.createElement('div');
    wrapper.className = 'mmm-covid19';

    if (!this.loaded) {
      wrapper.innerHTML = 'Loading...';
      return wrapper;
    }

    const p_header = document.createElement('p');
    p_header.className = 'mmm-covid19-header';
    const p_header_text = document.createTextNode(
      'powered by https://disease.sh/v3/covid-19/ and https://github.com/NovelCOVID/API'
    );
    p_header.appendChild(p_header_text);
    wrapper.appendChild(p_header);

    const table = document.createElement('table');
    table.className = 'mmm-covid19-table';
    const tr = document.createElement('tr');
    table.appendChild(tr);

    const createTableHeaders = (name) => {
      const th = document.createElement('th');
      const text = document.createTextNode(name);
      th.appendChild(text);
      tr.appendChild(th);
    }
    ['Country', 'Active', 'Recovered', 'Deaths', 'Confirmed', 'Tests'].forEach(th => createTableHeaders(th))

    wrapper.appendChild(table);

    const p_footer = document.createElement('p');
    p_footer.classList.add('mmm-covid19-footer');
    wrapper.appendChild(p_footer);

    const spanForFooter = (label, className) => {
      const span_footer = document.createElement('span');
      span_footer.classList.add(className);
      const span_footer_text = document.createTextNode(label);
      span_footer.appendChild(span_footer_text);
      return span_footer;
    };

    if (this.nextUpdate && this.nextUpdate[1]) {
      let date = new Date(this.nextUpdate[1])
      if (Date.prototype.toLocaleString) {
        date = date.toLocaleString(this.locale)
      }
      const p_footer_left = document.createElement('p');
      p_footer_left.classList.add('mmm-covid19-footer-left');
      p_footer.appendChild(p_footer_left);
      p_footer_left.appendChild(
        spanForFooter(
          'Next API request: ' + date,
          'mmm-covid19-footer-dates'
        )
      );
    }

    if (this.version && 'local' in this.version && 'remote' in this.version) {
      const p_footer_right = document.createElement('p');
      p_footer_right.classList.add('mmm-covid19-footer-right');
      p_footer.appendChild(p_footer_right);
      p_footer_right.appendChild(
        spanForFooter(
          'installed version:' + this.version.local,
          'mmm-covid19-footer-version'
        )
      );
      p_footer_right.appendChild(spanForFooter(' '));
      p_footer_right.appendChild(
        spanForFooter(
          'latest version:' + this.version.remote,
          'mmm-covid19-footer-version'
        )
      );
      if (this.version.local !== this.version.remote) {
        p_footer_right.classList.add('mmm-covid19-footer-version-update');
      }
    }

    const buildTableRows = () => {
      [...this.summary, ...this.results].forEach((i) => {
        i.forEach((c, index) => {
          const tr = document.createElement('tr');
          tr.className =
            index === 0 ? 'mmm-covid19-row-totals' : 'mmm-covid19-row-deltas';
          if (index === 0) {
            const td_country = document.createElement('td');
            const text_country = document.createTextNode(c.country);
            const td_div = document.createElement('div');
            let date = new Date(c.date)
            if (Date.prototype.toLocaleString) {
              date = date.toLocaleString(this.locale)
            }
            const text_div = document.createTextNode(date);
            td_div.appendChild(text_div);
            td_country.appendChild(text_country);
            td_country.appendChild(td_div);
            td_country.rowSpan = 2;
            tr.appendChild(td_country);
          }

          const prepareTableCellData = (data) => {
            const td = document.createElement('td');
            let text = data;
            if (!isNaN(data)) {
              if (Number.prototype.toLocaleString) {
                text = [null, undefined].includes(data) ? this.notAvailable : Math.abs(data).toLocaleString(this.locale);
              }
              td.className =
                index === 0
                  ? 'mmm-covid19-total'
                  : parseFloat(data) >= 0
                    ? 'mmm-covid19-delta-increase'
                    : 'mmm-covid19-delta-decrease';
            }
            td.appendChild(document.createTextNode(text));
            tr.appendChild(td);
          };

          prepareTableCellData(c.active);
          prepareTableCellData(parseFloat(c.recovered) * -1);
          prepareTableCellData(c.death);
          prepareTableCellData(c.confirmed);
          prepareTableCellData(c.test);
          table.appendChild(tr);
        });
      });
    };

    buildTableRows();
    return wrapper;
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug(this.name, 'socketNotificationReceived', notification);
    Log.debug(this.name, 'socketNotificationReceived', JSON.stringify(payload));

    if (notification === this.name + 'VERSION_RESULTS') {
      this.loaded = true;
      this.version = {};
      if (payload && Object.keys(payload).length > 0) {
        this.version = payload;
      }
      this.updateDom();
    }

    if (notification === this.name + 'TOTAL_RESULTS') {
      this.loaded = true;
      this.results = [];
      if (payload && payload.length > 0) {
        const results = [];
        const notAvailable = {
          Country: '',
          Active: this.notAvailable,
          Confirmed: this.notAvailable,
          Recovered: this.notAvailable,
          Deaths: this.notAvailable,
        };
        payload.forEach((p) => {
          const countryLabel =
            (p.body[0] && p.body[0].Country) || p.countryCode;
          notAvailable.country = countryLabel;
          if (p.body.length <= 1) {
            results.push([p.body[0], notAvailable]);
          } else if (p.body.length === 2) {
            results.push(p.body);
          }
        });
        this.results = results;
      }
      this.updateDom();
    }

    if (notification === this.name + 'WORLD_RESULTS') {
      this.loaded = true;
      this.summary = [];
      let difference = {
        Country: 'World',
        Active: this.notAvailable,
        Confirmed: this.notAvailable,
        Recovered: this.notAvailable,
        Deaths: this.notAvailable,
        Date: this.notAvailable,
      };

      let present = {
        ...difference,
        Country: 'World',
      };

      if (payload && payload.body && Object.keys(payload.body).length > 0) {
        difference = {
          Country: 'World',
          Active:
            parseFloat(payload.body.NewConfirmed) -
            parseFloat(payload.body.NewRecovered) -
            parseFloat(payload.body.NewDeaths),
          Confirmed: payload.body.NewConfirmed,
          Recovered: payload.body.NewRecovered,
          Deaths: payload.body.NewDeaths,
          Date: this.notAvailable,
        };

        present = {
          Country: 'World',
          Active:
            parseFloat(payload.body.TotalConfirmed) -
            parseFloat(payload.body.TotalRecovered) -
            parseFloat(payload.body.TotalDeaths),
          Confirmed: payload.body.TotalConfirmed,
          Recovered: payload.body.TotalRecovered,
          Deaths: payload.body.TotalDeaths,
          Date: this.notAvailable,
        };
      }
      this.summary = [[present, difference]];
      this.updateDom();
    }

    if (notification === this.name + 'NEXT_UPDATE') {
      this.loaded = true;
      this.nextUpdate = payload;
      this.updateDom();
    }
  },

  getStyles: function () {
    return [this.file('css/style.css')];
  },
});
