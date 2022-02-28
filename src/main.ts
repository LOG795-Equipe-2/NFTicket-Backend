import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  console.log(join(__dirname, 'schemas' ))
  app.useStaticAssets(join(__dirname, 'schemas'));
  await app.listen(3000);
}
bootstrap();
