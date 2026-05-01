import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() user: User): Promise<User> {
    return this.authService.register(user);
  }

  @Post('login')
  async login(@Body() credentials: { username: string; password: string }): Promise<User | null> {
    return this.authService.login(credentials.username, credentials.password);
  }

  @Post('users/by-role')
  async getUsersByRole(@Body() role: string): Promise<User[]> {
    return this.authService.getUsersByRole(role);
  }
}