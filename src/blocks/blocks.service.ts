import { Injectable, NotFoundException } from '@nestjs/common';
import { Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, organizationId: string, dto: CreateBlockDto) {
    return this.prisma.block.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        level: dto.level,
        visibility: dto.isPublic ? Visibility.PUBLIC : Visibility.PRIVATE,
        categoryId: dto.categoryId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.block.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        id,
        organizationId,
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

  async update(id: string, organizationId: string, dto: UpdateBlockDto) {
    await this.findOne(id, organizationId);

    return this.prisma.block.update({
      where: { id, organizationId },
      data: {
        name: dto.name,
        description: dto.description,
        level: dto.level,
        visibility:
          dto.isPublic === undefined
            ? undefined
            : dto.isPublic
              ? Visibility.PUBLIC
              : Visibility.PRIVATE,
        category: dto.categoryId
          ? { connect: { id: dto.categoryId } }
          : dto.categoryId === null
            ? { disconnect: true }
            : undefined,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.block.delete({
      where: { id, organizationId },
    });
  }
}
