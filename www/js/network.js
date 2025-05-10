class NetworkService {
    static async fetchWithRetry(url, options, retries = 3) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.fetchWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }

    static getOptionChainData(commodity, expiry) {
        return this.fetchWithRetry(Config.API_ENDPOINTS.OPTION_DATA, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "ExpiryFetcher/1.0"
            },
            body: JSON.stringify({ Commodity: commodity, Expiry: expiry })
        });
    }
}