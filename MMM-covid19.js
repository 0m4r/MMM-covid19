/* Magic Mirror
 * Module: MMM-Covid19
 *
 * By 0m4r
 * 
 */

Module.register("MMM-covid19", {

    summary: [],
    results: [],

    // Module config defaults.
    defaults: {
        updateInterval: 1 * 60 * 60 * 1000, // 1 hour
        countryCodes: ["DE", "IT"],
        world: false,
        live: true
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        Log.info("with config: " + JSON.stringify(this.config));
        this.scheduleUpdate();
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
        const p_header_text = document.createTextNode("Live COVID-19 numbers (provided by https://covid19api.com/)")
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

        this.summary.forEach((c, index) => {
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
                console.log(text)
                td.appendChild(document.createTextNode(text))
                tr.appendChild(td)
            }

            prepareTableCellData(c.Active)
            prepareTableCellData(c.Recovered)
            prepareTableCellData(c.Deaths)
            prepareTableCellData(c.Confirmed)
            table.appendChild(tr)
        });


        this.results.forEach((r, i) => {
            r.forEach((c, index) => {
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
                    console.log(text)
                    td.appendChild(document.createTextNode(text))
                    tr.appendChild(td)
                }

                prepareTableCellData(c.Active)
                prepareTableCellData(c.Recovered)
                prepareTableCellData(c.Deaths)
                prepareTableCellData(c.Confirmed)
                table.appendChild(tr)
            })
        });

        return wrapper;
    },

    scheduleUpdate: function () {
        Log.info(this.name, 'scheduleUpdate', this.config.updateInterval)
        setInterval(() => {
            Log.info(this.name, 'scheduleUpdate', this.config.updateInterval)
            this.config.live && this.getLive();
            this.config.world && this.getSummary();
        }, this.config.updateInterval);
        this.config.live && this.getLive();
        this.config.world && this.getSummary();
    },

    getLive: function () {
        Log.info(this.name, 'getLive')
        this.sendSocketNotification('GET_LIVE', this.config.countryCodes);
    },

    getSummary: function () {
        Log.info(this.name, 'getSummary')
        this.sendSocketNotification('GET_SUMMARY');
    },

    socketNotificationReceived: function (notification, payload) {
        Log.info(this.name, 'socketNotificationReceived', notification)

        if (notification === "LIVE_RESULTS") {
            this.loaded = true
            const results = []
            payload.forEach(p => {
                const pastDays = p.slice(Math.max(p.length - 2, 0))
                const past = pastDays[0]
                const present = pastDays[1]
                const difference = {
                    Country: present.Country,
                    Active: present.Active - past.Active,
                    Confirmed: present.Confirmed - past.Confirmed,
                    Recovered: present.Recovered - past.Recovered,
                    Deaths: present.Deaths - past.Deaths
                }
                pastDays.push(difference)
                results.push([present, difference])
            })
            this.results = results
            this.updateDom()
        }

        if (notification === "SUMMARY_RESULTS") {
            this.loaded = true

            const difference = {
                Country: 'World',
                Active: 'New',
                Confirmed: payload.Global.NewConfirmed,
                Recovered: payload.Global.NewRecovered,
                Deaths: payload.Global.NewDeaths
            }

            const present = {
                Country: 'Summary',
                Active: 'Total',
                Confirmed: payload.Global.TotalConfirmed,
                Recovered: payload.Global.TotalRecovered,
                Deaths: payload.Global.TotalDeaths
            }

            this.summary = [present, difference]
            this.updateDom()
        }
    },

    getStyles: function () {
        return [
            this.file("css/style.css")
        ];
    }

});
