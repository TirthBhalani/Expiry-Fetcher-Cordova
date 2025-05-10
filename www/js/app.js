document.addEventListener('deviceready', onDeviceReady, false);

let activeCommodities = ["NATURALGAS", "CRUDEOIL"];
let autoFetchInterval;

function onDeviceReady() {
    console.log('Cordova is ready');
    initApp();
}

function initApp() {
    initToggleSwitch();
    loadInitialData();
}

// Toggle Switch Functions
function initToggleSwitch() {
    const toggleSwitch = document.getElementById("toggleExtension");
    const toggleStatus = document.getElementById("toggleStatus");
    
    const isEnabled = localStorage.getItem("extensionEnabled") !== "false";
    toggleSwitch.checked = isEnabled;
    toggleStatus.innerText = isEnabled ? "ON" : "OFF";
    
    toggleSwitch.addEventListener("change", function() {
        const isEnabled = this.checked;
        toggleStatus.innerText = isEnabled ? "ON" : "OFF";
        localStorage.setItem("extensionEnabled", isEnabled);
        
        if (isEnabled) startAutoDataFetch();
        else stopAutoDataFetch();
    });
    
    if (isEnabled) startAutoDataFetch();
}

// Data Loading Functions
function loadInitialData() {
    const savedExpiryData = localStorage.getItem("expiryData");
    const savedActiveCommodities = localStorage.getItem("activeCommodities");
    
    if (savedExpiryData) {
        const expiryData = JSON.parse(savedExpiryData);
        loadCommodities(expiryData);
        
        if (savedActiveCommodities) {
            activeCommodities = JSON.parse(savedActiveCommodities);
        }
        highlightTabs(activeCommodities[0], activeCommodities[1]);
    } else {
        fetchExpiryData().then(expiryData => {
            if (expiryData) loadCommodities(expiryData);
        });
    }
}

