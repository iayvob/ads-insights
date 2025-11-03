/**
 * Debug Platform Connections
 * Check what the frontend sees for connected platforms
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPlatformConnections() {
  try {
    console.log('🔍 Checking all users with platform connections...\n');

    const users = await prisma.user.findMany({
      include: {
        authProviders: true,
      },
    });

    users.forEach((user) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 User: ${user.email}`);
      console.log(`   Plan: ${user.plan}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Connected Platforms: ${user.authProviders.length}`);

      if (user.authProviders.length > 0) {
        console.log('\n   🔗 Platforms:');
        user.authProviders.forEach((provider, index) => {
          console.log(`\n   ${index + 1}. ${provider.provider.toUpperCase()}`);
          console.log(`      ID: ${provider.id}`);
          console.log(`      Provider ID: ${provider.providerId}`);
          console.log(`      Username: ${provider.username || 'N/A'}`);
          console.log(`      Email: ${provider.email || 'N/A'}`);
          console.log(
            `      Access Token: ${provider.accessToken ? '✓ Present' : '✗ Missing'}`
          );
          console.log(
            `      Refresh Token: ${provider.refreshToken ? '✓ Present' : '✗ Missing'}`
          );
          console.log(
            `      Created: ${new Date(provider.createdAt).toLocaleString()}`
          );
          console.log(
            `      Expires: ${provider.expiresAt ? new Date(provider.expiresAt).toLocaleString() : 'N/A'}`
          );
        });
      } else {
        console.log('   ℹ️  No platforms connected');
      }
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test the isConnected logic
    const testUser = users.find((u) => u.authProviders.length > 0);
    if (testUser) {
      console.log('🧪 Testing isConnected() logic:');
      console.log(`   User: ${testUser.email}`);
      console.log(
        `   Auth Providers Array:`,
        testUser.authProviders.map((p) => p.provider)
      );

      const platforms = [
        'facebook',
        'instagram',
        'twitter',
        'amazon',
        'tiktok',
      ];
      platforms.forEach((platform) => {
        const isConnected = testUser.authProviders.some(
          (p) => p.provider === platform
        );
        console.log(
          `   ${platform}: ${isConnected ? '✓ Connected' : '✗ Not Connected'}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPlatformConnections();
