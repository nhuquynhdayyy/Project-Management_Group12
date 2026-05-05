import { Test, TestingModule } from '@nestjs/testing';
import { CloudStorageService } from './cloud-storage.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

describe('CloudStorageService', () => {
  let service: CloudStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudStorageService],
    }).compile();

    service = module.get<CloudStorageService>(CloudStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // uploadImage
  // ─────────────────────────────────────────────────────────────────────────────
  describe('uploadImage', () => {
    it('should upload image buffer and return public URL as string', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const filename = 'evidence-task-123.jpg';

      // Act
      const result = await service.uploadImage(imageBuffer, filename);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^https?:\/\//); // URL should start with http:// or https://
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate unique URLs for different uploads', async () => {
      // Arrange
      const imageBuffer1 = Buffer.from('fake-image-data-1');
      const imageBuffer2 = Buffer.from('fake-image-data-2');
      const filename1 = 'evidence-1.jpg';
      const filename2 = 'evidence-2.jpg';

      // Act
      const url1 = await service.uploadImage(imageBuffer1, filename1);
      const url2 = await service.uploadImage(imageBuffer2, filename2);

      // Assert
      expect(url1).not.toBe(url2);
    });

    it('should throw BadRequestException when buffer is empty', async () => {
      // Arrange
      const emptyBuffer = Buffer.from('');
      const filename = 'empty-file.jpg';

      // Act & Assert
      await expect(service.uploadImage(emptyBuffer, filename)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage(emptyBuffer, filename)).rejects.toThrow(
        'Image buffer cannot be empty',
      );
    });

    it('should throw BadRequestException when buffer is null or undefined', async () => {
      // Arrange
      const filename = 'test.jpg';

      // Act & Assert
      await expect(service.uploadImage(null as any, filename)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage(undefined as any, filename)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when filename is empty', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const emptyFilename = '';

      // Act & Assert
      await expect(service.uploadImage(imageBuffer, emptyFilename)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage(imageBuffer, emptyFilename)).rejects.toThrow(
        'Filename cannot be empty',
      );
    });

    it('should handle large image buffers', async () => {
      // Arrange
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const filename = 'large-image.jpg';

      // Act
      const result = await service.uploadImage(largeBuffer, filename);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^https?:\/\//);
    });

    it('should accept various image file extensions', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const extensions = ['image.jpg', 'photo.jpeg', 'picture.png', 'graphic.webp'];

      // Act & Assert
      for (const filename of extensions) {
        const result = await service.uploadImage(imageBuffer, filename);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // deleteImage
  // ─────────────────────────────────────────────────────────────────────────────
  describe('deleteImage', () => {
    it('should delete image successfully and return void', async () => {
      // Arrange
      const imageUrl = 'https://storage.example.com/evidence/task-123.jpg';

      // Act
      const result = await service.deleteImage(imageUrl);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should throw BadRequestException when URL is empty', async () => {
      // Arrange
      const emptyUrl = '';

      // Act & Assert
      await expect(service.deleteImage(emptyUrl)).rejects.toThrow(BadRequestException);
      await expect(service.deleteImage(emptyUrl)).rejects.toThrow('Image URL cannot be empty');
    });

    it('should throw BadRequestException when URL is null or undefined', async () => {
      // Act & Assert
      await expect(service.deleteImage(null as any)).rejects.toThrow(BadRequestException);
      await expect(service.deleteImage(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when URL does not exist in storage', async () => {
      // Arrange
      const nonExistentUrl = 'https://storage.example.com/evidence/non-existent-file.jpg';

      // Act & Assert
      await expect(service.deleteImage(nonExistentUrl)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.deleteImage(nonExistentUrl)).rejects.toThrow(
        'Failed to delete image: file not found',
      );
    });

    it('should throw BadRequestException when URL format is invalid', async () => {
      // Arrange
      const invalidUrl = 'not-a-valid-url';

      // Act & Assert
      await expect(service.deleteImage(invalidUrl)).rejects.toThrow(BadRequestException);
      await expect(service.deleteImage(invalidUrl)).rejects.toThrow('Invalid image URL format');
    });

    it('should handle deletion of multiple different URLs', async () => {
      // Arrange
      const url1 = 'https://storage.example.com/evidence/task-1.jpg';
      const url2 = 'https://storage.example.com/evidence/task-2.jpg';

      // Act & Assert
      await expect(service.deleteImage(url1)).resolves.toBeUndefined();
      await expect(service.deleteImage(url2)).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Integration scenarios
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Integration scenarios', () => {
    it('should upload and then delete an image successfully', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const filename = 'temp-evidence.jpg';

      // Act
      const uploadedUrl = await service.uploadImage(imageBuffer, filename);
      const deleteResult = await service.deleteImage(uploadedUrl);

      // Assert
      expect(uploadedUrl).toBeDefined();
      expect(deleteResult).toBeUndefined();
    });

    it('should handle concurrent uploads', async () => {
      // Arrange
      const buffer1 = Buffer.from('image-1');
      const buffer2 = Buffer.from('image-2');
      const buffer3 = Buffer.from('image-3');

      // Act
      const [url1, url2, url3] = await Promise.all([
        service.uploadImage(buffer1, 'concurrent-1.jpg'),
        service.uploadImage(buffer2, 'concurrent-2.jpg'),
        service.uploadImage(buffer3, 'concurrent-3.jpg'),
      ]);

      // Assert
      expect(url1).toBeDefined();
      expect(url2).toBeDefined();
      expect(url3).toBeDefined();
      expect(new Set([url1, url2, url3]).size).toBe(3); // All URLs should be unique
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('should handle filenames with special characters', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const specialFilename = 'evidence-task_123-photo (1).jpg';

      // Act
      const result = await service.uploadImage(imageBuffer, specialFilename);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle very long filenames', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const longFilename = 'a'.repeat(200) + '.jpg';

      // Act
      const result = await service.uploadImage(imageBuffer, longFilename);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle filenames with unicode characters', async () => {
      // Arrange
      const imageBuffer = Buffer.from('fake-image-data');
      const unicodeFilename = 'bằng-chứng-công-việc-123.jpg';

      // Act
      const result = await service.uploadImage(imageBuffer, unicodeFilename);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
