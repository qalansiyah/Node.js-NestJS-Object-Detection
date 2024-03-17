import { ApiProperty } from '@nestjs/swagger';

export class ObjectDetectionSchema {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to detect objects on',
  })
  image_file: any;
}
