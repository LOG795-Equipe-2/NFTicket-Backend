import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NfticketTransactionModule } from './nfticket-transaction/nfticket-transaction.module';
import { AtomicAssetsQueryModule } from './atomic-assets-query/atomic-assets-query.module';
import { AppwriteModule } from './appwrite/appwrite.module';
import { BouncerModule } from './bouncer/bouncer.module';
import { PerformanceAnalyserModule } from './performance-analyser/performance-analyser.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration],
        envFilePath: ['.env', '.appwrite.env']
    }),
    NfticketTransactionModule,
    AtomicAssetsQueryModule,
    AppwriteModule,
    BouncerModule,
    PerformanceAnalyserModule,
    // MongooseModule.forRootAsync({
    //     useFactory: async (configService: ConfigService) => ({
    //         uri: configService.get('MONGO_URI')
    //     }),
    //     inject: [ConfigService]
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
