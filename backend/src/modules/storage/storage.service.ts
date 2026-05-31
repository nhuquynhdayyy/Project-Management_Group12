import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private avatarBucket = 'avatars';

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload avatar image to Supabase storage
   * @param file - The file buffer to upload
   * @param userId - User ID for organizing files
   * @returns Public URL of the uploaded file
   */
  async uploadAvatar(file: Express.Multer.File, userId: number): Promise<string> {
    try {
      // Generate unique filename
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}/${uuidv4()}.${fileExt}`;

      // Upload to Supabase
      const { data, error } = await this.supabase.storage
        .from(this.avatarBucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new InternalServerErrorException(`Failed to upload avatar: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.avatarBucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload avatar to storage');
    }
  }

  /**
   * Delete avatar from Supabase storage
   * @param avatarUrl - Full URL of the avatar to delete
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(avatarUrl);
      const pathParts = url.pathname.split(`/${this.avatarBucket}/`);
      if (pathParts.length < 2) {
        return; // Invalid URL format, skip deletion
      }

      const filePath = pathParts[1];

      // Delete from Supabase
      const { error } = await this.supabase.storage
        .from(this.avatarBucket)
        .remove([filePath]);

      if (error) {
        console.error('Failed to delete old avatar:', error.message);
        // Don't throw error, just log it
      }
    } catch (error) {
      console.error('Error deleting avatar:', error);
      // Don't throw error, just log it
    }
  }
}
