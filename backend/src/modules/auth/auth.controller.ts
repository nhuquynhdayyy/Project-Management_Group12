import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async register(@Body() registerDto: RegisterDto): Promise<User> {
    const user = new User();
    user.username = registerDto.username;
    user.password = registerDto.password;
    user.role = registerDto.role;
    return this.authService.register(user);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto): Promise<User | null> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Post('users/by-role')
  @ApiOperation({ summary: 'Get users by role' })
  @ApiBody({ schema: { type: 'object', properties: { role: { type: 'string', example: 'admin' } } } })
  @ApiResponse({ status: 200, description: 'List of users with the given role.' })
  async getUsersByRole(@Body('role') role: string): Promise<User[]> {
    return this.authService.getUsersByRole(role);
  }
}