import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description:
      'User successfully registered. Password is excluded from response.',
  })
  @ApiResponse({ status: 400, description: 'Bad request or role not found.' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<Omit<User, 'password'>> {
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users by role (requires JWT)' })
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
    description: 'Forbidden. Token is invalid or expired.',
  })
  async getUsersByRole(
    @Body('role') role: string,
  ): Promise<Omit<User, 'password'>[]> {
    return this.authService.getUsersByRole(role);
  }
}
