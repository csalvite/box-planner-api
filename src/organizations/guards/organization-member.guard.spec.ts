import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MemberStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationMemberGuard } from './organization-member.guard';

describe('OrganizationMemberGuard', () => {
  let guard: OrganizationMemberGuard;

  const prismaMock = {
    organizationMember: {
      findFirst: jest.fn(),
    },
  };

  const createContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationMemberGuard,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    guard = module.get<OrganizationMemberGuard>(OrganizationMemberGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow active organization members and attach membership', async () => {
    const membership = {
      id: 'membership-1',
      organizationId: 'org-1',
      profileId: 'user-1',
      role: OrganizationRole.OWNER,
      status: MemberStatus.ACTIVE,
    };
    const request = {
      params: { organizationId: 'org-1' },
      user: { id: 'user-1' },
    };

    prismaMock.organizationMember.findFirst.mockResolvedValue(membership);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(prismaMock.organizationMember.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        profileId: 'user-1',
        status: MemberStatus.ACTIVE,
      },
    });
    expect(request).toEqual({
      params: { organizationId: 'org-1' },
      user: { id: 'user-1' },
      organizationMembership: membership,
    });
  });

  it('should reject users without active membership', async () => {
    const request = {
      params: { organizationId: 'org-1' },
      user: { id: 'user-1' },
    };

    prismaMock.organizationMember.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
