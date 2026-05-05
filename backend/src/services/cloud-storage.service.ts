import { Injectable } from '@nestjs/common';

@Injectable()
export class CloudStorageService {
  async uploadImage(buffer: Buffer, filename: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async deleteImage(url: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
