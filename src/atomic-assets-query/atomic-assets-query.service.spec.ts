import { Test, TestingModule } from '@nestjs/testing';
import { AtomicAssetsQueryService } from './atomic-assets-query.service';

describe('AtomicAssetsQueryService', () => {
  let service: AtomicAssetsQueryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AtomicAssetsQueryService],
    }).compile();

    service = module.get<AtomicAssetsQueryService>(AtomicAssetsQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
