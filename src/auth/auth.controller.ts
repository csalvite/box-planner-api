import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { JwtAuthUser } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth/supabase-auth.guard';
import { AuthUser } from './user/user.decorator';

@ApiTags('auth')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  me(@AuthUser() user: JwtAuthUser) {
    return this.authService.getMe(user);
  }
}
