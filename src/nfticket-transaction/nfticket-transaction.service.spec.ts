import { Test, TestingModule } from '@nestjs/testing';
import { NfticketTransactionService } from './nfticket-transaction.service';

describe('NfticketTransactionService', () => {
  let service: NfticketTransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NfticketTransactionService],
    }).compile();

    service = module.get<NfticketTransactionService>(NfticketTransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
