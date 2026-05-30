import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../entities/role.entity';

const USER_TIMESTAMP_COLUMN =
  process.env.DB_TYPE === 'sqlite'
    ? ('datetime' as const)
    : ('timestamp' as const);

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  full_name: string | null;

  @Column({ type: 'int', nullable: true })
  assigned_area_id: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: USER_TIMESTAMP_COLUMN, nullable: true })
  last_login_at: Date;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Deprecated: Keep for backward compatibility, will be removed
  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string;
}
