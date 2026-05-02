import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Tree } from './tree.entity';

@Entity('tree_species')
export class TreeSpecies {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  common_name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  scientific_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => Tree, (tree) => tree.species)
  trees: Tree[];
}
