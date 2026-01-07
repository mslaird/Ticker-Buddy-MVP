/**
 * Generate placeholder icons for development
 * Creates simple gradient icons with "TB" text
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG template for icons
const createSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size / 5}" fill="url(#grad)"/>
  <text x="${size / 2}" y="${size * 0.65}" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle">TB</text>
</svg>
`;

const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create SVG files (can be used directly or converted to PNG)
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const svgContent = createSVG(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, svgContent.trim());
  console.log(`✓ Created ${filename}`);
});

console.log('\nSVG icons created successfully!');
console.log('To convert to PNG, use an online tool like:');
console.log('- https://cloudconvert.com/svg-to-png');
console.log('- Or run: npx sharp-cli input.svg -o output.png');
console.log('\nFor development, you can also use the SVG files directly by updating manifest.json');
