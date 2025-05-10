const Config = {
    API_ENDPOINTS: {
        OPTION_CHAIN: "https://www.mcxindia.com/market-data/option-chain",
        OPTION_DATA: "https://www.mcxindia.com/backpage.aspx/GetOptionChain"
    },
    REFRESH_INTERVAL: 10000, // 10 seconds
    DEFAULT_COMMODITIES: ["NATURALGAS", "CRUDEOIL"]
};

// For iOS/Android specific overrides
if (device.platform === 'iOS') {
    Config.REFRESH_INTERVAL = 15000; // Slower refresh on iOS
}