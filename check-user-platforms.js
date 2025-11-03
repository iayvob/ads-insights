/**
 * Check User Auth Providers
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserAuthProviders() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'ayoub@apptomatch.com' },
      include: {
        authProviders: true,
      },
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('\n📊 User Info:');
    console.log('Email:', user.email);
    console.log('Plan:', user.plan);
    console.log('Username:', user.username);
    console.log('\n🔗 Connected Platforms:');
    console.log('Total:', user.authProviders.length);

    if (user.authProviders.length === 0) {
      console.log('No platforms connected yet.');
    } else {
      console.log('\nPlatforms:');
      user.authProviders.forEach((provider, index) => {
        console.log(`\n${index + 1}. ${provider.provider.toUpperCase()}`);
        console.log('   Provider ID:', provider.providerId);
        console.log('   Username:', provider.username || 'N/A');
        console.log('   Email:', provider.email || 'N/A');
        console.log('   Has Access Token:', !!provider.accessToken);
        console.log(
          '   Created:',
          new Date(provider.createdAt).toLocaleString()
        );
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserAuthProviders();
