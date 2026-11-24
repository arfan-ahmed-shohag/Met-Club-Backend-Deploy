import { Role } from "../../generated/prisma/enums";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

export const seedAdmin = async () => {
  try {
    const adminEmail = "admin2@gmail.com";
    const adminPassword = "123456";

    const hashedPassword = await bcrypt.hash(
      adminPassword,
      Number(config.salt_rounds),
    );

    if (!adminEmail || !adminPassword) {
      console.warn(
        "Admin email or password not provided. Skipping admin seeding.",
      );
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: Role.admin,
          admin: { create: { fullName: "আরিফ রহমান" } },
        },
      });

      console.log("admin created successfully");
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
};
