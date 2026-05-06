import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationMembersService } from './organization-members.service';

describe('OrganizationMembersService', () => {
  let service: OrganizationMembersService;

  const prismaMock = {
    organizationMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const ownerMembership = {
    id: 'membership-owner',
    organizationId: 'org-1',
    profileId: 'owner-1',
    role: OrganizationRole.OWNER,
    status: MemberStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const coachMembership = {
    ...ownerMembership,
    id: 'membership-coach',
    profileId: 'coach-1',
    role: OrganizationRole.COACH,
  };

  const viewerMembership = {
    ...ownerMembership,
    id: 'membership-viewer',
    profileId: 'viewer-1',
    role: OrganizationRole.VIEWER,
  };

  const memberSelect = {
    id: true,
    role: true,
    status: true,
    createdAt: true,
    profile: {
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationMembersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<OrganizationMembersService>(
      OrganizationMembersService,
    );
  });

  it('should list organization members for coaches', async () => {
    const members = [
      {
        id: 'membership-1',
        role: OrganizationRole.VIEWER,
        status: MemberStatus.ACTIVE,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        profile: {
          id: 'student-1',
          email: 'student@example.com',
          displayName: 'Student',
          avatarUrl: null,
        },
      },
    ];
    prismaMock.organizationMember.findMany.mockResolvedValue(members);

    const result = await service.findAll('org-1', coachMembership);

    expect(prismaMock.organizationMember.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { createdAt: 'asc' },
      select: memberSelect,
    });
    expect(result).toEqual(members);
  });

  it('should reject viewers from listing members', async () => {
    await expect(service.findAll('org-1', viewerMembership)).rejects.toThrow(
      ForbiddenException,
    );

    expect(prismaMock.organizationMember.findMany).not.toHaveBeenCalled();
  });

  it('should update members for admins and owners', async () => {
    const target = {
      ...ownerMembership,
      id: 'member-1',
      profileId: 'student-1',
      role: OrganizationRole.VIEWER,
    };
    const updated = {
      ...target,
      role: OrganizationRole.COACH,
      status: MemberStatus.SUSPENDED,
    };
    prismaMock.organizationMember.findFirst.mockResolvedValue(target);
    prismaMock.organizationMember.update.mockResolvedValue(updated);

    const result = await service.update('org-1', 'member-1', ownerMembership, {
      role: OrganizationRole.COACH,
      status: MemberStatus.SUSPENDED,
    });

    expect(prismaMock.organizationMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: {
        role: OrganizationRole.COACH,
        status: MemberStatus.SUSPENDED,
      },
      select: memberSelect,
    });
    expect(result).toEqual(updated);
  });

  it('should reject coaches from updating members', async () => {
    await expect(
      service.update('org-1', 'member-1', coachMembership, {
        status: MemberStatus.SUSPENDED,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prismaMock.organizationMember.update).not.toHaveBeenCalled();
  });

  it('should mark members as removed instead of deleting them', async () => {
    const target = {
      ...ownerMembership,
      id: 'member-1',
      profileId: 'student-1',
      role: OrganizationRole.VIEWER,
    };
    const removed = {
      ...target,
      status: MemberStatus.REMOVED,
    };
    prismaMock.organizationMember.findFirst.mockResolvedValue(target);
    prismaMock.organizationMember.update.mockResolvedValue(removed);

    const result = await service.remove('org-1', 'member-1', ownerMembership);

    expect(prismaMock.organizationMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: MemberStatus.REMOVED },
      select: memberSelect,
    });
    expect(result).toEqual(removed);
  });

  it('should prevent the only owner from removing themselves', async () => {
    prismaMock.organizationMember.findFirst.mockResolvedValue(ownerMembership);
    prismaMock.organizationMember.count.mockResolvedValue(1);

    await expect(
      service.remove('org-1', 'membership-owner', ownerMembership),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.organizationMember.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        role: OrganizationRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });
    expect(prismaMock.organizationMember.update).not.toHaveBeenCalled();
  });
});
