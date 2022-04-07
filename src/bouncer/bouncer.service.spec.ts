import { Test, TestingModule } from '@nestjs/testing';
import { BouncerService } from './bouncer.service';

describe('BouncerService', () => {
  let service: BouncerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BouncerService],
    }).compile();

    service = module.get<BouncerService>(BouncerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
