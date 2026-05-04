import { Test, TestingModule } from '@nestjs/testing';
import { MemberStatus, OrganizationRole, OrganizationType } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const prismaMock = {
    organization: {
      create: jest.fn(),
    },
    organizationMember: {
      findMany: jest.fn(),
    },
  };

  const authServiceMock = {
    ensureProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return active organizations for the authenticated user', async () => {
    authServiceMock.ensureProfile.mockResolvedValue({ id: 'user-1' });
    prismaMock.organizationMember.findMany.mockResolvedValue([
      {
        role: OrganizationRole.OWNER,
        status: MemberStatus.ACTIVE,
        organization: {
          id: 'org-1',
          name: 'Box Gym',
          slug: 'box-gym',
          type: OrganizationType.GYM,
        },
      },
    ]);

    const result = await service.findAll({ id: 'user-1' });

    expect(prismaMock.organizationMember.findMany).toHaveBeenCalledWith({
      where: {
        profileId: 'user-1',
        status: MemberStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        organization: true,
      },
    });
    expect(result).toEqual([
      {
        id: 'org-1',
        name: 'Box Gym',
        slug: 'box-gym',
        type: OrganizationType.GYM,
        membership: {
          role: OrganizationRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      },
    ]);
  });

  it('should create an organization and owner membership', async () => {
    authServiceMock.ensureProfile.mockResolvedValue({ id: 'user-1' });
    prismaMock.organization.create.mockResolvedValue({
      id: 'org-1',
      name: 'Box Gym',
      slug: 'box-gym',
      type: OrganizationType.GYM,
      members: [
        {
          role: OrganizationRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      ],
    });

    const result = await service.create(
      { id: 'user-1', email: 'trainer@example.com' },
      { name: 'Box Gym' },
    );

    expect(prismaMock.organization.create).toHaveBeenCalledWith({
      data: {
        name: 'Box Gym',
        slug: 'box-gym',
        type: OrganizationType.GYM,
        members: {
          create: {
            profileId: 'user-1',
            role: OrganizationRole.OWNER,
            status: MemberStatus.ACTIVE,
          },
        },
      },
      include: {
        members: {
          where: { profileId: 'user-1' },
        },
      },
    });
    expect(result).toEqual({
      id: 'org-1',
      name: 'Box Gym',
      slug: 'box-gym',
      type: OrganizationType.GYM,
      membership: {
        role: OrganizationRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });
  });
});
