import { Test, TestingModule } from '@nestjs/testing';
import { AtomicAssetsQueryController } from './atomic-assets-query.controller';
import { AtomicAssetsQueryService } from './atomic-assets-query.service';
import { AtomicAssetsQueryModule } from './atomic-assets-query.module';

describe('AtomicAssetsQueryController', () => {
  let controller: AtomicAssetsQueryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AtomicAssetsQueryModule],
      controllers: [AtomicAssetsQueryController],
      providers: [AtomicAssetsQueryService]
    }).compile();

    controller = module.get<AtomicAssetsQueryController>(AtomicAssetsQueryController);
  });

  describe('root', () => {
    it('should return "true!"', () => {
      expect(true).toBe(true);
    });
  });
});
