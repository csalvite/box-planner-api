import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { IsEmail, IsIn, IsOptional } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['trainer', 'admin'])
  role?: 'trainer' | 'admin';
}

@UseGuards(SupabaseAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users')
  createUser(@AuthUser() user: { id: string }, @Body() dto: CreateUserDto) {
    return this.adminService.createTrainerOrAdmin(user.id, dto);
  }
}
