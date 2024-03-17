import { Module } from '@nestjs/common';
import { ObjectDetectionController } from './app.controller';
import { ObjectDetectionService } from './app.service';

@Module({
  controllers: [ObjectDetectionController],
  providers: [ObjectDetectionService],
})
export class AppModule {}
