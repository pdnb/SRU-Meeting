// Next.js Prisma Client singleton — avoids exhausting connections on hot reload.
// Sources:
// https://www.prisma.io/docs/orm/v6/more/troubleshooting/nextjs
// https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/instantiate-prisma-client

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
