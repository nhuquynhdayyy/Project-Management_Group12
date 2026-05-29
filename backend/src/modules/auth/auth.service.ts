import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
import { Role } from '../../entities/role.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditAction } from '../../entities/auditLog.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(user: User, roleNames: string[]): Promise<Omit<User, 'password'>> {
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

    // Save user with roles
    const saved = await this.usersRepository.save(user);

    // Update last_login_at
    await this.usersRepository.update(saved.id, {
      last_login_at: new Date(),
    });

    const { password, ...result } = saved;
    return result;
  }

  async login(username: string, password: string): Promise<AuthResponseDto> {
    // Find user with roles (eager loading)
    const user = await this.usersRepository.findOne({
      where: { username },
      relations: ['roles'],
    });

    if (!user) {
      this.auditLogService.log(null, AuditAction.CREATE, 'auth', null, null, {
        action: 'login_failed', reason: 'user_not_found', username,
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      this.auditLogService.log(user.id, AuditAction.CREATE, 'auth', null, null, {
        action: 'login_failed', reason: 'account_inactive', username,
      }).catch(() => {});
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.auditLogService.log(user.id, AuditAction.CREATE, 'auth', null, null, {
        action: 'login_failed', reason: 'invalid_password', username,
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersRepository.update(user.id, {
      last_login_at: new Date(),
    });

    // Extract role names for JWT payload (keep original case for frontend matching)
    const roleNames = user.roles.map((role) => role.role_name);

    // Create JWT payload with roles array
    const payload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      roles: roleNames, // Array of normalized role names
    };

    // Fire-and-forget successful login log
    this.auditLogService.log(user.id, AuditAction.CREATE, 'auth', null, null, {
      action: 'login_success', username, roles: roleNames,
    }).catch(() => {});

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

    user.is_active = isActive;
    const saved = await this.usersRepository.save(user);
    const { password, ...result } = saved;
    return result;
  }
}
