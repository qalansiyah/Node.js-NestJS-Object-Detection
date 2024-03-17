import { ApiProperty } from '@nestjs/swagger';

export class ObjectDetectionResponseSchema {
  @ApiProperty({
    type: 'string',
    description: 'Path to the uploaded image',
  })
  image: 'file uploaded';
}
export class ObjectDetectionValidationErrorSchema {
  @ApiProperty({
    type: 'string',
    description: 'Error message',
  })
  message: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        property: { type: 'string' },
        constraints: { type: 'object' },
      },
    },
    description: 'Validation errors',
  })
  errors: {
    property: string;
    constraints: Record<string, any>;
  }[];
}

export class ObjectDetectionBadRequestErrorSchema {
  @ApiProperty({
    type: 'string',
    description: 'Error message',
  })
  message: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        property: { type: 'string' },
        constraints: { type: 'object' },
      },
    },
    description: 'Validation errors',
  })
  errors: {
    property: string;
    constraints: Record<string, any>;
  }[];
}
export class ObjectDetectionSuccessResponseSchema {
  @ApiProperty({
    type: 'file',
    description: 'Processed image',
    format: 'binary',
    required: true,
  })
  image: any;
}

export class ObjectDetectionFileNotFoundErrorSchema {
  @ApiProperty({
    type: 'string',
    description: 'Error message',
  })
  message: string;
}
