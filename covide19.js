/* Magic Mirror
 * Module: MMM-Covid19
 *
 * By 0m4r
 * 
 */

Module.register("MMM-Covid19", {

    // Module config defaults.
    defaults: {
        updateInterval: 0 * 60 * 1000, // 1hour
    },
    
    getStyles: function() {
        return ["MMM-EARTH.css"];
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.scheduleUpdate();
    },

    getDom: function() {

        const wrapper = document.createElement("div");
        wrapper.className = "wrapper";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading";
            return wrapper;
        }
        wrapper.appendChild(earthPhoto);
        return wrapper;
    },

    scheduleUpdate: function() {
        setInterval(() => {
            this.getSummary();
        }, this.config.updateInterval);
        this.getSummary(this.config.initialLoadDelay);
    },


    getSummary: function() {
        this.sendSocketNotification('GET_SUMMARY', this.url);
    },


    socketNotificationReceived: function(notification, payload) {
        if (notification === "SUMMARY_RESULTS") {
            this.processEARTH(payload);
            this.loaded = true;
            this.results = payload
            console.log(this.payload)

        }
    },

});
