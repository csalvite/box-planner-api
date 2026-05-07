import { ClassSessionStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateClassSessionDto } from './update-class-session.dto';

describe('UpdateClassSessionDto', () => {
  const validateDto = (payload: Record<string, unknown>) =>
    validate(plainToInstance(UpdateClassSessionDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('should allow trainingId uuid and enum status', async () => {
    const errors = await validateDto({
      trainingId: '11111111-1111-4111-8111-111111111111',
      status: ClassSessionStatus.SCHEDULED,
    });

    expect(errors).toHaveLength(0);
  });

  it('should allow trainingId null', async () => {
    const errors = await validateDto({
      trainingId: null,
    });

    expect(errors).toHaveLength(0);
  });
});
