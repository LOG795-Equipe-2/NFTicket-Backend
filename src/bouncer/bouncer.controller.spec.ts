import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppwriteService } from '../appwrite/appwrite.service';
import { AppwriteGuard } from '../appwrite/appwrite.guard';
import { BouncerController } from './bouncer.controller';
import { BouncerModule } from './bouncer.module';
import { BouncerService } from './bouncer.service';

describe('BouncerController', () => {
  let controller: BouncerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [BouncerModule, AppwriteService],
      controllers: [BouncerController],
      providers: [BouncerService, ConfigService, AppwriteService],
    }).compile();

    controller = module.get<BouncerController>(BouncerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
