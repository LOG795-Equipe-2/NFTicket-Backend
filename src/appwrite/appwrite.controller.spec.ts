import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppwriteController } from './appwrite.controller';
import { AppwriteService } from './appwrite.service';

describe('AppwriteController', () => {
  let controller: AppwriteController;
  let service: AppwriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [AppwriteController],
      providers: [AppwriteService],
    }).compile();

    controller = module.get<AppwriteController>(AppwriteController);
    service = module.get<AppwriteService>(AppwriteService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deleteAllEvents', async () => {
    jest.spyOn(service, "deleteAllEvents").mockImplementationOnce(() => undefined);

    await controller.deleteAllEvents({ confirm: "true" });
    expect(service.deleteAllEvents).toBeCalled();
  });

  it('deleteAllEvents - no confirmation', async () => {
    jest.spyOn(service, "deleteAllEvents").mockImplementationOnce(() => undefined);

    await controller.deleteAllEvents({});
    expect(service.deleteAllEvents).toBeCalledTimes(0);
  });
});
