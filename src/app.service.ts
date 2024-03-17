import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import { join } from 'path';
import logger from './logger';

@Injectable()
export class ObjectDetectionService {
  async detectObjectsOnImage(buf: Buffer): Promise<any> {
    try {
      logger.info('Detecting objects on image...');
      const [input, imgWidth, imgHeight] = await this.prepareInput(buf);
      const output = await this.runModel(input);
      return this.processOutput(output, imgWidth, imgHeight);
    } catch (error) {
      logger.error('Error detecting objects on image', error);
    }
  }

  async drawBoundingBoxes(imagePath: string, boxes: any[][]): Promise<void> {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.font = '50px serif';

    boxes.forEach(([x1, y1, x2, y2, label]) => {
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = '#00FF00';
      const width = ctx.measureText(label).width;
      ctx.fillRect(x1, y1, width + 10, 25);
      ctx.fillStyle = '#000000';
      ctx.fillText(label, x1, y1 + 18);
    });

    let out: fs.WriteStream;
    if (imagePath.toLowerCase().endsWith('.png')) {
      out = fs.createWriteStream(join(process.cwd(), 'processed', 'image.png'));
      const stream = canvas.createPNGStream();
      stream.pipe(out);
    } else {
      out = fs.createWriteStream(join(process.cwd(), 'processed', 'image.jpg'));
      const stream = canvas.createJPEGStream();
      stream.pipe(out);
    }
  }

  private async prepareInput(buf: Buffer): Promise<[number[], number, number]> {
    const img = sharp(buf);
    const md = await img.metadata();
    const [imgWidth, imgHeight] = [md.width, md.height];
    const pixels = await img
      .removeAlpha()
      .resize({ width: 640, height: 640, fit: 'fill' })
      .raw()
      .toBuffer();
    const red: number[] = [];
    const green: number[] = [];
    const blue: number[] = [];
    for (let index = 0; index < pixels.length; index += 3) {
      red.push(pixels[index] / 255.0);
      green.push(pixels[index + 1] / 255.0);
      blue.push(pixels[index + 2] / 255.0);
    }
    const input = [...red, ...green, ...blue];
    return [input, imgWidth, imgHeight];
  }

  private async runModel(input: number[]): Promise<Float32Array> {
    const modelPath = join(process.cwd(), 'fs', 'yolo', 'yolov8m.onnx');
    const model = await ort.InferenceSession.create(modelPath);
    const inputTensor = new ort.Tensor(
      Float32Array.from(input),
      [1, 3, 640, 640],
    );
    const outputs = await model.run({ images: inputTensor });
    return outputs['output0'].data;
  }

  private processOutput(
    output: Float32Array,
    imgWidth: number,
    imgHeight: number,
  ): number[][] {
    let boxes: any[][] = [];
    for (let index = 0; index < 8400; index++) {
      const [classId, prob] = [...Array(80).keys()]
        .map((col) => [col, output[8400 * (col + 4) + index]])
        .reduce((accum, item) => (item[1] > accum[1] ? item : accum), [0, 0]);
      if (prob < 0.5) {
        continue;
      }
      const label = yoloClasses[classId];
      const xc = output[index];
      const yc = output[8400 + index];
      const w = output[2 * 8400 + index];
      const h = output[3 * 8400 + index];
      const x1 = ((xc - w / 2) / 640) * imgWidth;
      const y1 = ((yc - h / 2) / 640) * imgHeight;
      const x2 = ((xc + w / 2) / 640) * imgWidth;
      const y2 = ((yc + h / 2) / 640) * imgHeight;
      boxes.push([x1, y1, x2, y2, label, prob]);
    }

    boxes = boxes.sort((box1, box2) => box2[5] - box1[5]);
    const result = [];
    while (boxes.length > 0) {
      result.push(boxes[0]);
      boxes = boxes.filter((box) => this.iou(boxes[0], box) < 0.7);
    }
    return result;
  }

  private iou(box1: number[], box2: number[]): number {
    return this.intersection(box1, box2) / this.union(box1, box2);
  }

  private union(box1: number[], box2: number[]): number {
    const [box1X1, box1Y1, box1X2, box1Y2] = box1;
    const [box2X1, box2Y1, box2X2, box2Y2] = box2;
    const box1Area = (box1X2 - box1X1) * (box1Y2 - box1Y1);
    const box2Area = (box2X2 - box2X1) * (box2Y2 - box2Y1);
    return box1Area + box2Area - this.intersection(box1, box2);
  }

  private intersection(box1: number[], box2: number[]): number {
    const [box1X1, box1Y1, box1X2, box1Y2] = box1;
    const [box2X1, box2Y1, box2X2, box2Y2] = box2;
    const x1 = Math.max(box1X1, box2X1);
    const y1 = Math.max(box1Y1, box2Y1);
    const x2 = Math.min(box1X2, box2X2);
    const y2 = Math.min(box1Y2, box2Y2);
    return (x2 - x1) * (y2 - y1);
  }
}

const yoloClasses = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
];
