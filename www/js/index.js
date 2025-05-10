// Cordova initialization wrapper
(function() {
    document.addEventListener('deviceready', function() {
        // Initialize plugins
        if (window.cordova.plugins.backgroundMode) {
            cordova.plugins.backgroundMode.enable();
        }

        // Start main app
        const app = new AppController();
        app.initialize();
    }, false);

    class AppController {
        initialize() {
            this.setupEventListeners();
            this.checkNetworkConnection();
        }

        setupEventListeners() {
            document.addEventListener('online', this.handleOnline, false);
            document.addEventListener('offline', this.handleOffline, false);
            document.addEventListener('resume', this.handleResume, false);
        }

        checkNetworkConnection() {
            if (navigator.connection.type === Connection.NONE) {
                this.showOfflineAlert();
            }
        }

        handleOnline() {
            console.log("Device came online");
            if (autoFetchInterval) startAutoDataFetch();
        }

        handleOffline() {
            console.warn("Device offline");
            stopAutoDataFetch();
        }

        handleResume() {
            console.log("App resumed");
            if (localStorage.getItem("extensionEnabled") !== "false") {
                startAutoDataFetch();
            }
        }
    }
})();