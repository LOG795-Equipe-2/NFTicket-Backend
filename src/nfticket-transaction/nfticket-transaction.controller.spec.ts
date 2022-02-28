import { Test, TestingModule } from '@nestjs/testing';
import { NfticketTransactionController } from './nfticket-transaction.controller';

describe('NfticketTransactionController', () => {
  let controller: NfticketTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NfticketTransactionController],
    }).compile();

    controller = module.get<NfticketTransactionController>(NfticketTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
