import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Tree } from './tree.entity';

@Entity('tree_physical_logs')
export class TreePhysicalLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tree_id: number;

  @ManyToOne(() => Tree, { eager: false })
  @JoinColumn({ name: 'tree_id' })
  tree: Tree;

  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height_m: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  trunk_diameter_cm: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  canopy_diameter_m: number;

  @Column({ type: 'int', nullable: true })
  tilt_degree: number;

  @Column({ type: 'jsonb', nullable: true })
  old_values: {
    height_m?: number;
    trunk_diameter_cm?: number;
    canopy_diameter_m?: number;
    tilt_degree?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  new_values: {
    height_m?: number;
    trunk_diameter_cm?: number;
    canopy_diameter_m?: number;
    tilt_degree?: number;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  measured_at: Date;
}
