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
const SOURCE_SVG = path.join(process.cwd(), 'public/code-campus-logo-bw.svg');
const OUTPUT_DIR = path.join(process.cwd(), 'public/icons');

async function generateIcons() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating PWA icons from:', SOURCE_SVG);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    try {
      // Render the SVG at full size with transparent background so the
      // rounded corners of the SVG rect show as transparent in the PNG.
      // macOS then applies its own squircle mask on top.
      await sharp(SOURCE_SVG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error);
    }
  }

  // Also copy SVG as icon.svg for browser favicon use
  const svgSrc = fs.readFileSync(SOURCE_SVG, 'utf-8');
  fs.writeFileSync(path.join(process.cwd(), 'public/icon.svg'), svgSrc);
  console.log('✓ Copied: icon.svg');

  console.log('\nDone! Icons saved to:', OUTPUT_DIR);
}

generateIcons().catch(console.error);
