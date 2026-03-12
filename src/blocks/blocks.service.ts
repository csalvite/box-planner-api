import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBlockDto) {
    return this.prisma.block.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        level: dto.level,
        isPublic: dto.isPublic ?? false,
        category: dto.categoryId
          ? { connect: { id: dto.categoryId } }
          : undefined,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.block.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        category: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    return block;
  }

  async update(id: string, userId: string, dto: UpdateBlockDto) {
    await this.findOne(id, userId);

    return this.prisma.block.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        level: dto.level,
        isPublic: dto.isPublic,
        category: dto.categoryId
          ? { connect: { id: dto.categoryId } }
          : dto.categoryId === null
            ? { disconnect: true }
            : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.block.delete({
      where: { id },
    });
  }
}
