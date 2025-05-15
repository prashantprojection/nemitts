const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');

async function purgeUnusedCSS() {
  console.log('Starting CSS purge process...');
  
  try {
    // Check if dist directory exists
    if (!fs.existsSync(path.resolve(__dirname, '../dist'))) {
      console.error('Error: dist directory not found. Run build first.');
      return;
    }
    
    // Find CSS files in the dist directory
    const cssFiles = findCSSFiles(path.resolve(__dirname, '../dist'));
    
    if (cssFiles.length === 0) {
      console.log('No CSS files found in dist directory.');
      return;
    }
    
    console.log(`Found ${cssFiles.length} CSS files to process.`);
    
    // Process each CSS file
    for (const cssFile of cssFiles) {
      console.log(`Processing ${path.basename(cssFile)}...`);
      
      // Run PurgeCSS
      const result = await new PurgeCSS().purge({
        content: [
          path.resolve(__dirname, '../dist/**/*.html'),
          path.resolve(__dirname, '../dist/**/*.js')
        ],
        css: [cssFile],
        safelist: {
          standard: [
            // Add classes that might be added dynamically
            /^bg-/, /^text-/, /^border-/, /^hover:/, /^dark:/, /^focus:/, /^active:/,
            // Shadcn classes
            /^\\[cmdk/, /^data-\\[/, /^aria-\\[/
          ],
          deep: [/dark$/, /light$/],
          greedy: [/^twitch-/]
        },
        // Ensure we don't remove CSS variables
        variables: true
      });
      
      if (result.length > 0) {
        // Get original file size
        const originalSize = fs.statSync(cssFile).size;
        
        // Write purged CSS back to file
        fs.writeFileSync(cssFile, result[0].css);
        
        // Get new file size
        const newSize = fs.statSync(cssFile).size;
        
        // Calculate size reduction
        const reduction = originalSize - newSize;
        const percentage = ((reduction / originalSize) * 100).toFixed(2);
        
        console.log(`Purged ${path.basename(cssFile)}: ${formatBytes(originalSize)} → ${formatBytes(newSize)} (${percentage}% reduction)`);
      }
    }
    
    console.log('CSS purge completed successfully!');
  } catch (error) {
    console.error('Error during CSS purge:', error);
  }
}

// Helper function to find CSS files recursively
function findCSSFiles(directory) {
  let results = [];
  
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findCSSFiles(filePath));
    } else if (path.extname(file) === '.css') {
      results.push(filePath);
    }
  }
  
  return results;
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the function
purgeUnusedCSS();
