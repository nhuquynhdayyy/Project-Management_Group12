import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Notification } from './notification.entity';
import { User } from '../modules/auth/user.entity';

const READ_AT_COLUMN_TYPE =
  process.env.DB_TYPE === 'sqlite'
    ? ('datetime' as const)
    : ('timestamp' as const);

@Entity('notification_recipients')
export class NotificationRecipient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  notification_id: number;

  @ManyToOne(() => Notification, (notification) => notification.recipients, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @Column({ type: 'int' })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: READ_AT_COLUMN_TYPE, nullable: true })
  read_at: Date | null;
}
