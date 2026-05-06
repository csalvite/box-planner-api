import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

type CreateConfirmedUserParams = {
  email: string;
  password: string;
  displayName: string;
};

@Injectable()
export class InvitationsAuthService {
  private readonly supabaseAdmin: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabaseAdmin = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: { persistSession: false },
      },
    );
  }

  async createConfirmedUser(params: CreateConfirmedUserParams) {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        display_name: params.displayName,
      },
    });

    if (error) {
      if (this.isExistingUserError(error)) {
        throw new ConflictException(
          'Ya existe una cuenta con este email. Inicia sesión y acepta la invitación.',
        );
      }

      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new BadRequestException('Supabase did not return user');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? params.email,
    };
  }

  private isExistingUserError(error: { message?: string; code?: string }) {
    const message = error.message?.toLowerCase() ?? '';
    const code = error.code?.toLowerCase() ?? '';

    return (
      code.includes('user_already_exists') ||
      (message.includes('already') &&
        (message.includes('registered') || message.includes('exists')))
    );
  }
}
