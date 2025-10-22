// Debug Instagram OAuth redirect issues
// Run this with: node debug-redirect.js

console.log('🔍 Instagram OAuth Redirect Debug');
console.log('='.repeat(50));
console.log();

const callbackUrl = 'https://7793b9543ef9.ngrok-free.app/api/auth/instagram/callback?code=AQBodOjlJeOP5bCHnoI7pW5dQZAo9AcD3PMXFrpRtKSN-7IY5PcZvc5Q8sjuncPYbdvaQGl_xxfLFBJFvv1Qcxr7GtkHe_Wna1C_O-XX_t8KY0WlMtqWPu22-EAP0px4dljyadjn4DV_tElxAHJ3n95Ur8vl_9zwMnqssTgWJ2_AIkN3SiYvwf_KPhOuu3cED_YWSzHac_Bzir1ygVATJwTNgqui81lg1u4p2ixwmldh5g&state=cmfj8ita60002v1x4u39dzf0x_1757926005519_087cfhglwyz7';

console.log('📝 Issue Analysis:');
console.log('Instagram is redirecting to HTTPS but your setup might have issues.');
console.log();

console.log('🔗 Callback URL received:');
console.log(callbackUrl);
console.log();

// Parse the URL
const url = new URL(callbackUrl);
const code = url.searchParams.get('code');
const state = url.searchParams.get('state');

console.log('📊 Parsed Parameters:');
console.log(`Code: ${code?.substring(0, 20)}...`);
console.log(`State: ${state}`);
console.log();

console.log('🔧 Troubleshooting Steps:');
console.log();

console.log('1. ✅ Check .env.local file contains:');
console.log('   NEXTAUTH_URL=https://7793b9543ef9.ngrok-free.app');
console.log('   NEXTAUTH_SECRET=your-secret-here');
console.log();

console.log('2. 🔄 Restart your development server:');
console.log('   Stop your server (Ctrl+C)');
console.log('   Run: npm run dev');
console.log();

console.log('3. 🌐 Make sure ngrok is running and pointing to your dev server:');
console.log('   ngrok http 3000');
console.log('   Should show: https://7793b9543ef9.ngrok-free.app -> http://localhost:3000');
console.log();

console.log('4. 🔍 Test the callback URL directly:');
console.log('   Open: https://7793b9543ef9.ngrok-free.app/api/auth/instagram/callback');
console.log('   Should show error but confirm the endpoint exists');
console.log();

console.log('5. 📱 Test Instagram integration:');
console.log('   a) Make sure you\'re logged into your dashboard');
console.log('   b) Go to: https://7793b9543ef9.ngrok-free.app/dashboard/integrations');
console.log('   c) Click "Add Integration" -> Instagram');
console.log('   d) Complete Instagram OAuth');
console.log();

console.log('⚠️  Common Issues:');
console.log('- NextAuth cookies not working with HTTPS redirect');
console.log('- Session lost during OAuth flow');
console.log('- ngrok tunnel not properly forwarding requests');
console.log('- Instagram callback happening before server restart');
console.log();

console.log('💡 Quick Fix:');
console.log('1. Add NEXTAUTH_URL to .env.local (done above)');
console.log('2. Restart your Next.js server');
console.log('3. Try the Instagram login again');

console.log();
console.log('🧪 Test URLs:');
console.log(`Dashboard: https://7793b9543ef9.ngrok-free.app/dashboard/integrations`);
console.log(`Login: https://7793b9543ef9.ngrok-free.app/auth/login`);