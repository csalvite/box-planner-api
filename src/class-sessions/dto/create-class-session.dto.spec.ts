import { ClassSessionStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateClassSessionDto } from './create-class-session.dto';

describe('CreateClassSessionDto', () => {
  const validateDto = (payload: Record<string, unknown>) =>
    validate(plainToInstance(CreateClassSessionDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('should allow targetDurationMinutes within range', async () => {
    const errors = await validateDto({
      title: 'Morning class',
      startsAt: '2026-05-06T10:00:00.000Z',
      status: ClassSessionStatus.SCHEDULED,
      targetDurationMinutes: 60,
    });

    expect(errors).toHaveLength(0);
  });

  it('should reject targetDurationMinutes outside the allowed range', async () => {
    const tooSmallErrors = await validateDto({
      title: 'Morning class',
      targetDurationMinutes: 0,
    });
    const tooLargeErrors = await validateDto({
      title: 'Morning class',
      targetDurationMinutes: 301,
    });

    expect(tooSmallErrors).toHaveLength(1);
    expect(tooLargeErrors).toHaveLength(1);
  });

  it('should reject durationMinutes and estimatedDurationMinutes as input', async () => {
    const errors = await validateDto({
      title: 'Morning class',
      durationMinutes: 60,
      estimatedDurationMinutes: 60,
    });

    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'durationMinutes',
      'estimatedDurationMinutes',
    ]);
  });
});
