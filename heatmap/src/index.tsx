import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18+

import StockHeatmap from './StockHeatmap'; // Path is now relative within src
// Import the CSS file relative to this file
import '../StockHeatmapstyle.css';

import './index.css';

// Find the root element in your HTML
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element. Check your index.html.");
}

// Create a React root
const root = ReactDOM.createRoot(rootElement);

// Render the main App component (or just StockHeatmap for now)
root.render(
    <React.StrictMode>
        <StockHeatmap />
    </React.StrictMode>
); 