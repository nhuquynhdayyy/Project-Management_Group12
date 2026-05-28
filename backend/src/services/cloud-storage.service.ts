import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

if (!global.WebSocket) {
  (global as any).WebSocket = ws;
}

@Injectable()
export class CloudStorageService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    const bucketName = this.configService.get<string>('SUPABASE_BUCKET');

    if (!supabaseUrl || !supabaseKey || !bucketName) {
      throw new Error(
        'Missing Supabase configuration. Please set SUPABASE_URL, SUPABASE_SERVICE_KEY, and SUPABASE_BUCKET in .env',
      );
    }

    this.bucketName = bucketName;
    // this.supabase = createClient(supabaseUrl, supabaseKey);
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }

  // async uploadImage(buffer: Buffer, filename: string): Promise<string> {
  //   // Validate buffer
  //   if (!buffer || buffer.length === 0) {
  //     throw new BadRequestException('Image buffer cannot be empty');
  //   }

  //   // Validate filename
  //   if (!filename || filename.trim() === '') {
  //     throw new BadRequestException('Filename cannot be empty');
  //   }

  //   // Generate unique filename with timestamp
  //   const timestamp = Date.now();
  //   const uniqueFilename = `${timestamp}_${filename}`;

  //   try {
  //     // Upload to Supabase storage
  //     const { data, error } = await this.supabase.storage
  //       .from(this.bucketName)
  //       .upload(uniqueFilename, buffer, {
  //         contentType: this.getContentType(filename),
  //         upsert: false,
  //       });

  //     if (error) {
  //       throw new InternalServerErrorException(
  //         `Failed to upload image: ${error.message}`,
  //       );
  //     }

  //     // Get public URL
  //     const { data: publicUrlData } = this.supabase.storage
  //       .from(this.bucketName)
  //       .getPublicUrl(uniqueFilename);

  //     return publicUrlData.publicUrl;
  //   } catch (error) {
  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException(
  //       `Failed to upload image: ${error.message}`,
  //     );
  //   }
  // }
  async uploadImage(buffer: Buffer, filename: string): Promise<string> {
    if (!buffer || buffer.length === 0) throw new BadRequestException('Image buffer cannot be empty');
    
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}_${filename}`;

    // LOG ĐỂ KIỂM TRA (Hãy nhìn vào terminal sau khi bấm upload)
    console.log('--- CHECK CONFIG ---');
    console.log('URL:', this.configService.get('SUPABASE_URL'));
    console.log('BUCKET:', this.bucketName);

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(uniqueFilename, buffer, {
          contentType: this.getContentType(filename),
          upsert: false,
        });

      if (error) {
        // In lỗi chi tiết từ Supabase ra terminal
        console.error('SUPABASE ERROR:', error);
        throw new InternalServerErrorException(`Supabase upload error: ${error.message}`);
      }

      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFilename);

      return publicUrlData.publicUrl;
    } catch (error) {
      // In lỗi hệ thống (như fetch failed) ra terminal
      console.error('SYSTEM ERROR:', error);
      throw new InternalServerErrorException(`Failed to upload image: ${error.message}`);
    }
  }

  async deleteImage(url: string): Promise<void> {
    // Validate URL
    if (!url || url.trim() === '') {
      throw new BadRequestException('Image URL cannot be empty');
    }

    // Validate URL format
    if (!this.isValidUrl(url)) {
      throw new BadRequestException('Invalid image URL format');
    }

    try {
      // Extract filename from URL
      const filename = this.extractFilenameFromUrl(url);

      if (!filename) {
        throw new BadRequestException('Could not extract filename from URL');
      }

      // Delete from Supabase storage
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filename]);

      if (error) {
        throw new InternalServerErrorException(
          `Failed to delete image: ${error.message}`,
        );
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to delete image: ${error.message}`,
      );
    }
  }

  /**
   * Extract filename from Supabase public URL
   * Example: https://ebonnyaibdpplvjerjnk.supabase.co/storage/v1/object/public/evidence-images/1234567890_photo.jpg
   * Returns: 1234567890_photo.jpg
   */
  private extractFilenameFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1];
    } catch {
      return null;
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
    };
    return contentTypes[extension || ''] || 'application/octet-stream';
  }
}