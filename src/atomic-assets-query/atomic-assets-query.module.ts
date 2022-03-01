import { Module } from '@nestjs/common';
import configuration from '../config/configuration';
import { ConfigModule } from '@nestjs/config';
import { AtomicAssetsQueryController } from './atomic-assets-query.controller'
import { AtomicAssetsQueryService } from './atomic-assets-query.service';

@Module({  
    imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration]
    })
  ],
  controllers: [AtomicAssetsQueryController],
  providers: [AtomicAssetsQueryService],
  exports: [AtomicAssetsQueryService]
})
export class AtomicAssetsQueryModule {}