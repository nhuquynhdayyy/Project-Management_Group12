import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationRecipient } from './notification-recipient.entity';

export enum NotificationSeverity {
  NORMAL = 'normal',
  URGENT = 'urgent',
}

export enum NotificationAudience {
  ALL = 'all',
  ROLES = 'roles',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20, default: NotificationSeverity.NORMAL })
  severity: NotificationSeverity;

  @Column({ type: 'varchar', length: 20, default: NotificationAudience.ALL })
  audience: NotificationAudience;

  @Column({ type: 'simple-array', nullable: true })
  target_roles: string[] | null;

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @OneToMany(() => NotificationRecipient, (recipient) => recipient.notification)
  recipients: NotificationRecipient[];

  @CreateDateColumn()
  created_at: Date;
}
