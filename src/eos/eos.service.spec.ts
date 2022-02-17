import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EosService } from './eos.service';

describe('EosService', () => {
  let service: EosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [EosService],
    }).compile();

    service = module.get<EosService>(EosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
