import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config'; // para cargar DATABASE_URL desde .env

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Mejor fallar rápido si no hay URL
  throw new Error(
    'DATABASE_URL is not set. Please define it in your .env file.',
  );
}

// Creamos el pool de Postgres
const pool = new pg.Pool({
  connectionString,
});

// Creamos el adapter para Prisma
const adapter = new PrismaPg(pool);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter,
      // Si quieres logs:
      // log: ['query', 'error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await pool.end();
  }
}
