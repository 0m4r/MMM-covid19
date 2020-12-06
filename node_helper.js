/* Magic Mirror
 * Module: MMM-COVID19
 *
 * By 0m4r
 * 
 */

const NodeHelper = require('node_helper');
const request = require('request');

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting module: " + this.name);
    },

    stop: function() {
        console.log("Stopping module: " + this.name);
    },  

    fetchLive: function(countryCodes = []) {
        const requests = []
        var to = new Date();
        var from = new Date()        
        from.setDate(to.getDate() - 1);

        countryCodes.forEach(country => {
            const req = new Promise((resolve, reject) => request({
                url: `https://api.covid19api.com/total/country/${country}?from=${from.toISOString()}&to=${to.toISOString()}`,
                method: 'GET'
            }, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    resolve(JSON.parse(body))
                }
                reject([])
            }));
            requests.push(req);
        });

        Promise.all(requests)
            .then(res => {
                this.sendSocketNotification('LIVE_RESULTS', res);
            })
            .catch(() => this.sendSocketNotification('LIVE_RESULTS', []))
        
    },

    fetchSummary: function() {
        request({
            url: "https://api.covid19api.com/summary",
            method: 'GET'
        }, (error, response, body) => {
            let results = []
            if (!error && response.statusCode == 200) {
                results = JSON.parse(body);
            }
            this.sendSocketNotification('SUMMARY_RESULTS', results);
        });
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_LIVE') {
            this.fetchLive(payload);
        }
        if (notification === 'GET_SUMMARY') {
            this.fetchSummary(payload);
        }
    }
});