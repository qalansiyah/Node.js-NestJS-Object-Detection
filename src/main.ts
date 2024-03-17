import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import logger from './logger';

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  const config = new DocumentBuilder()
    .setTitle('Object Detection API')
    .setDescription('API for detecting objects in images')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.use(
    (
      req: { url: string },
      res: { redirect: (arg0: string) => void },
      next: () => void,
    ) => {
      if (req.url === '/') {
        res.redirect('/api');
      } else {
        next();
      }
    },
  );

  app.use((req: { method: any; url: any }, res: any, next: () => void) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });
  await app.listen(3000);
}
bootstrap();
