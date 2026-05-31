import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Notification,
  NotificationAudience,
  NotificationSeverity,
} from '../../entities/notification.entity';
import { NotificationRecipient } from '../../entities/notification-recipient.entity';
import { User } from '../auth/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationRecipient)
    private readonly recipientRepository: Repository<NotificationRecipient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateNotificationDto, createdBy?: number | null) {
    const roles =
      dto.audience === NotificationAudience.ALL
        ? ['Staff', 'Manager']
        : (dto.roles ?? []);

    if (roles.length === 0) {
      throw new BadRequestException('At least one target role is required');
    }

    const users = await this.findUsersByRoles(roles);
    const notification = await this.notificationRepository.save(
      this.notificationRepository.create({
        title: dto.title,
        content: dto.content,
        audience: dto.audience,
        severity: dto.severity ?? NotificationSeverity.NORMAL,
        target_roles: roles,
        created_by: createdBy ?? null,
      }),
    );

    if (users.length > 0) {
      await this.recipientRepository.save(
        users.map((user) =>
          this.recipientRepository.create({
            notification_id: notification.id,
            user_id: user.id,
            read_at: null,
          }),
        ),
      );
    }

    return {
      ...notification,
      recipient_count: users.length,
    };
  }

  async notifyManagers(title: string, content: string, createdBy?: number | null) {
    return this.create(
      {
        title,
        content,
        audience: NotificationAudience.ROLES,
        severity: NotificationSeverity.URGENT,
        roles: ['Manager'],
      },
      createdBy,
    );
  }

  async notifyUsers(
    userIds: number[],
    title: string,
    content: string,
    createdBy?: number | null,
  ) {
    const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueUserIds.length === 0) {
      return { recipient_count: 0 };
    }

    const notification = await this.notificationRepository.save(
      this.notificationRepository.create({
        title,
        content,
        audience: NotificationAudience.ROLES,
        severity: NotificationSeverity.NORMAL,
        target_roles: null,
        created_by: createdBy ?? null,
      }),
    );

    await this.recipientRepository.save(
      uniqueUserIds.map((userId) =>
        this.recipientRepository.create({
          notification_id: notification.id,
          user_id: userId,
          read_at: null,
        }),
      ),
    );

    return {
      ...notification,
      recipient_count: uniqueUserIds.length,
    };
  }

  async findMine(userId: number) {
    return this.recipientRepository.find({
      where: { user_id: userId },
      order: { notification: { created_at: 'DESC' } },
    });
  }

  async countUnread(userId: number) {
    return this.recipientRepository.count({
      where: { user_id: userId, read_at: IsNull() },
    });
  }

  async markRead(id: number, userId: number) {
    const recipient = await this.recipientRepository.findOne({
      where: { notification_id: id, user_id: userId },
    });
    if (!recipient) throw new NotFoundException('Notification not found');

    recipient.read_at = new Date();
    return this.recipientRepository.save(recipient);
  }

  private async findUsersByRoles(roles: string[]) {
    const normalized = roles.map((role) => role.toLowerCase());
    const users = await this.userRepository.find({ relations: ['roles'] });

    return users.filter((user) => {
      const roleNames = [
        ...(user.roles ?? []).map((role) => role.role_name.toLowerCase()),
        user.role?.toLowerCase(),
      ].filter(Boolean);
      return roleNames.some((role) => normalized.includes(role));
    });
  }
}
