import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';
import { NfticketTransactionController } from './nfticket-transaction.controller'
import { NfticketTransactionService } from './nfticket-transaction.service';
import { AtomicAssetsQueryModule } from '../atomic-assets-query/atomic-assets-query.module';
import { AtomicAssetsQueryService } from 'src/atomic-assets-query/atomic-assets-query.service';

@Module({  
    imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration]
    }),
    AtomicAssetsQueryModule
  ],
  controllers: [NfticketTransactionController],
  providers: [NfticketTransactionService, AtomicAssetsQueryService]
  
})
export class NfticketTransactionModule {}
