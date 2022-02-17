import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EosService } from './eos.service';
import { EosController } from './eos.controller';

@Module({
  imports: [ConfigModule],
  providers: [EosService],
  controllers: [EosController],
})
export class EosModule {}
