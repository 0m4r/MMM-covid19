/* Magic Mirror
 * Module: MMM-Covid19
 *
 * By 0m4r
 * 
 */

Module.register("MMM-covid19", {

    // Module config defaults.
    defaults: {
        updateInterval: 1 * 60 * 60 *1000, // 1 hour
        countryCodes: ["DE", "IT"]
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        Log.info("with config: " + JSON.stringify(this.config));
        this.scheduleUpdate();
    },

    getDom: function() {
        Log.info(this.name, 'getDom', JSON.stringify(this.results))
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-covid19";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            return wrapper;
        }

        const p_header = document.createElement("p")
        p_header.className = "mmm-covid19-header";
        const p_header_text = document.createTextNode("Confirmed number of COVID-19 infections")
        p_header.appendChild(p_header_text)
        wrapper.appendChild(p_header)

        const table = document.createElement("table")
        table.className = "mmm-covid19-table"
        const tr = document.createElement("tr")
        const th_country = document.createElement("th")
        const text_country = document.createTextNode("Country")
        const th_new = document.createElement("th")
        const text_new = document.createTextNode("New")
        const th_total = document.createElement("th")
        const text_total = document.createTextNode("Total")

        table.appendChild(tr)
        th_country.appendChild(text_country)
        tr.appendChild(th_country)
        th_new.appendChild(text_new)
        tr.appendChild(th_new)
        th_total.appendChild(text_total)
        tr.appendChild(th_total)
        wrapper.appendChild(table)

        const countries = this.results.Countries

        console.log(this.name, this.results.Countries)

        countries.forEach(c => {
            const tr = document.createElement("tr")
            const td_country = document.createElement("td")
            const text_country = document.createTextNode(c.Country)
            const td_new = document.createElement("td")
            const text_new = document.createTextNode(c.NewConfirmed)
            const td_total = document.createElement("td")
            const text_total = document.createTextNode(c.TotalConfirmed)

            td_country.appendChild(text_country)
            tr.appendChild(td_country)
            td_new.appendChild(text_new)
            tr.appendChild(td_new)
            td_total.appendChild(text_total)
            tr.appendChild(td_total)
            table.appendChild(tr)
        });

        const p = document.createElement("p")
        p.className = "mmm-covid19-last-update";
        const p_text = document.createTextNode("Data last updated on: " + new Date(this.results.Date))
        p.appendChild(p_text)
        wrapper.appendChild(p)

        return wrapper;
    },

    scheduleUpdate: function() {
        Log.info(this.name, 'scheduleUpdate')
        setInterval(() => {
            this.getSummary();
        }, this.config.updateInterval);
        this.getSummary();
    },

    getSummary: function() {
        Log.info(this.name, 'getSummary')
        this.sendSocketNotification('GET_SUMMARY');
    },

    socketNotificationReceived: function(notification, payload) {
        Log.info(this.name, 'socketNotificationReceived', notification, payload)
        if (notification === "SUMMARY_RESULTS") {
            this.loaded = true;
            const toInclude = this.config.countryCodes
            console.log(toInclude)
            const countries = payload.Countries.filter(r => toInclude.includes(r.CountryCode))
            this.results = {
                ...payload,
                Countries: countries
            }
            Log.info(this.name, 'socketNotificationReceived', this.results)
            this.updateDom()
        }
    },

    getStyles: function () {
        return  [
            this.file("css/style.css")
        ];
    }

});
