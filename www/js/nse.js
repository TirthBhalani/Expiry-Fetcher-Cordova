// NSE Data Manager (Using Cordova Advanced HTTP Plugin)
// Required plugins:
// cordova plugin add cordova-plugin-advanced-http
// cordova plugin add cordova-plugin-network-information

const NSE = {
    interval: 30000, // 30 seconds
    lastUpdated: {},
    cloudflareWorkerUrl: 'https://bold-tooth-5412.tirthlogin.workers.dev/', // Your Cloudflare Worker URL
    
    init() {
        // Configure the HTTP plugin
        cordova.plugin.http.setDataSerializer('json');
        
        // Allow self-signed certificates in development
        // cordova.plugin.http.setSSLCertMode('nocheck');
        
        // Start data fetching immediately
        this.fetchAllData();
        
        // Set up interval for regular updates
        setInterval(() => this.fetchAllData(), this.interval);
        
        console.log('NSE Data Manager initialized with Cloudflare Worker:', this.cloudflareWorkerUrl);
    },

    async fetchAllData() {
        await Promise.all([
            this.fetchIndexData('NIFTY'),
            this.fetchIndexData('NIFTY')
        ]);
    },

    async fetchIndexData(symbol) {
        const index = symbol.toLowerCase();

        try {
            this.showLoading(index, true);
            const startTime = Date.now();

            // Make request to Cloudflare Worker instead of directly to NSE
            return new Promise((resolve, reject) => {
                const headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    // The Cloudflare Worker handles the complex headers for NSE
                };
                
                // We can add a query parameter to specify which index we want
                const url = `${this.cloudflareWorkerUrl}`;
                
                console.log(`Fetching data from Cloudflare Worker for ${symbol}...`);
                
                // Make the API request to the Cloudflare Worker
                cordova.plugin.http.get(
                    url,
                    {}, // No parameters in body
                    headers,
                    response => {
                        try {
                            // Parse the JSON response
                            const data = JSON.parse(response.data);
                            
                            if (!data || !data.filtered) {
                                throw new Error('Invalid data structure returned from worker');
                            }
                            
                            console.log(`Received ${symbol} data from Cloudflare Worker:`, data);
                            this.updateDisplay(index, data.filtered, Date.now() - startTime);
                            resolve(data);
                        } catch (error) {
                            console.error(`Failed to parse ${symbol} data:`, error);
                            this.showError(index, { message: 'Invalid data format' });
                            reject(error);
                        }
                    },
                    error => {
                        console.error(`${symbol} HTTP error:`, error.status, error.error);
                        this.showError(index, { 
                            message: `Worker Error (${error.status}): ${error.error || 'Unknown error'}` 
                        });
                        reject(error);
                    }
                );
            });
        } catch (error) {
            console.error(`${symbol} fetch error:`, error);
            this.showError(index, error);
        } finally {
            this.showLoading(index, false);
        }
    },

    updateDisplay(index, data, latency) {
        if (!data || !data.CE || !data.PE) {
            console.error(`Invalid data structure for ${index}:`, data);
            this.showError(index, { message: 'Invalid data structure' });
            return;
        }
        
        // Update UI with received data
        document.getElementById(`${index}CeOi`).textContent = data.CE.totOI.toLocaleString();
        document.getElementById(`${index}CeVol`).textContent = data.CE.totVol.toLocaleString();
        document.getElementById(`${index}PeOi`).textContent = data.PE.totOI.toLocaleString();
        document.getElementById(`${index}PeVol`).textContent = data.PE.totVol.toLocaleString();

        // Update timestamp
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        document.getElementById(`${index}LastUpdated`).textContent = `Last updated: ${timeString} (${latency}ms)`;

        console.log(`${index} data updated. Latency: ${latency}ms`);
        this.highlightValues(index);
    },

    highlightValues(index) {
        // Implement your highlighting logic here
        // Compare current values with previous values and highlight changes
        
        // Simple example:
        const elements = [`${index}CeOi`, `${index}CeVol`, `${index}PeOi`, `${index}PeVol`];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Briefly add and then remove highlight class
                el.classList.add('highlight-change');
                setTimeout(() => {
                    el.classList.remove('highlight-change');
                }, 1000);
            }
        });
    },

    showLoading(index, show) {
        const elements = [`${index}CeOi`, `${index}CeVol`, `${index}PeOi`, `${index}PeVol`];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (show) {
                    el.dataset.previousText = el.textContent;
                    el.textContent = "Loading...";
                    el.classList.add('loading-text');
                    el.classList.remove('value-box');
                } else if (el.textContent === "Loading...") {
                    // Only restore if still showing loading
                    el.classList.remove('loading-text');
                    el.classList.add('value-box');
                }
            }
        });
    },

    showError(index, error) {
        const errorMessage = error.message || "Failed to load";
        console.error(`Error displaying ${index} data:`, errorMessage);
        document.getElementById(`${index}LastUpdated`).textContent = `Error: ${errorMessage}`;
        document.getElementById(`${index}LastUpdated`).classList.add('error-text');
    }
};

// Initialize when device is ready
document.addEventListener('deviceready', () => {
    console.log('Device ready, initializing NSE data manager');
    NSE.init();
}, false);