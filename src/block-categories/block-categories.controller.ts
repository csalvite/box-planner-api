import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth/supabase-auth.guard';
import { BlockCategoriesService } from './block-categories.service';

@ApiTags('block-categories')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('block-categories')
export class BlockCategoriesController {
  constructor(
    private readonly blockCategoriesService: BlockCategoriesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías de bloques' })
  findAll() {
    return this.blockCategoriesService.findAll();
  }
}
