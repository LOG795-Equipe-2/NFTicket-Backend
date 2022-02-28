import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration]
    }),
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
