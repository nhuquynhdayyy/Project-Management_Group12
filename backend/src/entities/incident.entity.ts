import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tree } from './tree.entity';
import { User } from '../modules/auth/user.entity';

const INCIDENT_TIMESTAMP_COLUMN =
  process.env.DB_TYPE === 'sqlite'
    ? ('datetime' as const)
    : ('timestamp' as const);

export enum IncidentStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tree_id: number;

  @ManyToOne(() => Tree, { eager: true })
  @JoinColumn({ name: 'tree_id' })
  tree: Tree;

  @Column({ type: 'int' })
  reported_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_by' })
  reporter: User;

  @Column({ type: 'varchar', length: 100 })
  incident_type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', length: 30, default: IncidentStatus.NEW })
  status: IncidentStatus;

  @Column({ type: INCIDENT_TIMESTAMP_COLUMN, nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
