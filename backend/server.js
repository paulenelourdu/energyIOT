const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL module
const ExcelJS = require('exceljs'); // For Excel file creation
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());app.use(bodyParser.json()); // Parse application/json
app.use(bodyParser.urlencoded({ extended: true })); // Parse application/x-www-form-urlencoded
app.use(express.static('/home/sun/iot-backend/public'));

// PostgreSQL connection
const pool = new Pool({
    user: 'iot_user',
    host: 'localhost',
    database: 'iot_backend',
    password: 'iot_password',
    port: 5432,
});

// ESP32 IP address
const ESP32_IP = '192.168.1.55';

// Helper: Format time from milliseconds to HH:MM:SS
function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours}:${minutes}:${seconds}`;
}
// API to reset Wi-Fi credentials on ESP32
app.get('/api/reset-wifi', async (req, res) => {
    try {
        const response = await axios.get(`http://${ESP32_IP}/reset-wifi`);
        res.status(200).json({ message: 'Wi-Fi credentials reset successfully.' });
    } catch (error) {
        console.error('Error resetting Wi-Fi:', error.message);
        res.status(500).json({ error: 'Failed to reset Wi-Fi credentials.' });
    }
});
app.post('/api/save-wifi', async (req, res) => {
    const { ssid, password } = req.body;

    if (!ssid || !password) {
        return res.status(400).json({ error: 'SSID and Password are required.' });
    }

    try {
        const response = await axios.post(`http://${ESP32_IP}/save-wifi`, { ssid, password });
        res.status(200).json({ message: 'Wi-Fi credentials saved successfully.' });
    } catch (error) {
        console.error('Error saving Wi-Fi credentials:', error.message);
        res.status(500).json({ error: 'Failed to save Wi-Fi credentials.' });
    }
});



// Fetch live energy monitoring data from ESP32 and store in PostgreSQL
app.get('/api/live-data', async (req, res) => {
    try {
        const response = await axios.get(`http://${ESP32_IP}/live-data`);
        const { voltage, current, power, frequency, power_factor, kwh } = response.data;

        const data = {
            voltage,
            current,
            power,
            frequency,
            power_factor,
            kwh,
        };

        await pool.query(
            `INSERT INTO energy_monitoring (voltage, current, power, frequency, power_factor, kwh)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                data.voltage,
                data.current,
                data.power,
                data.frequency,
                data.power_factor,
                data.kwh,
            ]
        );

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching or storing live data:', error.message);
        res.status(500).json({ error: 'Failed to fetch or store live data.' });
    }
});

// Fetch data for a date range or specific date/time
app.get('/api/graph-data', async (req, res) => {
    const { filter_mode, from_date, to_date, date, start_time, end_time } = req.query;

    let query = '';
    let params = [];

    if (filter_mode === 'date_time') {
        if (!date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Please provide date, start_time, and end_time.' });
        }

        query = `
            SELECT timestamp, voltage, current, power, frequency, power_factor, kwh
            FROM energy_monitoring
            WHERE timestamp::date = $1 AND timestamp::time BETWEEN $2 AND $3
        `;
        params = [date, start_time, end_time];
    } else if (filter_mode === 'day' || filter_mode === 'week' || filter_mode === 'month') {
        if (!from_date || !to_date) {
            return res.status(400).json({ error: 'Please provide from_date and to_date.' });
        }

        query = `
            SELECT timestamp, voltage, current, power, frequency, power_factor, kwh
            FROM energy_monitoring
            WHERE timestamp::date BETWEEN $1 AND $2
        `;
        params = [from_date, to_date];
    } else {
        return res.status(400).json({ error: 'Invalid filter mode.' });
    }

    try {
        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).json({ error: 'Failed to fetch graph data.' });
    }
});

// Download data for a date range and time range
app.get('/api/download-data', async (req, res) => {
    const { from_date, to_date, start_time, end_time } = req.query;

    if (!from_date || !to_date || !start_time || !end_time) {
        return res.status(400).json({ error: 'Please provide from_date, to_date, start_time, and end_time.' });
    }

    try {
        const result = await pool.query(
            `SELECT timestamp, voltage, current, power, frequency, power_factor, kwh 
             FROM energy_monitoring 
             WHERE timestamp::date BETWEEN $1 AND $2 AND timestamp::time BETWEEN $3 AND $4`,
            [from_date, to_date, start_time, end_time]
        );

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Energy Data');

        worksheet.columns = [
            { header: 'Timestamp', key: 'timestamp', width: 20 },
            { header: 'Voltage (V)', key: 'voltage', width: 15 },
            { header: 'Current (A)', key: 'current', width: 15 },
            { header: 'Power (W)', key: 'power', width: 15 },
            { header: 'Frequency (Hz)', key: 'frequency', width: 15 },
            { header: 'Power Factor', key: 'power_factor', width: 15 },
            { header: 'Energy (kWh)', key: 'kwh', width: 15 },
        ];

        result.rows.forEach(row => worksheet.addRow(row));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=energy_data.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error downloading data:', error.message);
        res.status(500).json({ error: 'Failed to download data.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

