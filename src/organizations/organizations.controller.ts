import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtAuthUser } from '../auth/auth.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { AuthUser } from '../auth/user/user.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar organizaciones del usuario' })
  findAll(@AuthUser() user: JwtAuthUser) {
    return this.organizationsService.findAll(user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear organización' })
  create(
    @AuthUser() user: JwtAuthUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(user, dto);
  }
}
