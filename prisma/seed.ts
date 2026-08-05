import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@kctelecom.com';
  const phone = process.env.ADMIN_PHONE ?? '08000000000';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      phone,
      fullName: 'KC Telecom Admin',
      passwordHash,
      role: 'ADMIN',
      wallet: { create: { balance: 0 } },
    },
  });

  console.log(`Admin account created: ${admin.email} (password: ${password})`);
  console.log('Log in and change this password immediately in a real deployment.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
