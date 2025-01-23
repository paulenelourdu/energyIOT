const BASE_URL = 'http://localhost:3000/api';

// Fetch filtered data from the database
function fetchData() {
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start_time').value;
    const endTime = document.getElementById('end_time').value;

    if (!date || !startTime || !endTime) {
        alert('Please select a date, start time, and end time.');
        return;
    }

    fetch(`${BASE_URL}/data?date=${date}&start_time=${startTime}&end_time=${endTime}`)
        .then(response => response.json())
        .then(data => {
            const results = JSON.stringify(data, null, 2);
            document.getElementById('data-results').innerText = results;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data.');
        });
}

function saveWiFiConfig() {
    const ssid = document.getElementById('wifi-ssid').value;
    const password = document.getElementById('wifi-password').value;

    if (!ssid || !password) {
        alert('Please enter both SSID and Password.');
        return;
    }

    fetch(`${BASE_URL}/save-wifi`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ssid, password }),
    })
        .then((response) => response.json())
        .then((data) => {
            alert(data.message || 'Wi-Fi settings updated successfully.');
        })
        .catch((error) => {
            console.error('Error saving Wi-Fi settings:', error);
            alert('Failed to update Wi-Fi settings.');
        });
}

function resetWiFi() {
    fetch(`${BASE_URL}/reset-wifi`)
        .then((response) => response.json())
        .then((data) => {
            alert(data.message || 'Wi-Fi reset successfully.');
        })
        .catch((error) => {
            console.error('Error resetting Wi-Fi:', error);
            alert('Failed to reset Wi-Fi.');
        });
}


function fetchLiveData() {
    fetch(`${BASE_URL}/live-data`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('voltage').innerText = `${data.voltage} V`;
            document.getElementById('current').innerText = `${data.current} A`;
            document.getElementById('power').innerText = `${data.power} W`;
            document.getElementById('frequency').innerText = `${data.frequency} Hz`;
            document.getElementById('power_factor').innerText = data.power_factor.toFixed(2);
            document.getElementById('kwh').innerText = data.kwh.toFixed(4);

        })
        .catch(error => console.error('Error fetching live data:', error));
}

