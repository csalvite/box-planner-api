import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { AuthUser } from 'src/auth/user/user.decorator';
import { SupabaseAuthGuard } from 'src/auth/supabase-auth/supabase-auth.guard';

@UseGuards(SupabaseAuthGuard)
@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  create(@AuthUser() user: { id: string }, @Body() dto: CreateBlockDto) {
    return this.blocksService.create(user.id, dto);
  }

  @Get()
  findAll(@AuthUser() user: { id: string }) {
    return this.blocksService.findAll(user.id);
  }

  @Get(':id')
  findOne(@AuthUser() user: { id: string }, @Param('id') id: string) {
    return this.blocksService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @AuthUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBlockDto,
  ) {
    return this.blocksService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@AuthUser() user: { id: string }, @Param('id') id: string) {
    return this.blocksService.remove(id, user.id);
  }
}
