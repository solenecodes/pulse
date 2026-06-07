import "dotenv/config";
import prismaClientPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const { PrismaClient } = prismaClientPkg;
const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

function sqlitePathFromUrl(url) {
  if (!url.startsWith("file:")) {
    throw new Error("Pulse local setup expects a SQLite DATABASE_URL starting with file:");
  }

  const rawPath = url.replace(/^file:/, "");
  return path.resolve(process.cwd(), rawPath);
}

function ensureSchema() {
  const dbPath = sqlitePathFromUrl(databaseUrl);
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "name" TEXT,
      "role" TEXT NOT NULL DEFAULT 'client',
      "passwordHash" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "userId" TEXT NOT NULL,
      "expiresAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "priceCents" INTEGER NOT NULL,
      "accent" TEXT NOT NULL,
      "description" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "CartItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
      CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_key" ON "CartItem" ("userId", "productId");

    CREATE TABLE IF NOT EXISTS "CodexAction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "intent" TEXT NOT NULL,
      "output" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.close();
}

ensureSchema();

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: databaseUrl
  })
});

const products = [
  ["pulse-origin", "Pulse Origin", "core", 475, "blue", "Clean daily energy with a cold electric finish."],
  ["white-volt-zero", "White Volt Zero", "zero", 450, "red", "Bright zero-sugar energy with a sharper edge."],
  ["citrus-drive", "Citrus Drive", "core", 1200, "green", "Fresh citrus lift for training and long city days."],
  ["night-session", "Night Session", "limited", 525, "amber", "Limited evening drop with warm spice and focus."],
  ["recovery-mineral", "Recovery Mineral", "recovery", 495, "mint", "Mineral-led reset for the space after effort."],
  ["cherry-circuit", "Cherry Circuit", "core", 475, "red", "Deep cherry energy with a crisp dry finish."],
  ["glacier-zero", "Glacier Zero", "zero", 450, "blue", "Cool zero-sugar refresh with a clean mineral snap."],
  ["metro-grape", "Metro Grape", "limited", 525, "violet", "Limited grape drop with a polished night profile."],
  ["matcha-drop", "Matcha Drop", "limited", 525, "green", "Limited matcha drop with a clean green lift."]
];

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

for (const [id, name, category, priceCents, accent, description] of products) {
  await prisma.product.upsert({
    where: { id },
    create: { id, name, category, priceCents, accent, description },
    update: { name, category, priceCents, accent, description }
  });
}

await prisma.user.deleteMany({ where: { email: "demo@pulse.test" } });

const users = [
  ["pm@pulse.test", "Product Manager", "product_manager"],
  ["client@pulse.test", "Client", "client"]
];

for (const [email, name, role] of users) {
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      role,
      passwordHash: hashPassword("password123")
    },
    update: { name, role }
  });
}

await prisma.$disconnect();
