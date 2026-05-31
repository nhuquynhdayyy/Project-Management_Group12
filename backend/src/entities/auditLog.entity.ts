import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../modules/auth/user.entity';

const AUDIT_LOG_JSON_TYPE: any =
  process.env.DB_TYPE === 'sqlite' ? 'simple-json' : 'jsonb';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  COMPLETE = 'COMPLETE',
}

@Entity('audit_logs')
@Index(['user_id', 'created_at'])
@Index(['entity_type', 'entity_id'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  user_id!: number | null;

  // Eager-load the user so the API response includes username without
  // a separate query. Password is stripped in AuditLogService.findAll().
  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 50 })
  entity_type!: string;

  @Column({ type: 'int', nullable: true })
  entity_id!: number | null;

  @Column({ type: AUDIT_LOG_JSON_TYPE, nullable: true })
  old_value!: Record<string, any> | null;

  @Column({ type: AUDIT_LOG_JSON_TYPE, nullable: true })
  new_value!: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
