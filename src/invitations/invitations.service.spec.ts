import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  InvitationStatus,
  MemberStatus,
  OrganizationRole,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsEmailService } from './invitations-email.service';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const prismaMock = {
    invitation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const authServiceMock = {
    ensureProfile: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string) =>
      key === 'FRONTEND_URL' ? 'http://localhost:3000' : undefined,
    ),
  };

  const invitationsEmailServiceMock = {
    sendInvitationEmail: jest.fn(),
  };

  const coachMembership = {
    id: 'membership-1',
    organizationId: 'org-1',
    profileId: 'coach-1',
    role: OrganizationRole.COACH,
    status: MemberStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    configServiceMock.get.mockImplementation((key: string) =>
      key === 'FRONTEND_URL' ? 'http://localhost:3000' : undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: InvitationsEmailService,
          useValue: invitationsEmailServiceMock,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  it('should create a pending viewer invitation by default', async () => {
    const invitation = {
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
    };
    prismaMock.invitation.create.mockResolvedValue(invitation);
    invitationsEmailServiceMock.sendInvitationEmail.mockResolvedValue(false);

    const result = await service.create('coach-1', 'org-1', coachMembership, {
      email: 'Student@Example.com',
    });

    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        email: 'student@example.com',
        role: OrganizationRole.VIEWER,
        status: InvitationStatus.PENDING,
        token: expect.any(String),
        invitedById: 'coach-1',
        expiresAt: expect.any(Date),
      },
    });
    expect(invitationsEmailServiceMock.sendInvitationEmail).toHaveBeenCalledWith(
      {
        to: 'student@example.com',
        inviteUrl: expect.stringMatching(
          /^http:\/\/localhost:3000\/invite\?token=/,
        ),
      },
    );
    expect(result).toEqual({
      invitation,
      inviteUrl: expect.stringMatching(
        /^http:\/\/localhost:3000\/invite\?token=/,
      ),
      emailSent: false,
    });
  });

  it('should mark email as sent when invitation email is delivered', async () => {
    const invitation = {
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
    };
    prismaMock.invitation.create.mockResolvedValue(invitation);
    invitationsEmailServiceMock.sendInvitationEmail.mockResolvedValue(true);

    const result = await service.create('coach-1', 'org-1', coachMembership, {
      email: 'student@example.com',
    });

    expect(result.emailSent).toBe(true);
  });

  it('should keep the invitation when sending the email fails', async () => {
    const invitation = {
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
    };
    prismaMock.invitation.create.mockResolvedValue(invitation);
    invitationsEmailServiceMock.sendInvitationEmail.mockRejectedValue(
      new Error('resend unavailable'),
    );

    const result = await service.create('coach-1', 'org-1', coachMembership, {
      email: 'student@example.com',
    });

    expect(prismaMock.invitation.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      invitation,
      inviteUrl: expect.stringMatching(
        /^http:\/\/localhost:3000\/invite\?token=/,
      ),
      emailSent: false,
    });
  });

  it('should list invitations for manageable organization members', async () => {
    const invitations = [{ id: 'invitation-1', organizationId: 'org-1' }];
    prismaMock.invitation.findMany.mockResolvedValue(invitations);

    const result = await service.findAll('org-1', coachMembership);

    expect(prismaMock.invitation.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: true,
        acceptedBy: true,
      },
    });
    expect(result).toEqual(invitations);
  });

  it('should reject viewer members from creating invitations', async () => {
    await expect(
      service.create(
        'viewer-1',
        'org-1',
        { ...coachMembership, role: OrganizationRole.VIEWER },
        { email: 'student@example.com' },
      ),
    ).rejects.toThrow('Invitation access denied');

    expect(prismaMock.invitation.create).not.toHaveBeenCalled();
  });

  it('should preview an invitation without sensitive fields', async () => {
    const expiresAt = new Date('2099-05-12T00:00:00.000Z');
    prismaMock.invitation.findUnique.mockResolvedValue({
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
      status: InvitationStatus.PENDING,
      expiresAt,
      organization: {
        name: 'Box Academy',
      },
    });

    const result = await service.preview('token-1');

    expect(prismaMock.invitation.findUnique).toHaveBeenCalledWith({
      where: { token: 'token-1' },
      select: {
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });
    expect(result).toEqual({
      organizationName: 'Box Academy',
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
      status: InvitationStatus.PENDING,
      expiresAt,
    });
  });

  it('should preview expired pending invitations as expired', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
      status: InvitationStatus.PENDING,
      expiresAt: new Date('2020-05-12T00:00:00.000Z'),
      organization: {
        name: 'Box Academy',
      },
    });

    const result = await service.preview('token-1');

    expect(result.status).toBe(InvitationStatus.EXPIRED);
  });

  it('should accept an invitation and create membership when missing', async () => {
    const invitation = {
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
      token: 'token-1',
      status: InvitationStatus.PENDING,
      expiresAt: new Date('2099-05-12T00:00:00.000Z'),
    };
    const profile = { id: 'student-1', email: 'student@example.com' };
    const acceptedInvitation = {
      ...invitation,
      status: InvitationStatus.ACCEPTED,
    };

    prismaMock.invitation.findUnique.mockResolvedValue(invitation);
    authServiceMock.ensureProfile.mockResolvedValue(profile);
    prismaMock.organizationMember.findUnique.mockResolvedValue(null);
    prismaMock.organizationMember.create.mockResolvedValue({
      id: 'membership-2',
    });
    prismaMock.invitation.update.mockResolvedValue(acceptedInvitation);

    const result = await service.accept(
      { id: 'student-1', email: 'Student@Example.com' },
      { token: 'token-1' },
    );

    expect(prismaMock.organizationMember.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        profileId: 'student-1',
        role: OrganizationRole.VIEWER,
        status: MemberStatus.ACTIVE,
      },
    });
    expect(prismaMock.invitation.update).toHaveBeenCalledWith({
      where: { id: 'invitation-1' },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedById: 'student-1',
        acceptedAt: expect.any(Date),
      },
      include: {
        organization: true,
      },
    });
    expect(result).toEqual(acceptedInvitation);
  });

  it('should reject accepting with a different email', async () => {
    const invitation = {
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
      token: 'token-1',
      status: InvitationStatus.PENDING,
      expiresAt: new Date('2099-05-12T00:00:00.000Z'),
    };

    prismaMock.invitation.findUnique.mockResolvedValue(invitation);

    await expect(
      service.accept(
        { id: 'student-1', email: 'other@example.com' },
        { token: 'token-1' },
      ),
    ).rejects.toThrow('Invitation email does not match authenticated user');

    expect(authServiceMock.ensureProfile).not.toHaveBeenCalled();
    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it('should not create duplicate membership when accepting', async () => {
    const invitation = {
      id: 'invitation-1',
      organizationId: 'org-1',
      email: 'student@example.com',
      role: OrganizationRole.VIEWER,
      token: 'token-1',
      status: InvitationStatus.PENDING,
      expiresAt: new Date('2099-05-12T00:00:00.000Z'),
    };

    prismaMock.invitation.findUnique.mockResolvedValue(invitation);
    authServiceMock.ensureProfile.mockResolvedValue({ id: 'student-1' });
    prismaMock.organizationMember.findUnique.mockResolvedValue({
      id: 'membership-1',
    });
    prismaMock.invitation.update.mockResolvedValue({
      ...invitation,
      status: InvitationStatus.ACCEPTED,
    });

    await service.accept(
      { id: 'student-1', email: 'student@example.com' },
      { token: 'token-1' },
    );

    expect(prismaMock.organizationMember.create).not.toHaveBeenCalled();
  });
});
