import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';
import { NfticketTransactionController } from './nfticket-transaction.controller'
import { NfticketTransactionService } from './nfticket-transaction.service';

@Module({  
    imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration]
    })
  ],
  controllers: [NfticketTransactionController],
  providers: [NfticketTransactionService]
  
})
export class NfticketTransactionModule {}
