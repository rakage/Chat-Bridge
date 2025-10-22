#!/usr/bin/env node

/**
 * Setup script for Facebook webhook development
 * This will help you configure ngrok for local webhook testing
 */

console.log('🔧 Facebook Webhook Development Setup\n');

console.log('To fix the webhook issue, you need to expose your localhost to the internet.');
console.log('Here are the steps to set up webhook development:\n');

console.log('1. 📦 Install ngrok (if not already installed):');
console.log('   npm install -g ngrok');
console.log('   # OR');
console.log('   Download from https://ngrok.com/\n');

console.log('2. 🌐 Start ngrok tunnel:');
console.log('   ngrok http 3000\n');

console.log('3. 📋 Copy the HTTPS URL from ngrok (something like: https://abc123.ngrok.io)\n');

console.log('4. 🔧 Update your .env.local file:');
console.log('   NEXTAUTH_URL=https://your-ngrok-url.ngrok.io');
console.log('   FB_VERIFY_TOKEN=your_verify_token_here');
console.log('   # Keep your existing FB_APP_SECRET and FACEBOOK_APP_ID\n');

console.log('5. 🔄 Restart your Next.js development server\n');

console.log('6. 🌍 Update Facebook App webhook settings:');
console.log('   - Go to Facebook App Dashboard');
console.log('   - Navigate to Webhooks section');
console.log('   - Set webhook URL to: https://your-ngrok-url.ngrok.io/api/webhook/facebook');
console.log('   - Set verify token to match FB_VERIFY_TOKEN from step 4');
console.log('   - Subscribe to: messages, messaging_postbacks\n');

console.log('7. 🔌 Re-connect your Facebook pages:');
console.log('   - Go to your app\'s integration page');
console.log('   - Disconnect and reconnect the "Dian Aul" page');
console.log('   - This will refresh the webhook subscription\n');

console.log('8. 💬 Test by sending a message to the "Dian Aul" Facebook page\n');

console.log('🎯 After these steps, webhooks should work for all pages!');

// Check current environment
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log('\n📝 Current .env.local configuration:');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('NEXTAUTH_URL=')) {
            console.log(`   ${line}`);
        } else if (line.startsWith('FB_VERIFY_TOKEN=')) {
            console.log(`   ${line}`);
        } else if (line.startsWith('FB_APP_SECRET=')) {
            console.log(`   FB_APP_SECRET=${line.split('=')[1] ? '***SET***' : 'NOT SET'}`);
        } else if (line.startsWith('FACEBOOK_APP_ID=')) {
            console.log(`   ${line}`);
        }
    }
} else {
    console.log('\n⚠️ No .env.local file found. Create one with the variables above.');
}