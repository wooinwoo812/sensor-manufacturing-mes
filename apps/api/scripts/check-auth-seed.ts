import { ROLE_CONFIG } from "../src/auth/auth.contract.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/auth/demo-accounts.js";
import { verifyPassword } from "../src/auth/password.js";
import { PrismaService } from "../src/database/prisma.service.js";

const prisma = new PrismaService();

try {
  const roles = await prisma.role.findMany({ orderBy: { code: "asc" } });
  if (roles.length !== Object.keys(ROLE_CONFIG).length) {
    throw new Error("Role seed 개수가 권한표와 다릅니다.");
  }

  for (const account of DEMO_ACCOUNTS) {
    const user = await prisma.user.findUnique({
      where: { email: account.email },
      include: { roles: true },
    });

    if (
      user === null ||
      user.id !== account.id ||
      !user.isActive ||
      !user.isDemo ||
      user.roles.length !== 1 ||
      user.roles[0]?.roleCode !== account.role ||
      user.passwordHash === DEMO_PASSWORD ||
      !(await verifyPassword(DEMO_PASSWORD, user.passwordHash))
    ) {
      throw new Error(`데모 계정 seed가 계약과 다릅니다: ${account.id}`);
    }
  }

  console.log(`인증 seed 검증 정상: 역할 ${roles.length}개, 가상 계정 ${DEMO_ACCOUNTS.length}개`);
} finally {
  await prisma.$disconnect();
}
