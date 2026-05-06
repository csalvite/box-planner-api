import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberStatus, OrganizationRole } from '@prisma/client';
import { BlocksController } from '../../blocks/blocks.controller';
import { ClassSessionsController } from '../../class-sessions/class-sessions.controller';
import { ExercisesController } from '../../exercises/exercises.controller';
import { TrainingsController } from '../../trainings/trainings.controller';
import { OrganizationRoleGuard } from './organization-role.guard';

describe('OrganizationRoleGuard', () => {
  let guard: OrganizationRoleGuard;

  const viewerMembership = {
    id: 'membership-viewer',
    organizationId: 'org-1',
    profileId: 'viewer-1',
    role: OrganizationRole.VIEWER,
    status: MemberStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const coachMembership = {
    ...viewerMembership,
    id: 'membership-coach',
    profileId: 'coach-1',
    role: OrganizationRole.COACH,
  };

  const createContext = (
    controller: new (...args: never[]) => unknown,
    handler: (...args: never[]) => unknown,
    membership = viewerMembership,
  ) =>
    ({
      getClass: () => controller,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({
          organizationMembership: membership,
        }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    guard = new OrganizationRoleGuard(new Reflector());
  });

  it.each([
    ['block', BlocksController, BlocksController.prototype.create],
    ['exercise', ExercisesController, ExercisesController.prototype.create],
    ['training', TrainingsController, TrainingsController.prototype.create],
    [
      'classSession',
      ClassSessionsController,
      ClassSessionsController.prototype.create,
    ],
  ])('should reject viewers from creating %s', (_name, controller, handler) => {
    expect(() =>
      guard.canActivate(createContext(controller, handler)),
    ).toThrow(ForbiddenException);
  });

  it('should allow coaches to create organization content', () => {
    expect(
      guard.canActivate(
        createContext(
          BlocksController,
          BlocksController.prototype.create,
          coachMembership,
        ),
      ),
    ).toBe(true);
  });
});
