// server.js
require('dotenv').config(); // Load environment variables from .env file first
const express = require('express');
const fetch = require('node-fetch'); // Using node-fetch v2 requires 'require'
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000
const FMP_API_KEY = process.env.FMP_API_KEY; // Get API key from environment

if (!FMP_API_KEY) {
    console.error("FATAL ERROR: FMP_API_KEY is not defined in the environment variables.");
    process.exit(1); // Exit if the API key is missing
}

// --- Middleware ---
// Enable CORS for all origins (adjust in production if needed)
app.use(cors());
// Basic logging middleware (optional)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});


// --- Proxy Route ---
app.get('/api/stocks', async (req, res) => {
    const targetUrl = `https://financialmodelingprep.com/api/v3/stock-screener?marketCapMoreThan=1000000000&volumeMoreThan=10000&isEtf=false&exchange=NASDAQ,NYSE&limit=500&apikey=${FMP_API_KEY}`;
    console.log(`Proxying request to: ${targetUrl.replace(FMP_API_KEY, '***')}`);

    let apiResponse; // Define apiResponse outside try block to access status in catch

    try {
        console.log("Attempting to fetch from FMP..."); // Added log
        apiResponse = await fetch(targetUrl);
        console.log(`FMP response status: ${apiResponse.status} ${apiResponse.statusText}`); // Added log

        if (!apiResponse.ok) {
            // Read the error body as text first, as it might not be JSON
            const errorBodyText = await apiResponse.text();
            console.error(`FMP API Error (${apiResponse.status}): ${errorBodyText}`);
            // Throw an error to be caught by the outer catch block
            throw new Error(`FMP API returned status ${apiResponse.status}: ${errorBodyText}`);
        }

        // If response is OK, try to parse as JSON
        console.log("Attempting to parse FMP response as JSON..."); // Added log
        const data = await apiResponse.json();
        console.log(">>> FMP API Response Data (on Server):\n", JSON.stringify(data, null, 2)); // Your log

        // Send successful response back to frontend
        res.status(200).json(data);

    } catch (error) {
        // Log the specific error that occurred
        console.error("!!! Error in /api/stocks proxy route:");
        console.error(error); // Log the full error object

        // Send a generic error message back to the frontend
        // Include the status code from the FMP response if available
        const statusCode = apiResponse ? apiResponse.status : 500;
        res.status(statusCode).json({
            message: "Error fetching or processing data via proxy.",
            error: error.message // Send the error message
        });
    }
});

// --- Serve Static Frontend Files (Optional but good practice) ---
// If your index.html, style.css, script.js are in a 'public' subfolder:
// app.use(express.static('public'));
// If they are in the root (like heatmap-app/), use:
app.use(express.static(__dirname)); // Serve files from the current directory


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`🚀 Backend proxy server listening on http://localhost:${PORT}`);
    console.log(`   Frontend should call: http://localhost:${PORT}/api/stocks`);
    // If serving static files, point browser to: http://localhost:${PORT}/index.html or http://localhost:${PORT}/
});