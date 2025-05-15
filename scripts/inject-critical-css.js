import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the built index.html
const indexPath = path.resolve(__dirname, '../dist/index.html');
// Path to the critical CSS
const criticalCssPath = path.resolve(__dirname, '../public/critical-home.css');

// Function to inject critical CSS
async function injectCriticalCss() {
  try {
    // Check if critical CSS exists
    if (!fs.existsSync(criticalCssPath)) {
      console.warn('Critical CSS file not found. Skipping injection.');
      return;
    }

    // Check if built index.html exists
    if (!fs.existsSync(indexPath)) {
      console.error('Built index.html not found. Make sure to run the build first.');
      return;
    }

    // Read the critical CSS
    const criticalCss = fs.readFileSync(criticalCssPath, 'utf8');

    // Read the built index.html
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    // Replace the placeholder critical CSS with the actual critical CSS
    indexHtml = indexHtml.replace(
      /(<style id="critical-css">)([\s\S]*?)(<\/style>)/,
      `$1\n${criticalCss}\n$3`
    );

    // Write the modified index.html back
    fs.writeFileSync(indexPath, indexHtml);

    console.log('Critical CSS injected successfully!');
  } catch (error) {
    console.error('Error injecting critical CSS:', error);
  }
}

// Run the function
injectCriticalCss();
