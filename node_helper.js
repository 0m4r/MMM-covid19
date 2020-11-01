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

    start: function() {
        console.log("Stopping module: " + this.name);
    },

    fetchSummary: function(url) {
        console.log(this.name, 'fetchSummary')
        request({
            url: 'https://api.covid19api.com/summary',
            method: 'GET'
        }, (error, response, body) => {
            console.log(this.name, 'fetchSummary', error, response, body)
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
                console.log(this.name, 'fetchSummary', result)
                this.sendSocketNotification('SUMMARY_RESULTS', result);
            }
        });
    },

    socketNotificationReceived: function(notification, payload) {
        console.log(this.name, 'socketNotificationReceived', notification, payload)
        if (notification === 'GET_SUMMARY') {
            this.fetchSummary(payload);
        }
    }
});