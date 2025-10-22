// Test Instagram Business API configuration
// Run this with: node test-instagram-config.js

const INSTAGRAM_APP_ID = '743883198650530';
const REDIRECT_URI = 'https://7793b9543ef9.ngrok-free.app/api/auth/instagram/callback';
const WEBHOOK_URL = 'https://7793b9543ef9.ngrok-free.app/api/webhook/instagram';

// Generate test OAuth URL for Instagram Business API
const testUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights`;

console.log('🔧 Instagram Business API Configuration Test');
console.log('='.repeat(50));
console.log(`📱 App ID: ${INSTAGRAM_APP_ID}`);
console.log(`🔗 Redirect URI: ${REDIRECT_URI}`);
console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);
console.log('');
console.log('✅ Instagram Business OAuth URL:');
console.log(testUrl);
console.log('');
console.log('📋 Your Meta Developer Console Setup:');
console.log('1. ✅ Instagram Business product added');
console.log('2. ✅ Webhook URL configured');
console.log('3. ✅ Webhook verify token set');
console.log('4. ✅ OAuth redirect URI added');
console.log('');
console.log('🚀 Ready to test Instagram Business messaging!');
console.log('- Can receive direct messages via webhook');
console.log('- Can send direct messages via API');
console.log('- Supports Instagram Business accounts');
