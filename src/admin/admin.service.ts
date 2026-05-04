import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemberStatus, OrganizationRole } from '@prisma/client';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly supabaseAdmin: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.supabaseAdmin = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: { persistSession: false },
      },
    );
  }

  async assertAdmin(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        profileId: userId,
        status: MemberStatus.ACTIVE,
        role: { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN] },
      },
    });

    if (!membership) {
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
      },
      create: {
        id: newUser.id,
        email: input.email,
      },
    });

    return {
      id: newUser.id,
      email: input.email,
      role: input.role ?? 'trainer',
      tempPassword,
    };
  }

  private generateTempPassword() {
    return `Bp-${Math.random().toString(36).slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`.slice(0, 18);
  }
}