function fetchData() {
    const date = document.getElementById('filter_date').value;
    const startTime = document.getElementById('filter_start_time').value;
    const endTime = document.getElementById('filter_end_time').value;

    if (!date || !startTime || !endTime) {
        alert('Please select a date, start time, and end time.');
        return;
    }

    fetch(`${BASE_URL}/data?date=${date}&start_time=${startTime}&end_time=${endTime}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('data-results').innerText = JSON.stringify(data, null, 2);
        })
        .catch(error => console.error('Error fetching data:', error));
}

let voltageChart, currentChart, powerChart, powerFactorChart, energyChart;

// Helper to create a graph
function createGraph(ctx, labels = [], data = [], label, color, min, max) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label,
                    data,
                    borderColor: color,
                    backgroundColor: color,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Timestamp',
                    },
                },
                y: {
                    min,
                    max,
                    title: {
                        display: true,
                        text: label,
                    },
                },
            },
        },
    });
}

// Reset all graphs
function resetGraphs() {
    const defaultLabels = ['No Data'];
    const defaultData = [0];

    if (voltageChart) voltageChart.destroy();
    voltageChart = createGraph(
        document.getElementById('voltage-graph').getContext('2d'),
        defaultLabels,
        defaultData,
        'Voltage (V)',
        'blue',
        0,
        230
    );

    if (currentChart) currentChart.destroy();
    currentChart = createGraph(
        document.getElementById('current-graph').getContext('2d'),
        defaultLabels,
        defaultData,
        'Current (A)',
        'green',
        0,
        1
    );

    if (powerChart) powerChart.destroy();
    powerChart = createGraph(
        document.getElementById('power-graph').getContext('2d'),
        defaultLabels,
        defaultData,
        'Power (W)',
        'red',
        0,
        1000
    );

    if (powerFactorChart) powerFactorChart.destroy();
    powerFactorChart = createGraph(
        document.getElementById('power-factor-graph').getContext('2d'),
        defaultLabels,
        defaultData,
        'Power Factor',
        'purple',
        0,
        1
    );

    if (energyChart) energyChart.destroy();
    energyChart = createGraph(
        document.getElementById('energy-graph').getContext('2d'),
        defaultLabels,
        defaultData,
        'Energy (kWh)',
        'orange',
        0,
        0.01
    );

    document.getElementById('data-results').innerText = '';
    alert('Graphs reset to default state.');
}

function toggleTimeInputs() {
    const filterMode = document.getElementById('filter_mode').value;
    const dateInputs = document.getElementById('date-inputs');
    const timeInputs = document.getElementById('time-inputs');

    if (filterMode === 'date_time') {
        dateInputs.style.display = 'none';
        timeInputs.style.display = 'block';
    } else {
        dateInputs.style.display = 'block';
        timeInputs.style.display = 'none';
    }
}

function showGraphs() {
    const filterMode = document.getElementById('filter_mode').value;

    let queryParams = '';

    if (filterMode === 'date_time') {
        const filterDate = document.getElementById('filter_date').value;
        const startTime = document.getElementById('filter_start_time').value;
        const endTime = document.getElementById('filter_end_time').value;

        if (!filterDate || !startTime || !endTime) {
            alert('Please select a date and time range.');
            return;
        }

        queryParams = `filter_mode=${filterMode}&date=${filterDate}&start_time=${startTime}&end_time=${endTime}`;
    } else {
        const fromDate = document.getElementById('from_date').value;
        const toDate = document.getElementById('to_date').value;

        if (!fromDate || !toDate) {
            alert('Please select a date range.');
            return;
        }

        queryParams = `filter_mode=${filterMode}&from_date=${fromDate}&to_date=${toDate}`;
    }

    fetch(`${BASE_URL}/graph-data?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                alert('No data available for the selected range.');
                return;
            }

            const timestamps = data.map(row => row.timestamp);
            const voltage = data.map(row => row.voltage);
            const current = data.map(row => row.current);
            const power = data.map(row => row.power);
            const powerFactor = data.map(row => row.power_factor);
            const energy = data.map(row => row.kwh);

            // Update graphs
            if (voltageChart) voltageChart.destroy();
            voltageChart = createGraph(
                document.getElementById('voltage-graph').getContext('2d'),
                timestamps,
                voltage,
                'Voltage (V)',
                'blue',
                0,
                230
            );

            if (currentChart) currentChart.destroy();
            currentChart = createGraph(
                document.getElementById('current-graph').getContext('2d'),
                timestamps,
                current,
                'Current (A)',
                'green',
                0,
                1
            );

            if (powerChart) powerChart.destroy();
            powerChart = createGraph(
                document.getElementById('power-graph').getContext('2d'),
                timestamps,
                power,
                'Power (W)',
                'red',
                0,
                Math.max(...power) + 100
            );

            if (powerFactorChart) powerFactorChart.destroy();
            powerFactorChart = createGraph(
                document.getElementById('power-factor-graph').getContext('2d'),
                timestamps,
                powerFactor,
                'Power Factor',
                'purple',
                0,
                1
            );

            if (energyChart) energyChart.destroy();
            energyChart = createGraph(
                document.getElementById('energy-graph').getContext('2d'),
                timestamps,
                energy,
                'Energy (kWh)',
                'orange',
                0,
                Math.max(...energy) + 0.01
            );

            document.getElementById('data-results').innerText = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            console.error('Error fetching graph data:', error);
            alert('Failed to fetch data for graphs.');
        });
}

function downloadExcel() {
    const fromDate = document.getElementById('from_date').value;
    const toDate = document.getElementById('to_date').value;
    const startTime = document.getElementById('filter_start_time').value;
    const endTime = document.getElementById('filter_end_time').value;

    if (!fromDate || !toDate || !startTime || !endTime) {
        alert('Please select a date range and time range.');
        return;
    }

    window.location.href = `${BASE_URL}/download-data?from_date=${fromDate}&to_date=${toDate}&start_time=${startTime}&end_time=${endTime}`;
}

// Periodically fetch live data
setInterval(fetchLiveData, 1000);


