import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Tree } from './tree.entity';

@Entity('administrative_areas')
export class AdministrativeArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  area_name: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  boundary: string;

  @Column({ type: 'int', nullable: true })
  parent_id: number | null;

  @ManyToOne(() => AdministrativeArea, (area) => area.children, { nullable: true })
  parent: AdministrativeArea;

  @OneToMany(() => AdministrativeArea, (area) => area.parent)
  children: AdministrativeArea[];

  @OneToMany(() => Tree, (tree) => tree.area)
  trees: Tree[];
}
