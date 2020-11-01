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

    getSummary: function(url) {
        request({
            url: 'https://api.covid19api.com/summary',
            method: 'GET'
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
                if (result.length > 0) {
                    this.sendSocketNotification('SUMMARY_RESULTS', result);
                }
            }
        });
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'SUMMARY_RESULTS') {
            this.getSummary(payload);
        }
    }
});