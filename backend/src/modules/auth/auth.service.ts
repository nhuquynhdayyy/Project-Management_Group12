import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(user: User): Promise<Omit<User, 'password'>> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;
    const saved = await this.usersRepository.save(user);
    const { password, ...result } = saved;
    return result;
  }

  async login(username: string, password: string): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async validateUser(payload: { sub: number }): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id: payload.sub } });
  }

  async getUsersByRole(role: string): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepository.find({ where: { role } });
    return users.map(({ password, ...rest }) => rest);
  }
}

