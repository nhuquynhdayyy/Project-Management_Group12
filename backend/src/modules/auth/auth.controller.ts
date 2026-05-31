import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered. Verification email sent.' })
  @ApiResponse({ status: 400, description: 'Bad request or role not found.' })
  async register(@Body() registerDto: RegisterDto): Promise<{ message: string; user: Omit<User, 'password'> }> {
    const user = new User();
    user.username = registerDto.username;
    user.email = registerDto.email || null;
    user.password = registerDto.password;
    user.full_name = registerDto.full_name || null;

    return this.authService.register(user, registerDto.roles);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns a JWT access token.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logout activity logged.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT.',
  })
  async logout(@Request() req): Promise<{ success: true }> {
    const userId = req.user?.userId ?? req.user?.id;
    await this.authService.logout(userId, req.user?.username);
    return { success: true };
  }

  @Post('users/by-role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users by role (Admin/Manager only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { role: { type: 'string', example: 'admin' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'List of users with the given role. Passwords excluded.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid JWT.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Admin or Manager role required.',
  })
  async getUsersByRole(
    @Body('role') role: string,
  ): Promise<Omit<User, 'password'>[]> {
    return this.authService.getUsersByRole(role);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users. Passwords excluded.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only.' })
  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    return this.authService.getAllUsers();
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all staff users (Admin and Manager can access)' })
  @ApiResponse({ status: 200, description: 'List of staff users. Passwords excluded.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin and Manager only.' })
  async getStaffUsers(): Promise<Omit<User, 'password'>[]> {
    return this.authService.getAllUsers();
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
@ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated. Password excluded.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only.' })
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ): Promise<Omit<User, 'password'>> {
    return this.authService.updateUserRole(Number(id), role);
  }

  @Patch('users/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lock or unlock user account (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['is_active'],
      properties: {
        is_active: { type: 'boolean', example: false },
        reason: { type: 'string', example: 'Nhân viên nghỉ việc' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User status updated. Password excluded.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only or cannot lock self.' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @Body('reason') reason: string | undefined,
    @Request() req: { user: { userId?: number; sub?: number; id?: number } },
  ): Promise<Omit<User, 'password'>> {
    const currentUserId = req.user.userId ?? req.user.sub ?? req.user.id ?? 0;
    return this.authService.updateUserStatus(Number(id), isActive, currentUserId, reason);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiQuery({ name: 'token', type: String, description: 'Email verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string): Promise<{ success: boolean; message: string }> {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent if email exists' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: { user: { userId?: number; sub?: number; id?: number } }): Promise<ProfileResponseDto> {
    const userId = req.user.userId ?? req.user.sub ?? req.user.id ?? 0;
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile (fullName, email)' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Request() req: { user: { userId?: number; sub?: number; id?: number } },
    @Body() updateDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const userId = req.user.userId ?? req.user.sub ?? req.user.id ?? 0;
    return this.authService.updateProfile(userId, updateDto);
  }

  @Patch('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user avatar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar updated', type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAvatar(
    @Request() req: { user: { userId?: number; sub?: number; id?: number } },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ProfileResponseDto> {
    const userId = req.user.userId ?? req.user.sub ?? req.user.id ?? 0;
    return this.authService.updateAvatar(userId, file);
  }

  @Patch('profile/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @Request() req: { user: { userId?: number; sub?: number; id?: number } },
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const userId = req.user.userId ?? req.user.sub ?? req.user.id ?? 0;
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent if email exists' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.new_password);
  }
}
