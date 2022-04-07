import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { AtomicAssetsQueryModule } from '../atomic-assets-query/atomic-assets-query.module';
import { PerformanceAnalyserService } from './performance-analyser.service';
import { PerformanceAnalyserController } from './performance-analyser.controller';
import configuration from '../config/configuration';

@Module({  
    imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration]
    })
  ],
  providers: [AppwriteService, PerformanceAnalyserService],
  controllers: [PerformanceAnalyserController]
  
})
export class PerformanceAnalyserModule {}
