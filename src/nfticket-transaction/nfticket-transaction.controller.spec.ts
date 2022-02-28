import { Test, TestingModule } from '@nestjs/testing';
import { NfticketTransactionController } from './nfticket-transaction.controller';
import { NfticketTransactionModule } from './nfticket-transaction.module';
import { NfticketTransactionService } from './nfticket-transaction.service';

describe('NfticketTransactionController', () => {
  let controller: NfticketTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [NfticketTransactionModule],
      controllers: [NfticketTransactionController],
      providers: [NfticketTransactionService]
    }).compile();

    controller = module.get<NfticketTransactionController>(NfticketTransactionController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(controller.getHello()).toBe('Hello World!');
    });
  });
});
