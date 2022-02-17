import { Test, TestingModule } from '@nestjs/testing';
import { EosController } from './eos.controller';

describe('EosController', () => {
  let controller: EosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EosController],
    }).compile();

    controller = module.get<EosController>(EosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
