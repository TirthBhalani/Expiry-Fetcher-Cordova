document.addEventListener('deviceready', function() {
    // Initialize background mode
    cordova.plugins.backgroundMode.enable();
    cordova.plugins.backgroundMode.setDefaults({
        title: "Expiry Fetcher",
        text: "Updating commodity data",
        silent: true
    });

    // Start scheduled tasks
    scheduleDailyFetch();
});

function scheduleDailyFetch() {
    const now = new Date();
    let nextRun = new Date();
    
    // Set to 8 AM (market opening time)
    nextRun.setHours(8, 0, 0, 0);
    
    // If already past 8 AM, schedule for next day
    if (now > nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilNextRun = nextRun.getTime() - now.getTime();
    
    setTimeout(function() {
        fetchExpiryDates();
        // Reschedule
        scheduleDailyFetch();
    }, timeUntilNextRun);
}

async function fetchExpiryDates() {
    try {
        const response = await fetch("https://www.mcxindia.com/market-data/option-chain");
        const html = await response.text();
        const match = html.match(/var\s+vTick\s*=\s*(\[.*?\]);/);
        
        if (match) {
            const rawExpiryData = JSON.parse(match[1]);
            const expiryDataBySymbol = rawExpiryData.reduce((acc, item) => {
                acc[item.Symbol] = acc[item.Symbol] || [];
                acc[item.Symbol].push(item.ExpiryDate);
                return acc;
            }, {});
            
            localStorage.setItem("expiryData", JSON.stringify(expiryDataBySymbol));
            
            // Notify UI of update
            cordova.plugins.notification.local.schedule({
                title: "Data Updated",
                text: "Expiry dates refreshed successfully"
            });
        }
    } catch (error) {
        console.error("Background fetch error:", error);
    }
}