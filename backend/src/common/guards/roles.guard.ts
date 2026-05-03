import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles decorator metadata
    let requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // If no roles are specified, default to Admin and Manager
    if (!requiredRoles || requiredRoles.length === 0) {
      requiredRoles = ['Admin', 'Manager'];
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('[RolesGuard] User:', user);
    console.log('[RolesGuard] Required roles:', requiredRoles);

    if (!user || !user.roles) {
      console.log('[RolesGuard] No user or roles found');
      throw new ForbiddenException('Không có quyền truy cập. Chỉ Admin và Manager mới được phép.');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    console.log('[RolesGuard] User roles:', user.roles);
    console.log('[RolesGuard] Has required role:', hasRole);

    if (!hasRole) {
      throw new ForbiddenException('Không có quyền truy cập. Chỉ Admin và Manager mới được phép.');
    }

    return true;
  }
}
