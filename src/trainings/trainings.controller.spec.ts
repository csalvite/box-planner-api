import { Test, TestingModule } from '@nestjs/testing';
import { TrainingsController } from './trainings.controller';

describe('TrainingsController', () => {
  let controller: TrainingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingsController],
    }).compile();

    controller = module.get<TrainingsController>(TrainingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
