document.addEventListener('DOMContentLoaded', () => {
    const state = {
        currentTicker: null,
        startDate: '',
        endDate: '',
        chartType: 'Candlestick',
        portfolio: {}
    };
    const API_BASE_URL = window.location.origin;
    function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
    }

    const elements = {
        stockSelect: document.getElementById('stock-select'),
        rangeButtons: document.getElementById('range-buttons'),
        startDateInput: document.getElementById('start-date'),
        endDateInput: document.getElementById('end-date'),
        chartTypeSelect: document.getElementById('chart-type'),
        loadingIndicator: document.getElementById('loading-indicator'),
        loadingTickerSymbol: document.getElementById('loading-ticker-symbol'),
        messageBox: document.getElementById('message-box'),
        mainChartDiv: document.getElementById('main-chart'),
        volumeChartDiv: document.getElementById('volume-chart'),
        atrChartDiv: document.getElementById('atr-chart'),
        macdChartDiv: document.getElementById('macd-chart'),
        rsiChartDiv: document.getElementById('rsi-chart'),
        chartsContainer: document.getElementById('charts-container'),
        infoContainer: document.getElementById('info-container'),
        mainChartTitle: document.getElementById('main-chart-title'),
        portfolioInput: document.getElementById('portfolio-input'),
        savePortfolioBtn: document.getElementById('save-portfolio-btn'),
        portfolioList: document.getElementById('portfolio-list'),
        portfolioTotalValue: document.getElementById('portfolio-total-value'),
        similarStocksList: document.getElementById('similar-stocks-list'),
        similarStocksTitle: document.getElementById('similar-stocks-title'),
        newsContainer: document.getElementById('news-container'),
        togglePortfolio: document.getElementById('toggle-portfolio'),
        portfolioContent: document.querySelector('.portfolio-content')
    };

    const getChartLayout = (title) => ({
        title: { text: title, font: { color: '#e6edf3', family: 'Inter' }, x: 0.05 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#7d8590' },
        xaxis: {
            gridcolor: '#30363d',
            rangeslider: { visible: false },
            spikemode: 'across',
            spikesnap: 'cursor',
            spikethickness: 1,
            spikedash: 'dot',
            spikeecolor: '#7d8590'
        },
        yaxis: { gridcolor: '#30363d', side: 'right' },
        legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' },
        margin: { l: 20, r: 80, b: 50, t: 50, pad: 5 },
        hovermode: 'x unified'
    });

    const init = async () => {
        initParticles();
        await loadSymbols();
        loadPortfolio();
        setupEventListeners();

        setActiveRange('1y');
        await fetchAllData();
        
        const defaultRangeButton = document.querySelector('.btn-range[data-range="1y"]');
        if (defaultRangeButton) {
            setActiveRange('1y', defaultRangeButton);
            await fetchAllData();
        }
    };
    

    const setupEventListeners = () => {
        elements.stockSelect.addEventListener('change', fetchAllData);
        elements.chartTypeSelect.addEventListener('change', () => {
            state.chartType = elements.chartTypeSelect.value;
            fetchAllData();
        });
        elements.rangeButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-range')) {
                const range = e.target.dataset.range;
                setActiveRange(range, e.target);
                fetchAllData();
            }
        });
        elements.startDateInput.addEventListener('change', handleCustomDateChange);
        elements.endDateInput.addEventListener('change', handleCustomDateChange);
        elements.savePortfolioBtn.addEventListener('click', saveAndReloadPortfolio);
        elements.togglePortfolio.addEventListener('click', togglePortfolioView);
    };

    const fetchAllData = async () => {
    state.currentTicker = elements.stockSelect.value;
    if (!state.currentTicker) return;

    // Ensure we have valid dates
    if (!state.startDate) {
        setActiveRange('1y');
    }
    
    toggleLoading(true);
    hideMessage();
    
    try {
        const url = `${API_BASE_URL}/api/stock-data/${state.currentTicker}?start_date=${state.startDate}&end_date=${state.endDate}`;
        const response = await fetch(url);
        
        if (response.status === 404) {
            // Try with default date range
            setActiveRange('1y');
            await fetchAllData();
            return;
        }
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to fetch data');
        }
        
        const data = await response.json();
        renderAll(data);
        fetchSimilarStocks();
        fetchAndRenderNews();
        updatePortfolioValues();

    } catch (error) {
        showMessage(`Error: ${error.message}`, 'error');
        elements.chartsContainer.style.display = 'none';
        elements.infoContainer.style.display = 'none';
    } finally {
        toggleLoading(false);
    }
};

    const fetchSimilarStocks = async () => {
        try {
            const url = `${API_BASE_URL}/api/similar-stocks/${state.currentTicker}`;
            const response = await fetch(url);
            if (!response.ok) return;
            const data = await response.json();
            renderSimilarStocks(data);
        } catch (error) {
            console.error("Could not fetch similar stocks:", error);
        }
    };

    const fetchAndRenderNews = async () => {
        try {
            const url = `${API_BASE_URL}/api/news/${state.currentTicker}`;
            const response = await fetch(url);
            if (!response.ok) return;
            const data = await response.json();
            renderNews(data.news);
        } catch (error) {
            console.error("Could not fetch news:", error);
        }
    };

    const renderAll = (data) => {
        elements.chartsContainer.style.display = 'block';
        elements.infoContainer.style.display = 'block';
        
        renderMainChart(data.history);
        renderVolumeChart(data.history);
        renderAtrChart(data.history);
        renderMacdChart(data.history);
        renderRsiChart(data.history);

        renderCompanyInfo(data.info);
    };

    const renderMainChart = (history) => {
        const traces = [];
        const x_dates = history.map(d => d.Date);

        if (state.chartType === 'Candlestick') {
            traces.push({
                x: x_dates,
                open: history.map(d => d.Open),
                high: history.map(d => d.High),
                low: history.map(d => d.Low),
                close: history.map(d => d.Close),
                type: 'candlestick',
                name: 'Price',
                increasing: { line: { color: '#34d399' } },
                decreasing: { line: { color: '#f87171' } }
            });
        } else if (state.chartType === 'Line') {
            traces.push({
                x: x_dates,
                y: history.map(d => d.Close),
                type: 'scatter',
                mode: 'lines',
                name: 'Close',
                line: { color: '#22d3ee', width: 2 }
            });
        } else if (state.chartType === 'Area') {
            traces.push({
                x: x_dates,
                y: history.map(d => d.Close),
                type: 'scatter',
                mode: 'lines',
                fill: 'tozeroy',
                name: 'Close',
                line: { color: '#22d3ee', width: 2 }
            });
        }

        traces.push({
            x: x_dates, y: history.map(d => d.BB_Upper),
            type: 'scatter', mode: 'lines', name: 'BB Upper',
            line: { color: '#f472b6', width: 1, dash: 'dot' }
        });
        traces.push({
            x: x_dates, y: history.map(d => d.BB_Lower),
            type: 'scatter', mode: 'lines', name: 'BB Lower',
            line: { color: '#f472b6', width: 1, dash: 'dot' }
        });

        const layout = getChartLayout(`${state.currentTicker} Price Analysis`);
        elements.mainChartTitle.textContent = `${state.currentTicker} Price Analysis`;
        Plotly.newPlot(elements.mainChartDiv, traces, layout, { responsive: true });
    };

    const renderVolumeChart = (history) => {
        const trace = {
            x: history.map(d => d.Date),
            y: history.map(d => d.Volume),
            type: 'bar',
            name: 'Volume',
            marker: { color: '#7d8590' }
        };
        Plotly.newPlot(elements.volumeChartDiv, [trace], getChartLayout(''), { responsive: true });
    };

    const renderAtrChart = (history) => {
        const trace = {
            x: history.map(d => d.Date),
            y: history.map(d => d.ATR),
            type: 'scatter',
            mode: 'lines',
            name: 'ATR',
            line: { color: '#a78bfa' }
        };
        Plotly.newPlot(elements.atrChartDiv, [trace], getChartLayout(''), { responsive: true });
    };

    const renderMacdChart = (history) => {
        const traceMacd = {
            x: history.map(d => d.Date),
            y: history.map(d => d.MACD),
            type: 'scatter',
            mode: 'lines',
            name: 'MACD',
            line: { color: '#22d3ee' }
        };
        
        const traceSignal = {
            x: history.map(d => d.Date),
            y: history.map(d => d.Signal),
            type: 'scatter',
            mode: 'lines',
            name: 'Signal',
            line: { color: '#f472b6' }
        };
        
        const traceHist = {
            x: history.map(d => d.Date),
            y: history.map(d => d.Histogram),
            type: 'bar',
            name: 'Histogram',
            marker: {
                color: history.map(d => d.Histogram >= 0 ? '#34d399' : '#f87171')
            }
        };
        
        Plotly.newPlot(elements.macdChartDiv, [traceMacd, traceSignal, traceHist], getChartLayout('MACD'), { responsive: true });
    };

    const renderRsiChart = (history) => {
        const trace = {
            x: history.map(d => d.Date),
            y: history.map(d => d.RSI),
            type: 'scatter',
            mode: 'lines',
            name: 'RSI',
            line: { color: '#a78bfa' }
        };
        
        const layout = {
            ...getChartLayout('RSI (14)'),
            yaxis: {
                ...getChartLayout().yaxis,
                range: [0, 100]
            },
            shapes: [
                {
                    type: 'line',
                    x0: history[0].Date,
                    x1: history[history.length-1].Date,
                    y0: 30,
                    y1: 30,
                    line: { color: '#f87171', dash: 'dot', width: 1 }
                },
                {
                    type: 'line',
                    x0: history[0].Date,
                    x1: history[history.length-1].Date,
                    y0: 70,
                    y1: 70,
                    line: { color: '#f87171', dash: 'dot', width: 1 }
                }
            ]
        };
        
        Plotly.newPlot(elements.rsiChartDiv, [trace], layout, { responsive: true });
    };

    const renderCompanyInfo = (info) => {
        const formatNumber = (num) => {
            if (num === null || num === undefined) return '--';
            if (num > 1e12) return `₹${(num / 1e12).toFixed(2)}T`;
            if (num > 1e9) return `₹${(num / 1e9).toFixed(2)}B`;
            if (num > 1e6) return `₹${(num / 1e6).toFixed(2)}M`;
            return num.toLocaleString('en-IN');
        };

        document.getElementById('company-name').textContent = info.shortName || 'Company Information';
        document.getElementById('info-symbol').textContent = info.symbol || '--';
        document.getElementById('info-sector').textContent = info.sector || '--';
        document.getElementById('info-industry').textContent = info.industry || '--';
        const websiteEl = document.getElementById('info-website');
        websiteEl.textContent = info.website ? new URL(info.website).hostname : '--';
        websiteEl.href = info.website || '#';
        document.getElementById('info-summary').textContent = info.longBusinessSummary || 'No summary available.';

        document.getElementById('metric-marketCap').textContent = formatNumber(info.marketCap);
        document.getElementById('metric-peRatio').textContent = info.trailingPE ? info.trailingPE.toFixed(2) : '--';
        document.getElementById('metric-eps').textContent = info.trailingEps ? info.trailingEps.toFixed(2) : '--';
        document.getElementById('metric-divYield').textContent = info.dividendYield ? `${(info.dividendYield * 100).toFixed(2)}%` : '--';
        document.getElementById('metric-52wHigh').textContent = info.fiftyTwoWeekHigh ? `₹${info.fiftyTwoWeekHigh.toFixed(2)}` : '--';
        document.getElementById('metric-52wLow').textContent = info.fiftyTwoWeekLow ? `₹${info.fiftyTwoWeekLow.toFixed(2)}` : '--';
        document.getElementById('metric-avgVolume').textContent = formatNumber(info.averageVolume);
        document.getElementById('metric-beta').textContent = info.beta ? info.beta.toFixed(2) : '--';
    };

    const renderSimilarStocks = (data) => {
        elements.similarStocksTitle.textContent = `Similar Stocks in ${data.sector || 'N/A'} Sector`;
        elements.similarStocksList.innerHTML = '';
        if (!data.similar || data.similar.length === 0) {
            elements.similarStocksList.innerHTML = '<p>No similar stocks found</p>';
            return;
        }
        data.similar.forEach(stock => {
            const item = document.createElement('div');
            item.className = 'similar-stock-item';
            item.innerHTML = `
                <div class="symbol">${stock.symbol}</div>
                <div class="price">${stock.price !== 'N/A' ? `₹${stock.price.toFixed(2)}` : 'N/A'}</div>
            `;
            elements.similarStocksList.appendChild(item);
        });
    };

    const renderNews = (newsItems) => {
        elements.newsContainer.innerHTML = '';
        if (!newsItems || newsItems.length === 0) {
            elements.newsContainer.innerHTML = '<p>No recent news found</p>';
            return;
        }
        
        newsItems.forEach(item => {
            const newsEl = document.createElement('div');
            newsEl.className = 'news-item';
            newsEl.innerHTML = `
                <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                <p class="news-date">${item.date}</p>
            `;
            elements.newsContainer.appendChild(newsEl);
        });
    };

    const loadPortfolio = () => {
        const savedPortfolio = localStorage.getItem('stockxpertPortfolio');
        if (savedPortfolio) {
            state.portfolio = JSON.parse(savedPortfolio);
            elements.portfolioInput.value = Object.entries(state.portfolio)
                .map(([symbol, qty]) => `${symbol}:${qty}`)
                .join(', ');
        }
        renderPortfolio();
        updatePortfolioValues();
    };

    const saveAndReloadPortfolio = () => {
        const text = elements.portfolioInput.value;
        const newPortfolio = {};
        const entries = text.split(',').filter(Boolean);
        entries.forEach(entry => {
            const [symbol, qty] = entry.split(':');
            if (symbol && qty && !isNaN(parseInt(qty))) {
                newPortfolio[symbol.trim().toUpperCase()] = parseInt(qty);
            }
        });
        state.portfolio = newPortfolio;
        localStorage.setItem('StockXpertPortfolio', JSON.stringify(state.portfolio));
        renderPortfolio();
        updatePortfolioValues();
        showMessage('Portfolio saved!', 'success');
    };

    const renderPortfolio = () => {
        elements.portfolioList.innerHTML = '';
        if (Object.keys(state.portfolio).length === 0) {
            elements.portfolioList.innerHTML = '<p class="no-portfolio">Add stocks to portfolio</p>';
            return;
        }
        for (const [symbol, qty] of Object.entries(state.portfolio)) {
            const item = document.createElement('div');
            item.className = 'portfolio-item';
            item.id = `portfolio-item-${symbol}`;
            item.innerHTML = `
                <span class="symbol">${symbol}</span>
                <span class="qty">${qty} shares</span>
                <span class="price" id="price-${symbol}">Loading...</span>
                <span class="value" id="value-${symbol}">...</span>
            `;
            elements.portfolioList.appendChild(item);
        }
    };

    const updatePortfolioValues = async () => {
        const symbols = Object.keys(state.portfolio);
        if (symbols.length === 0) {
            elements.portfolioTotalValue.textContent = '₹0.00';
            return;
        }

        try {
            const url = `${API_BASE_URL}/api/batch-prices?symbols=${symbols.join(',')}`;
            const response = await fetch(url);
            if (!response.ok) return;
            const prices = await response.json();

            let totalValue = 0;
            for (const symbol of symbols) {
                const price = prices[symbol];
                const qty = state.portfolio[symbol];
                const priceEl = document.getElementById(`price-${symbol}`);
                const valueEl = document.getElementById(`value-${symbol}`);

                if (price !== "N/A" && priceEl && valueEl) {
                    const value = price * qty;
                    totalValue += value;
                    priceEl.textContent = `₹${price.toFixed(2)}`;
                    valueEl.textContent = `₹${value.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
                } else if (priceEl && valueEl) {
                    priceEl.textContent = 'N/A';
                    valueEl.textContent = 'N/A';
                }
            }
            elements.portfolioTotalValue.textContent = `₹${totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        } catch (error) {
            console.error("Failed to update portfolio:", error);
        }
    };

    const loadSymbols = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/symbols`);
            if (!response.ok) throw new Error('Failed to load symbols');
            const data = await response.json();
            elements.stockSelect.innerHTML = data.symbols
                .map(s => `<option value="${s}">${s}</option>`)
                .join('');
            if (data.symbols.includes('RELIANCE')) {
                elements.stockSelect.value = 'RELIANCE';
            }
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };

    const setActiveRange = (range, button) => {
    document.querySelectorAll('.btn-range').forEach(btn => btn.classList.remove('active'));
    if(button) button.classList.add('active');

    const end = new Date();
    let start = new Date();
    
    switch (range) {
        case '1d': 
            start.setDate(end.getDate() - 1);
            // Ensure we have at least 5 days of data for indicators
            if (state.currentTicker) {
                const tempStart = new Date(start);
                tempStart.setDate(start.getDate() - 5);
                state.startDate = formatDate(tempStart);
            } else {
                state.startDate = formatDate(start);
            }
            break;
        case '5d': 
            start.setDate(end.getDate() - 5);
            state.startDate = formatDate(start);
            break;
        case '1m': 
            start.setMonth(end.getMonth() - 1);
            state.startDate = formatDate(start);
            break;
        case '6m': 
            start.setMonth(end.getMonth() - 6);
            state.startDate = formatDate(start);
            break;
        case '1y': 
            start.setFullYear(end.getFullYear() - 1);
            state.startDate = formatDate(start);
            break;
        case '5y': 
            start.setFullYear(end.getFullYear() - 5);
            state.startDate = formatDate(start);
            break;
        case 'max': 
            state.startDate = '2000-01-01';
            break;
    }

    state.endDate = formatDate(end);
    elements.startDateInput.value = state.startDate;
    elements.endDateInput.value = state.endDate;
};

    const handleCustomDateChange = () => {
        state.startDate = elements.startDateInput.value;
        state.endDate = elements.endDateInput.value;
        document.querySelectorAll('.btn-range').forEach(btn => btn.classList.remove('active'));
        fetchAllData();
    };

    const togglePortfolioView = () => {
        elements.portfolioContent.classList.toggle('collapsed');
        elements.togglePortfolio.textContent = 
            elements.portfolioContent.classList.contains('collapsed') ? '▲' : '▼';
    };

    const toggleLoading = (isLoading) => {
        elements.loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        if (isLoading) {
            elements.loadingTickerSymbol.textContent = state.currentTicker || '';
            elements.chartsContainer.style.display = 'none';
            elements.infoContainer.style.display = 'none';
        }
    };

    const showMessage = (message, type = 'info') => {
        elements.messageBox.textContent = message;
        elements.messageBox.className = `message-box ${type}`;
        elements.messageBox.style.display = 'block';
        setTimeout(hideMessage, 5000);
    };

    const hideMessage = () => {
        elements.messageBox.style.display = 'none';
    };

    const initParticles = () => {
        tsParticles.load({
            id: "tsparticles",
            options: {
                fpsLimit: 60,
                particles: {
                    number: { value: 50, density: { enable: true, value_area: 800 } },
                    color: { value: "#30363d" },
                    shape: { type: "circle" },
                    opacity: { value: 0.5, random: true },
                    size: { value: 3, random: { enable: true, minimumValue: 1 } },
                    links: { color: "#30363d", distance: 150, enable: true, opacity: 0.2, width: 1 },
                    move: {
                        enable: true,
                        speed: 0.5,
                        direction: "none",
                        out_mode: "out",
                    },
                },
                interactivity: {
                    events: {
                        onHover: { enable: true, mode: "repulse" },
                        onClick: { enable: true, mode: "push" },
                    },
                    modes: {
                        repulse: { distance: 100, duration: 0.4 },
                        push: { particles_nb: 4 },
                    },
                },
                detectRetina: true,
            },
        });
    };

    init();
});