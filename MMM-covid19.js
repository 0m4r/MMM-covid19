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

  start: function () {
    Log.info('Starting module ' + this.name);
    Log.debug('with config: ' + JSON.stringify(this.config));
    this.sendSocketNotification(this.name + 'CONFIG', this.config);
  },

  stop: function () {
    Log.info('Stopping module ' + this.name);
  },

  resume: function () {
    Log.info('Resuming module ' + this.name);
    Log.debug('with config: ' + JSON.stringify(this.config));
    this.sendSocketNotification('CONFIG', this.config);
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
      'COVID-19 numbers (powered by https://covid19api.com/)'
    );
    p_header.appendChild(p_header_text);
    wrapper.appendChild(p_header);

    const table = document.createElement('table');
    table.className = 'mmm-covid19-table';
    const tr = document.createElement('tr');

    const th_country = document.createElement('th');
    const text_country = document.createTextNode('Country');

    const th_active = document.createElement('th');
    const text_active = document.createTextNode('Active');

    const th_recovered = document.createElement('th');
    const text_recovered = document.createTextNode('Recovered');

    const th_deaths = document.createElement('th');
    const text_deaths = document.createTextNode('Deaths');

    const th_confirmed = document.createElement('th');
    const text_confirmed = document.createTextNode('Confirmed');

    table.appendChild(tr);
    th_country.appendChild(text_country);
    tr.appendChild(th_country);
    th_active.appendChild(text_active);
    tr.appendChild(th_active);
    th_recovered.appendChild(text_recovered);
    tr.appendChild(th_recovered);
    th_deaths.appendChild(text_deaths);
    tr.appendChild(th_deaths);
    th_confirmed.appendChild(text_confirmed);
    tr.appendChild(th_confirmed);

    const tr_headers = document.createElement('tr');
    table.appendChild(tr_headers);

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

    if (
      this.results &&
      this.results.length &&
      this.results[0] &&
      this.results[0].length === 2 &&
      'Date' in this.results[0][1] &&
      'Date' in this.results[0][0]
    ) {
      const p_footer_left = document.createElement('p');
      p_footer_left.classList.add('mmm-covid19-footer-left');
      p_footer.appendChild(p_footer_left);
      p_footer_left.appendChild(
        spanForFooter(
          'Data for: ' + new Date(this.results[0][0].Date).toLocaleString() + ' - ' + new Date(this.results[0][1].Date).toLocaleString(),
          'mmm-covid19-footer-dates'
        )
      );
      if (this.nextUpdate && this.nextUpdate[1]) {
        p_footer_left.appendChild(
          spanForFooter(
            'Next API request: ' + new Date(this.nextUpdate[1]).toLocaleString(),
            'mmm-covid19-footer-dates'
          )
        );
      }
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
            const text_country = document.createTextNode(c.Country);
            td_country.appendChild(text_country);
            td_country.rowSpan = 2;
            tr.appendChild(td_country);
          }

          const prepareTableCellData = (data) => {
            const td = document.createElement('td');
            let text = data;
            if (!isNaN(data)) {
              if (Number.prototype.toLocaleString) {
                text = data.toLocaleString();
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

          prepareTableCellData(c.Active);
          prepareTableCellData(c.Recovered);
          prepareTableCellData(c.Deaths);
          prepareTableCellData(c.Confirmed);
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
          notAvailable.Country = countryLabel;
          if (p.body.length <= 1) {
            results.push([notAvailable, notAvailable]);
          } else if (p.body.length === 1) {
            const pastDays = p.body.slice(Math.max(p.length - 2, 0));
            const last = pastDays[0];
            const present = {
              Country: last.Country,
              Active: last.Active,
              Confirmed: last.Confirmed,
              Recovered: last.Recovered,
              Deaths: last.Deaths,
              Date: last.Date,
            };
            results.push([present, notAvailable]);
          } else {
            const pastDays = p.body.slice(Math.max(p.length - 2, 0));
            const past = pastDays[0];
            const present = pastDays[1];
            const difference = {
              Country: present.Country,
              Active: present.Active - past.Active,
              Confirmed: present.Confirmed - past.Confirmed,
              Recovered: present.Recovered - past.Recovered,
              Deaths: present.Deaths - past.Deaths,
              Date: past.Date,
            };
            results.push([present, difference]);
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
      this.loaded = true,
        this.nextUpdate = payload;
      this.updateDom();
    }
  },

  getStyles: function () {
    return [this.file('css/style.css')];
  },
});
