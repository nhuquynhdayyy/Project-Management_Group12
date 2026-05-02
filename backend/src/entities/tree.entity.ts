import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TreeSpecies } from './tree-species.entity';
import { AdministrativeArea } from './administrative-area.entity';

export enum HealthStatus {
  GOOD = 'Tốt',
  WEAK = 'Yếu',
  DISEASED = 'Sâu bệnh',
  DEAD = 'Chết',
}

@Entity('trees')
export class Tree {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  tree_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  qr_code: string;

  @Column({ type: 'int' })
  species_id: number;

  @ManyToOne(() => TreeSpecies, (species) => species.trees, { eager: true })
  @JoinColumn({ name: 'species_id' })
  species: TreeSpecies;

  @Column({ type: 'int' })
  area_id: number;

  @ManyToOne(() => AdministrativeArea, (area) => area.trees, { eager: true })
  @JoinColumn({ name: 'area_id' })
  area: AdministrativeArea;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  } | string;

  @Column({ type: 'int', nullable: true })
  planting_year: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height_m: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  trunk_diameter_cm: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  canopy_diameter_m: number;

  @Column({ type: 'int', nullable: true })
  tilt_degree: number;

  @Column({
    type: 'varchar',
    length: 100,
    default: HealthStatus.GOOD,
  })
  health_status: HealthStatus;

  @Column({ type: 'timestamp', nullable: true })
  last_maintained_at: Date;

  @Column({ type: 'int', nullable: true })
  created_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
