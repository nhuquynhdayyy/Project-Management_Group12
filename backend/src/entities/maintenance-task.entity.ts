import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tree } from './tree.entity';
import { User } from '../modules/auth/user.entity';

export enum TaskType {
  PRUNING = 'Cắt tỉa',
  FERTILIZING = 'Bón phân',
  WATERING = 'Tưới nước',
  INSPECTION = 'Kiểm tra',
}

export enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In_Progress',
  COMPLETED = 'Completed',
}

@Entity('maintenance_tasks')
export class MaintenanceTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tree_id: number;

  @ManyToOne(() => Tree, { eager: true })
  @JoinColumn({ name: 'tree_id' })
  tree: Tree;

  @Column({ type: 'int' })
  assigned_to: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User;

  @Column({
    type: 'varchar',
    length: 100,
  })
  task_type: TaskType;

  @Column({
    type: 'varchar',
    length: 50,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ type: 'date' })
  scheduled_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  evidence_image_url: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
