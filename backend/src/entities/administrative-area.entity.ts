import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Tree } from './tree.entity';

const AREA_BOUNDARY_COLUMN =
  process.env.DB_TYPE === 'sqlite'
    ? { type: 'simple-json' as const, nullable: true }
    : {
        type: 'geometry' as const,
        spatialFeatureType: 'Polygon',
        srid: 4326,
        nullable: true,
      };

@Entity('administrative_areas')
export class AdministrativeArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  area_name: string;

  @Column(AREA_BOUNDARY_COLUMN)
  boundary: any;

  @Column({ type: 'int', nullable: true })
  parent_id: number | null;

  @ManyToOne(() => AdministrativeArea, (area) => area.children, {
    nullable: true,
  })
  parent: AdministrativeArea;

  @OneToMany(() => AdministrativeArea, (area) => area.parent)
  children: AdministrativeArea[];

  @OneToMany(() => Tree, (tree) => tree.area)
  trees: Tree[];
}
