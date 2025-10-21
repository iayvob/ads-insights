const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTokens() {
  try {
    const providers = await prisma.authProvider.findMany({
      where: {
        provider: 'twitter',
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerId: true,
        username: true,
        accessToken: true,
        accessTokenSecret: true,
        refreshToken: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('\n📊 Twitter OAuth Providers in Database:\n');
    console.log(`Found ${providers.length} Twitter provider(s)\n`);

    providers.forEach((p, i) => {
      console.log(`\n--- Provider ${i + 1} ---`);
      console.log(`ID: ${p.id}`);
      console.log(`User ID: ${p.userId}`);
      console.log(`Provider ID: ${p.providerId}`);
      console.log(`Username: ${p.username}`);
      console.log(
        `Access Token: ${p.accessToken ? p.accessToken.substring(0, 20) + '...' : 'NULL'}`
      );
      console.log(`Access Token Length: ${p.accessToken?.length || 0}`);
      console.log(
        `Access Token Secret: ${p.accessTokenSecret ? p.accessTokenSecret.substring(0, 20) + '...' : 'NULL'}`
      );
      console.log(
        `Access Token Secret Length: ${p.accessTokenSecret?.length || 0}`
      );
      console.log(`Refresh Token: ${p.refreshToken ? 'EXISTS' : 'NULL'}`);
      console.log(`Expires At: ${p.expiresAt || 'NULL'}`);
      console.log(`Created At: ${p.createdAt}`);
      console.log(`Updated At: ${p.updatedAt}`);
    });

    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTokens();
