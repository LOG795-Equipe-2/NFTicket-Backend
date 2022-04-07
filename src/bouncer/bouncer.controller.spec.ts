import { Test, TestingModule } from '@nestjs/testing';
import { BouncerController } from './bouncer.controller';
import { BouncerService } from './bouncer.service';

describe('BouncerController', () => {
  let controller: BouncerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BouncerController],
      providers: [BouncerService],
    }).compile();

    controller = module.get<BouncerController>(BouncerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
