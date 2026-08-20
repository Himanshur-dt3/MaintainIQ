import { AssetStatus, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "MaintainIQDemo!2026";
const PASSWORD_HASH_ROUNDS = 12;

const demoUsers = [
  {
    email: "admin@maintainiq.demo",
    name: "Avery Morgan",
    role: Role.ADMIN,
    jobTitle: "Facilities Manager",
  },
  {
    email: "technician@maintainiq.demo",
    name: "Jordan Lee",
    role: Role.TECHNICIAN,
    jobTitle: "Maintenance Technician",
  },
  {
    email: "reporter@maintainiq.demo",
    name: "Taylor Rivera",
    role: Role.REPORTER,
    jobTitle: "Office Coordinator",
  },
] as const;

const demoAssets = [
  {
    name: "Laundry Machine 02",
    type: "Commercial Washing Machine",
    location: "Basement Laundry Room",
  },
  {
    name: "First Floor Bathroom",
    type: "Restroom Facility",
    location: "First Floor East Wing",
  },
  {
    name: "Lobby Air Conditioner",
    type: "HVAC Unit",
    location: "Main Lobby",
  },
  {
    name: "Server Room Network Switch",
    type: "Network Equipment",
    location: "Second Floor Server Room",
  },
  {
    name: "Kitchen Sink",
    type: "Plumbing Fixture",
    location: "First Floor Kitchen",
  },
] as const;

/**
 * Creates or updates the safe, development-only accounts and assets used in
 * the documented role-switching demo.
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_HASH_ROUNDS);

  await Promise.all(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        create: {
          ...user,
          passwordHash,
        },
        update: {
          name: user.name,
          role: user.role,
          jobTitle: user.jobTitle,
          passwordHash,
        },
      }),
    ),
  );

  await Promise.all(
    demoAssets.map((asset) =>
      prisma.asset.upsert({
        where: { name: asset.name },
        create: {
          ...asset,
          status: AssetStatus.ACTIVE,
        },
        update: {
          type: asset.type,
          location: asset.location,
          status: AssetStatus.ACTIVE,
        },
      }),
    ),
  );

  console.info(
    [
      "MaintainIQ demo data seeded successfully.",
      "Development-only credentials:",
      `  admin@maintainiq.demo / ${DEMO_PASSWORD}`,
      `  technician@maintainiq.demo / ${DEMO_PASSWORD}`,
      `  reporter@maintainiq.demo / ${DEMO_PASSWORD}`,
    ].join("\n"),
  );
}

main()
  .catch((error: unknown) => {
    console.error("MaintainIQ seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
