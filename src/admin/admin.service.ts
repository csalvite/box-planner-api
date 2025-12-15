import { ForbiddenException, Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ADMIN ONLY
    {
      auth: { persistSession: false },
    },
  );

  constructor(private readonly prisma: PrismaService) {}

  async assertAdmin(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile || profile.role !== 'admin') {
      throw new ForbiddenException('Admin only');
    }
  }

  async createTrainerOrAdmin(
    requesterId: string,
    input: { email: string; role?: 'trainer' | 'admin' },
  ) {
    await this.assertAdmin(requesterId);

    const tempPassword = this.generateTempPassword();

    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (error) throw error;

    const newUser = data.user;
    if (!newUser) throw new Error('Supabase did not return user');

    await this.prisma.profile.upsert({
      where: { id: newUser.id },
      update: {
        email: input.email,
        role: input.role ?? 'trainer',
      },
      create: {
        id: newUser.id,
        email: input.email,
        role: input.role ?? 'trainer',
      },
    });

    return {
      id: newUser.id,
      email: input.email,
      role: input.role ?? 'trainer',
      tempPassword, // para que puedas dársela al entrenador (luego cambiaremos a invite)
    };
  }

  private generateTempPassword() {
    // simple pero decente para dev
    return `Bp-${Math.random().toString(36).slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`.slice(0, 18);
  }
}
