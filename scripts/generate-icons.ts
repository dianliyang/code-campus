/**
 * PWA Icon Generator
 *
 * Run with: npx tsx scripts/generate-icons.ts
 *
 * Requires: npm install sharp --save-dev (if not installed)
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const SOURCE_SVG = path.join(process.cwd(), 'public/code-campus-logo.svg');
const OUTPUT_DIR = path.join(process.cwd(), 'public/icons');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating PWA icons from:', SOURCE_SVG);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    try {
      // Add padding around the logo (15% on each side)
      const padding = Math.round(size * 0.15);
      const logoSize = size - (padding * 2);

      await sharp(SOURCE_SVG)
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error);
    }
  }

  console.log('\nDone! Icons saved to:', OUTPUT_DIR);
}

generateIcons().catch(console.error);
