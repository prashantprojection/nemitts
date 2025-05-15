// Production deployment script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  }
};

// Helper function to log with colors
function log(message, color = colors.fg.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to run commands
function runCommand(command) {
  try {
    log(`Running: ${command}`, colors.fg.cyan);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Error executing command: ${command}`, colors.fg.red);
    log(error.message, colors.fg.red);
    return false;
  }
}

// Main deployment function
async function deploy() {
  log('🚀 Starting deployment process...', colors.fg.green + colors.bright);

  // 1. Check if we have the required dependencies
  log('\n📋 Checking dependencies...', colors.fg.yellow);

  try {
    // Check if npm is installed
    execSync('npm --version', { stdio: 'ignore' });
    log('✅ npm is installed', colors.fg.green);

    // Check if git is installed
    execSync('git --version', { stdio: 'ignore' });
    log('✅ git is installed', colors.fg.green);
  } catch (error) {
    log('❌ Missing required dependencies. Please install npm and git.', colors.fg.red);
    process.exit(1);
  }

  // 2. Clean install dependencies
  log('\n📦 Installing dependencies...', colors.fg.yellow);
  if (!runCommand('npm ci')) {
    log('❌ Failed to install dependencies', colors.fg.red);
    process.exit(1);
  }

  // 3. Build the project
  log('\n🔨 Building project...', colors.fg.yellow);
  if (!runCommand('npm run build')) {
    log('❌ Build failed', colors.fg.red);
    process.exit(1);
  }

  // 4. Create a _redirects file for Netlify to handle SPA routing
  log('\n📝 Creating Netlify configuration...', colors.fg.yellow);
  try {
    fs.writeFileSync(
      path.join(__dirname, 'dist', '_redirects'),
      '/* /index.html 200'
    );
    log('✅ Created _redirects file for SPA routing', colors.fg.green);

    // Create a netlify.toml file with additional configuration
    fs.writeFileSync(
      path.join(__dirname, 'netlify.toml'),
      `[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
    [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`
    );
    log('✅ Created netlify.toml configuration file', colors.fg.green);
  } catch (error) {
    log(`❌ Failed to create Netlify configuration: ${error.message}`, colors.fg.red);
    // Non-critical error, continue
  }

  // 5. Provide deployment instructions
  log('\n🎉 Build completed successfully!', colors.fg.green + colors.bright);
  log('\nDeployment Options:', colors.fg.cyan + colors.bright);

  log('\n1. Deploy to Netlify:', colors.fg.yellow);
  log('   - Install Netlify CLI: npm install -g netlify-cli', colors.fg.white);
  log('   - Run: netlify deploy', colors.fg.white);

  log('\n2. Deploy to Vercel:', colors.fg.yellow);
  log('   - Install Vercel CLI: npm install -g vercel', colors.fg.white);
  log('   - Run: vercel', colors.fg.white);
  log('   - Note: If you encounter issues with vercel.json, use the simplified format', colors.fg.white);
  log('     or remove it and configure settings in the Vercel dashboard', colors.fg.white);

  log('\n3. Manual deployment:', colors.fg.yellow);
  log('   - Upload the contents of the "dist" folder to your web hosting', colors.fg.white);
  log('   - Ensure all requests are redirected to index.html for SPA routing', colors.fg.white);

  log('\nImportant Notes:', colors.fg.magenta);
  log('- Make sure to update your Twitch Developer Application with the correct redirect URI', colors.fg.white);
  log('- Current production URL should be added to your Twitch Developer Console', colors.fg.white);
  log('- Test authentication after deployment to ensure everything works correctly', colors.fg.white);

  log('\n🚀 Happy deploying!', colors.fg.green + colors.bright);
}

// Run the deployment script
deploy().catch(error => {
  log(`❌ Deployment failed: ${error.message}`, colors.fg.red);
  process.exit(1);
});
