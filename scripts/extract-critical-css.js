const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const criticalCss = require('critical');

// Define the pages to extract critical CSS from
const pages = [
  { url: 'http://localhost:3000', name: 'home' },
  { url: 'http://localhost:3000/settings', name: 'settings' }
];

async function extractCriticalCss() {
  console.log('Extracting critical CSS...');
  
  for (const page of pages) {
    console.log(`Processing ${page.name} page...`);
    
    try {
      const result = await criticalCss.generate({
        src: page.url,
        width: 1300,
        height: 900,
        target: {
          css: path.join(__dirname, `../public/critical-${page.name}.css`),
          html: path.join(__dirname, `../src/critical-css/${page.name}.html`),
          inline: true,
        },
        extract: true,
        inlineImages: false,
        ignore: {
          atrule: ['@font-face']
        }
      });
      
      console.log(`Critical CSS for ${page.name} extracted successfully!`);
      
      // Create a template for including in _document.js
      const criticalCssContent = fs.readFileSync(path.join(__dirname, `../public/critical-${page.name}.css`), 'utf8');
      const template = `
// Critical CSS for ${page.name} page
export const ${page.name}CriticalCss = \`${criticalCssContent.replace(/`/g, '\\`')}\`;
`;
      
      // Ensure directory exists
      if (!fs.existsSync(path.join(__dirname, '../src/critical-css'))) {
        fs.mkdirSync(path.join(__dirname, '../src/critical-css'), { recursive: true });
      }
      
      fs.writeFileSync(path.join(__dirname, `../src/critical-css/${page.name}.js`), template);
      console.log(`Critical CSS template for ${page.name} created!`);
      
    } catch (error) {
      console.error(`Error extracting critical CSS for ${page.name}:`, error);
    }
  }
  
  // Create index file to export all critical CSS
  const imports = pages.map(page => `import { ${page.name}CriticalCss } from './${page.name}';`).join('\n');
  const exports = `export { ${pages.map(page => `${page.name}CriticalCss`).join(', ')} };`;
  
  fs.writeFileSync(
    path.join(__dirname, '../src/critical-css/index.js'),
    `${imports}\n\n${exports}\n`
  );
  
  console.log('Critical CSS extraction complete!');
}

extractCriticalCss();
