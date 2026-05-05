import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered. Password is excluded from response.' })
  @ApiResponse({ status: 400, description: 'Bad request or role not found.' })
  async register(@Body() registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
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
  @ApiResponse({ status: 200, description: 'Returns a JWT access token.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Post('users/by-role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users by role (requires JWT)' })
  @ApiBody({ schema: { type: 'object', properties: { role: { type: 'string', example: 'admin' } } } })
  @ApiResponse({ status: 200, description: 'List of users with the given role. Passwords excluded.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Token is invalid or expired.' })
  async getUsersByRole(@Body('role') role: string): Promise<Omit<User, 'password'>[]> {
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
  @ApiResponse({ status: 200, description: 'User status updated. Password excluded.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin only or cannot lock self.' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @Request() req: { user: { userId?: number; sub?: number; id?: number } },
  ): Promise<Omit<User, 'password'>> {
    const currentUserId = req.user.userId ?? req.user.sub ?? req.user.id ?? 0;
    return this.authService.updateUserStatus(Number(id), isActive, currentUserId);
  }
}
