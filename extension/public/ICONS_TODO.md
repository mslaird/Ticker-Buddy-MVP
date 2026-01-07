# Extension Icons TODO

The extension requires three icon sizes:
- icon-16.png (16x16)
- icon-48.png (48x48)
- icon-128.png (128x128)

## Temporary Workaround

For development, you can use any PNG files with these names.
Use an online tool or design software to create simple icons with "TB" text.

## Production Icons

Before publishing to Chrome Web Store, create professional icons:
1. Use the Ticker Buddy brand colors (purple/blue gradient)
2. Include the "TB" logo or ticker symbol
3. Ensure icons look good on light and dark backgrounds
4. Follow Chrome's icon design guidelines

## Quick Generation

You can use this SVG as a base and convert to PNG:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#grad)"/>
  <text x="64" y="80" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">TB</text>
</svg>
```

Save this SVG and convert to PNG at required sizes using:
- https://cloudconvert.com/svg-to-png
- Or Figma/Sketch/Illustrator