async function fetchExpiryData() {
    try {
        const response = await fetch("https://www.mcxindia.com/market-data/option-chain", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const html = await response.text();
        const match = html.match(/var\s+vTick\s*=\s*(\[.*?\]);/);
        
        if (match) {
            const rawExpiryData = JSON.parse(match[1]);
            const expiryDataBySymbol = rawExpiryData.reduce((acc, item) => {
                if (!acc[item.Symbol]) acc[item.Symbol] = [];
                acc[item.Symbol].push(item.ExpiryDate);
                return acc;
            }, {});
            
            localStorage.setItem("expiryData", JSON.stringify(expiryDataBySymbol));
            return expiryDataBySymbol;
        }
    } catch (error) {
        console.error("Error fetching expiry data:", error);
        return null;
    }
}

// Auto-Fetch Functions
function startAutoDataFetch() {
    if (autoFetchInterval) {
        clearInterval(autoFetchInterval);
    }
    
    fetchCurrentData();
    autoFetchInterval = setInterval(fetchCurrentData, 10000);
}

function stopAutoDataFetch() {
    if (autoFetchInterval) {
        clearInterval(autoFetchInterval);
        autoFetchInterval = null;
    }
}

function fetchCurrentData() {
    activeCommodities.forEach(symbol => {
        if (!symbol) return;
        
        const index = activeCommodities.indexOf(symbol);
        const container = document.querySelector(`#commodity-${index + 1}`);
        
        if (!container) return;
        
        const expiryDropdown = container.querySelector(".expiry-dropdown");
        if (symbol && expiryDropdown && expiryDropdown.value) {
            updateMarketData(symbol, expiryDropdown.value, container);
        }
    });
}

// UI Functions
function highlightTabs(symbol1, symbol2) {
    const commodityButtons = document.querySelectorAll(".commodity-btn");

    commodityButtons.forEach(button => {
        const buttonSymbol = button.innerText;
        if (buttonSymbol === symbol1 || buttonSymbol === symbol2) {
            button.classList.add("active");
        }
    });
}

function loadCommodities(expiryData) {
    const commodityContainer1 = document.getElementById("first-five");
    const commodityContainer2 = document.getElementById("next-five");

    commodityContainer1.innerHTML = "";
    commodityContainer2.innerHTML = "";

    Object.keys(expiryData).slice(0, 5).forEach(symbol => {
        commodityContainer1.appendChild(createCommodityButton(symbol));
    });

    Object.keys(expiryData).slice(5).forEach(symbol => {
        commodityContainer2.appendChild(createCommodityButton(symbol));
    });

    updateSelectedCommodities(expiryData);
}

function createCommodityButton(symbol) {
    const button = document.createElement("button");
    button.innerText = symbol;
    button.classList.add("commodity-btn");
    button.addEventListener("click", () => toggleCommodity(symbol));
    return button;
}

function toggleCommodity(symbol) {
    const maxActive = 2;
    const commodityButtons = document.querySelectorAll(".commodity-btn");

    if (activeCommodities.includes(symbol)) {
        activeCommodities = activeCommodities.filter(item => item !== symbol);
    } else {
        if (activeCommodities.length < maxActive) {
            activeCommodities.push(symbol);
        } else {
            activeCommodities.shift();
            activeCommodities.push(symbol);
        }
    }

    localStorage.setItem("activeCommodities", JSON.stringify(activeCommodities));

    commodityButtons.forEach(button => {
        const buttonSymbol = button.innerText;
        button.classList.toggle("active", activeCommodities.includes(buttonSymbol));
    });

    const expiryData = JSON.parse(localStorage.getItem("expiryData"));
    if (expiryData) {
        updateSelectedCommodities(expiryData);
    }

    if (localStorage.getItem("extensionEnabled") !== "false") {
        fetchCurrentData();
    }
}

function updateSelectedCommodities(expiryData) {
    const selectedCommodity1 = document.getElementById("commodity-1");
    const selectedCommodity2 = document.getElementById("commodity-2");

    [selectedCommodity1, selectedCommodity2].forEach((container, index) => {
        const symbol = activeCommodities[index];

        if (symbol && container) {
            container.querySelector(".selected-name").innerText = symbol;

            const expiryDropdown = container.querySelector(".expiry-dropdown");
            expiryDropdown.innerHTML = "";

            expiryData[symbol].forEach(expiry => {
                const option = document.createElement("option");
                option.value = expiry;
                option.innerText = expiry;
                expiryDropdown.appendChild(option);
            });

            expiryDropdown.value = expiryData[symbol][0];

            if (localStorage.getItem("extensionEnabled") !== "false") {
                updateMarketData(symbol, expiryDropdown.value, container);
            }

            expiryDropdown.addEventListener("change", () => {
                if (localStorage.getItem("extensionEnabled") !== "false") {
                    updateMarketData(symbol, expiryDropdown.value, container);
                }
            });
        }
    });
}

// Market Data Functions
async function fetchAndCalculateTotal(commodity, expiry) {
    try {
        if (!commodity || !expiry) throw new Error("Commodity or expiry not provided!");

        const response = await fetch("https://www.mcxindia.com/backpage.aspx/GetOptionChain", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({ "Commodity": commodity, "Expiry": expiry })
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const jsonData = await response.json();
        if (!jsonData || !jsonData.d || !jsonData.d.Data) throw new Error("Invalid response format");

        let totalCE_OI = 0, totalPE_OI = 0;
        let totalCE_Volume = 0, totalPE_Volume = 0;

        jsonData.d.Data.forEach(option => {
            totalCE_OI += option.CE_OpenInterest || 0;
            totalPE_OI += option.PE_OpenInterest || 0;
            totalCE_Volume += option.CE_Volume || 0;
            totalPE_Volume += option.PE_Volume || 0;
        });

        return { totalCE_OI, totalPE_OI, totalCE_Volume, totalPE_Volume };

    } catch (error) {
        console.error("Error fetching option chain data:", error);
        return null;
    }
}

async function updateMarketData(commodity, expiry, container) {
    try {
        const oiCE = container.querySelector(".totalCE_OI");
        const oiPE = container.querySelector(".totalPE_OI");
        const volCE = container.querySelector(".totalCE_Volume");
        const volPE = container.querySelector(".totalPE_Volume");
        const cePeOI = container.querySelector(".cePe_OI");
        const cePeVolume = container.querySelector(".cePe_Volume");

        [oiCE, oiPE, volCE, volPE, cePeOI, cePeVolume].forEach(el => {
            if (el) el.innerText = "Loading...";
        });

        const marketData = await fetchAndCalculateTotal(commodity, expiry);
        if (marketData) {
            oiCE.innerText = marketData.totalCE_OI;
            oiPE.innerText = marketData.totalPE_OI;
            volCE.innerText = marketData.totalCE_Volume;
            volPE.innerText = marketData.totalPE_Volume;

            const cePeOiValue = marketData.totalCE_OI - marketData.totalPE_OI;
            const cePeVolValue = marketData.totalCE_Volume - marketData.totalPE_Volume;

            cePeOI.innerText = cePeOiValue;
            cePeVolume.innerText = cePeVolValue;

            applyColor(oiCE, marketData.totalCE_OI >= marketData.totalPE_OI);
            applyColor(oiPE, marketData.totalPE_OI > marketData.totalCE_OI);
            applyColor(volCE, marketData.totalCE_Volume >= marketData.totalPE_Volume);
            applyColor(volPE, marketData.totalPE_Volume > marketData.totalCE_Volume);
            applyColor(cePeOI, cePeOiValue >= 0);
            applyColor(cePeVolume, cePeVolValue >= 0);

            container.querySelector(".last-updated").innerText = `Last updated: ${getFormattedTimestamp()}`;
        }
    } catch (error) {
        console.error("Error updating market data:", error);
    }
}

// Utility Functions
function applyColor(element, isHigher) {
    element.classList.remove("green", "red");
    element.classList.add(isHigher ? "green" : "red");
}

function getFormattedTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}