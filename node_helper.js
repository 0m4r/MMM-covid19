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
        countryCodes.forEach(country => {
            console.log(this.name, 'fetchLive', country)
            const req = new Promise((resolve, reject) => request({
                url: `https://api.covid19api.com/total/country/${country}`,
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

    socketNotificationReceived: function(notification, payload) {
        console.log(this.name, 'socketNotificationReceived', notification)
        if (notification === 'GET_LIVE') {
            this.fetchLive(payload);
        }
    }
});