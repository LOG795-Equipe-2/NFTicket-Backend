import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EosModule } from './eos/eos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true
    }),
    EosModule,
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
