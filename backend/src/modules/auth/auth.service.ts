import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { Role } from '../../entities/role.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private mailService: MailService,
    private storageService: StorageService,
  ) {}

  async register(user: User, roleNames: string[]): Promise<{ message: string; user: Omit<User, 'password'> }> {
    // Check if username already exists
    const existingUsername = await this.usersRepository.findOne({
      where: { username: user.username },
    });
    if (existingUsername) {
      throw new BadRequestException('Username already exists');
    }

    // Check if email already exists
    if (user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: user.email },
      });
      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Validate password length
    if (user.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;

    // Find roles by names
    const roles: Role[] = [];
    for (const roleName of roleNames) {
      const role = await this.rolesRepository.findOne({
        where: { role_name: roleName },
      });

      if (!role) {
        throw new BadRequestException(`Role "${roleName}" not found`);
      }

      roles.push(role);
    }

    // Assign roles to user
    user.roles = roles;

    // Set email verification fields
    user.is_verified = false;
    user.verification_token = uuidv4();

    // Save user with roles
    const saved = await this.usersRepository.save(user);

    // Send verification email
    if (saved.email && saved.verification_token) {
      const verifyLink = `http://localhost:5173/verify-email?token=${saved.verification_token}`;
      await this.mailService.sendVerificationEmail(saved.email, saved.username, verifyLink);
    }

    const { password, ...result } = saved;
    return {
      message: 'Đăng ký thành công! Kiểm tra email để xác minh tài khoản',
      user: result,
    };
  }

  async login(username: string, password: string): Promise<AuthResponseDto> {
    // Find user by username OR email
    const user = await this.usersRepository.findOne({
      where: [
        { username },
        { email: username }, // Allow login with email
      ],
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin để được hỗ trợ.');
    }

    // Check if email is verified
    if (!user.is_verified) {
      throw new UnauthorizedException('Tài khoản chưa được xác minh. Kiểm tra email của bạn.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersRepository.update(user.id, {
      last_login_at: new Date(),
    });

    // Extract role names for JWT payload
    const roleNames = user.roles.map((role) => role.role_name);

    // Create JWT payload with roles array
    const payload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      roles: roleNames, // Array of role names
    };

    return {
      access_token: this.jwtService.sign(payload),
      id: user.id,
      username: user.username,
      roles: roleNames,
      assigned_area_id: user.assigned_area_id ?? null,
    };
  }

  async validateUser(payload: { sub: number }): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id: payload.sub },
relations: ['roles'],
    });
  }

  async getUsersByRole(roleName: string): Promise<Omit<User, 'password'>[]> {
    // Find users that have the specified role
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('role.role_name = :roleName', { roleName })
      .getMany();

    return users.map(({ password, ...rest }) => rest);
  }

  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepository.find({
      relations: ['roles'],
      order: { created_at: 'DESC' },
    });

    return users.map(({ password, ...rest }) => rest);
  }

  async updateUserRole(userId: number, roleName: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.rolesRepository.findOne({
      where: { role_name: roleName },
    });

    if (!role) {
      throw new BadRequestException(`Role "${roleName}" not found`);
    }

    user.roles = [role];
    user.role = role.role_name;
    const saved = await this.usersRepository.save(user);
    const { password, ...result } = saved;
    return result;
  }

  async updateUserStatus(
    userId: number,
    isActive: boolean,
    currentUserId: number,
    reason?: string,
  ): Promise<Omit<User, 'password'>> {
    if (userId === currentUserId && !isActive) {
      throw new ForbiddenException('Cannot lock the current signed-in account');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousStatus = user.is_active;
    user.is_active = isActive;
    const saved = await this.usersRepository.save(user);

    // Send email notification if status changed and user has email
    if (previousStatus !== isActive && user.email) {
      if (!isActive) {
        // Account locked
        await this.mailService.sendAccountLockedEmail(user.email, user.username, reason);
      } else {
        // Account unlocked
        await this.mailService.sendAccountUnlockedEmail(user.email, user.username);
      }
    }

    const { password, ...result } = saved;
    return result;
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({
      where: { verification_token: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user verification status
    user.is_verified = true;
    user.verification_token = null;
    await this.usersRepository.save(user);

    // Send welcome email
    if (user.email) {
      await this.mailService.sendWelcomeEmail(user.email, user.username);
    }

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Return success even if email doesn't exist (security best practice)
      return {
        success: true,
        message: 'If the email exists, a verification link has been sent',
      };
    }

    if (user.is_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    user.verification_token = uuidv4();
    await this.usersRepository.save(user);

    // Send verification email
    if (user.email && user.verification_token) {
      const verifyLink = `http://localhost:5173/verify-email?token=${user.verification_token}`;
      await this.mailService.sendVerificationEmail(user.email, user.username, verifyLink);
    }

    return {
      success: true,
      message: 'Verification email sent successfully',
    };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: number): Promise<ProfileResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
      roles: user.roles.map((role) => role.role_name),
      created_at: user.created_at,
    };
  }

  /**
   * Update user profile (fullName, email)
   */
  async updateProfile(userId: number, updateDto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateDto.email && updateDto.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: updateDto.email },
      });

      if (existingEmail) {
        throw new BadRequestException('Email already exists');
      }

      user.email = updateDto.email;
    }

    // Update full name if provided
    if (updateDto.full_name !== undefined) {
      user.full_name = updateDto.full_name || null;
    }

    const saved = await this.usersRepository.save(user);

    return {
      id: saved.id,
      username: saved.username,
      full_name: saved.full_name,
      email: saved.email,
      avatar_url: saved.avatar_url,
      roles: saved.roles.map((role) => role.role_name),
      created_at: saved.created_at,
    };
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: number, file: Express.Multer.File): Promise<ProfileResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old avatar if exists
    if (user.avatar_url) {
      await this.storageService.deleteAvatar(user.avatar_url);
    }

    // Upload new avatar
    const avatarUrl = await this.storageService.uploadAvatar(file, userId);
    user.avatar_url = avatarUrl;

    const saved = await this.usersRepository.save(user);

    return {
      id: saved.id,
      username: saved.username,
      full_name: saved.full_name,
      email: saved.email,
      avatar_url: saved.avatar_url,
      roles: saved.roles.map((role) => role.role_name),
      created_at: saved.created_at,
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(changePasswordDto.current_password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.new_password, 10);
    user.password = hashedPassword;

    await this.usersRepository.save(user);

    return {
      message: 'Đổi mật khẩu thành công',
    };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vài phút',
      };
    }

    // Check if user has email
    if (!user.email) {
      return {
        success: true,
        message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vài phút',
      };
    }

    // Generate reset token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

    // Save token to database
    const resetToken = this.passwordResetTokenRepository.create({
      user_id: user.id,
      token,
      expires_at: expiresAt,
      used: false,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    // Send password reset email
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetLink);

    return {
      success: true,
      message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vài phút',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find token
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    // Check if token is expired
    if (new Date() > resetToken.expires_at) {
      throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới');
    }

    // Check if token is already used
    if (resetToken.used) {
      throw new BadRequestException('Token đã được sử dụng');
    }

    // Validate password length
    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersRepository.update(resetToken.user_id, {
      password: hashedPassword,
    });

    // Mark token as used
    resetToken.used = true;
    await this.passwordResetTokenRepository.save(resetToken);

    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  }
}
