import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('AuthController - Profile Management', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    updateAvatar: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockProfileResponse: ProfileResponseDto = {
    id: 1,
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    roles: ['Admin'],
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const req = { user: { userId: 1 } };
      mockAuthService.getProfile.mockResolvedValue(mockProfileResponse);

      const result = await controller.getProfile(req);

      expect(result).toEqual(mockProfileResponse);
      expect(service.getProfile).toHaveBeenCalledWith(1);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const req = { user: { userId: 1 } };
      const updateDto: UpdateProfileDto = {
        full_name: 'Updated Name',
        email: 'updated@example.com',
      };

      mockAuthService.updateProfile.mockResolvedValue({
        ...mockProfileResponse,
        full_name: updateDto.full_name,
        email: updateDto.email,
      });

      const result = await controller.updateProfile(req, updateDto);

      expect(result.full_name).toBe(updateDto.full_name);
      expect(result.email).toBe(updateDto.email);
      expect(service.updateProfile).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar', async () => {
      const req = { user: { userId: 1 } };
      const mockFile = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
        size: 1024,
      } as Express.Multer.File;

      const updatedProfile = {
        ...mockProfileResponse,
        avatar_url: 'https://example.com/new-avatar.jpg',
      };

      mockAuthService.updateAvatar.mockResolvedValue(updatedProfile);

      const result = await controller.updateAvatar(req, mockFile);

      expect(result.avatar_url).toBe(updatedProfile.avatar_url);
      expect(service.updateAvatar).toHaveBeenCalledWith(1, mockFile);
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const req = { user: { userId: 1 } };
      const changePasswordDto: ChangePasswordDto = {
        current_password: 'oldPassword123',
        new_password: 'newPassword123',
      };

      mockAuthService.changePassword.mockResolvedValue({
        message: 'Đổi mật khẩu thành công',
      });

      const result = await controller.changePassword(req, changePasswordDto);

      expect(result.message).toBe('Đổi mật khẩu thành công');
      expect(service.changePassword).toHaveBeenCalledWith(1, changePasswordDto);
    });
  });
});
