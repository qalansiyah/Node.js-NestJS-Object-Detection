import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import * as fs from 'fs';
import { basename, extname, join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiProduces,
} from '@nestjs/swagger';
import { ObjectDetectionService } from './app.service';
import { ObjectDetectionSchema } from './schemas/object.detection.schema';
import {
  ObjectDetectionResponseSchema,
  ObjectDetectionValidationErrorSchema,
  ObjectDetectionBadRequestErrorSchema,
  ObjectDetectionSuccessResponseSchema,
  ObjectDetectionFileNotFoundErrorSchema,
} from './schemas/object.detection.response-schema';
import * as fsExtra from 'fs-extra';
import logger from './logger';

@ApiTags('Object Detection')
@Controller()
export class ObjectDetectionController {
  constructor(
    private readonly objectDetectionService: ObjectDetectionService,
  ) {}

  @ApiOperation({ summary: 'Detect objects on image' })
  @ApiBody({ type: ObjectDetectionSchema })
  @ApiResponse({
    status: 201,
    description: 'Successful uploaded',
    type: ObjectDetectionResponseSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: ObjectDetectionBadRequestErrorSchema,
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable entity',
    type: ObjectDetectionValidationErrorSchema,
  })
  @ApiConsumes('multipart/form-data')
  @Post('detect')
  @UseInterceptors(
    FileInterceptor('image_file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return callback(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async detectObjects(@UploadedFile() imageFile): Promise<void> {
    try {
      const buffer = fs.readFileSync(imageFile.path);
      const boxes =
        await this.objectDetectionService.detectObjectsOnImage(buffer);

      //Save buffer to disk
      const imagePath = join(
        process.cwd(),
        'fs',
        'uploads',
        `${Date.now()}_${imageFile.originalname}`,
      );
      fs.writeFileSync(imagePath, buffer);

      //Call method for drawing frames on images and save to dir
      await this.objectDetectionService.drawBoundingBoxes(imagePath, boxes);

      // delete downloaded file
      fs.unlinkSync(imageFile.path);

      // delete "uploads"
      await fsExtra.emptyDir(join(process.cwd(), 'fs', 'uploads'));

      logger.info('Objects detected successfully.');
    } catch (error: any) {
      logger.error('Error detecting objects on image', error);
    }
  }

  @ApiOperation({ summary: 'Download image with detected objects' })
  @ApiResponse({
    status: 200,
    description: 'Successul downloaded',
    type: ObjectDetectionSuccessResponseSchema,
  })
  @ApiResponse({
    status: 404,
    description: 'Not founded',
    type: ObjectDetectionFileNotFoundErrorSchema,
  })
  @ApiProduces('image/jpeg, image/png')
  @Get('download')
  async downloadImage(@Res() res: Response) {
    //Get path preprossed filed
    const imagePath = join(process.cwd(), 'fs', 'processed', 'image.jpg');

    // Detect only file extension
    const contentType =
      extname(imagePath) === '.png' ? 'image/png' : 'image/jpeg';

    // Get only file name from path
    const fileName = basename(imagePath);

    // Set header for donwload file
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    //res.setHeader('Content-Disposition', `attachment; filename=${imagePath}`);

    res.setHeader('Content-Type', contentType);

    // send file for download
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
    //res.sendFile(imagePath);
    // res.download(imagePath, () => {
    //   res.end();
    // });
  }
}
