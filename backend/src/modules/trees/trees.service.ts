import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tree } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';

@Injectable()
export class TreesService {
  constructor(
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    @InjectRepository(TreeSpecies)
    private readonly speciesRepository: Repository<TreeSpecies>,
    @InjectRepository(AdministrativeArea)
    private readonly areaRepository: Repository<AdministrativeArea>,
  ) {}

  async create(createTreeDto: CreateTreeDto): Promise<Tree> {
    // Validate required fields
    if (!createTreeDto.tree_code) {
      throw new BadRequestException('tree_code is required');
    }

    // Verify species exists
    const species = await this.speciesRepository.findOne({
      where: { id: createTreeDto.species_id },
    });

    if (!species) {
      throw new NotFoundException('Species not found');
    }

    // Verify area exists
    const area = await this.areaRepository.findOne({
      where: { id: createTreeDto.area_id },
    });

    if (!area) {
      throw new NotFoundException('Area not found');
    }

    // Create Point geometry from latitude and longitude
    // GeoJSON format: { type: 'Point', coordinates: [longitude, latitude] }
    // Note: GeoJSON uses [lng, lat] order (longitude first)
    const location = {
      type: 'Point' as const,
      coordinates: [createTreeDto.longitude, createTreeDto.latitude],
    };

    // Create tree entity
    const tree = this.treeRepository.create({
      tree_code: createTreeDto.tree_code,
      qr_code: createTreeDto.qr_code,
      species_id: createTreeDto.species_id,
      area_id: createTreeDto.area_id,
      location,
      planting_year: createTreeDto.planting_year,
      height_m: createTreeDto.height_m,
      trunk_diameter_cm: createTreeDto.trunk_diameter_cm,
      canopy_diameter_m: createTreeDto.canopy_diameter_m,
      tilt_degree: createTreeDto.tilt_degree,
      health_status: createTreeDto.health_status,
      created_by: createTreeDto.created_by,
    });

    return await this.treeRepository.save(tree);
  }

  async findTreesWithinRadius(findNearbyDto: FindTreesNearbyDto): Promise<any[]> {
    const { latitude, longitude, radius_meters } = findNearbyDto;

    // Create GeoJSON Point for the search location
    const searchPoint = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    // Convert GeoJSON to WKT for PostGIS functions
    const wktPoint = `POINT(${longitude} ${latitude})`;

    // Use PostGIS ST_DWithin to find trees within radius
    // ST_Distance returns distance in meters when using geography type
    const query = this.treeRepository
      .createQueryBuilder('tree')
      .select([
        'tree.id',
        'tree.tree_code',
        'tree.qr_code',
        'tree.species_id',
        'tree.area_id',
        'tree.planting_year',
        'tree.height_m',
        'tree.trunk_diameter_cm',
        'tree.canopy_diameter_m',
        'tree.health_status',
        'ST_AsText(tree.location) as location',
      ])
      .addSelect(
        'ST_Distance(tree.location::geography, ST_GeomFromText(:point, 4326)::geography)',
        'distance',
      )
      .where(
        'ST_DWithin(tree.location::geography, ST_GeomFromText(:point, 4326)::geography, :radius)',
      )
      .setParameters({
        point: wktPoint,
        radius: radius_meters,
      })
      .orderBy('distance', 'ASC');

    return await query.getRawMany();
  }

  async findById(id: number): Promise<Tree | null> {
    return await this.treeRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<Tree[]> {
    return await this.treeRepository.find();
  }

  async findAllSpecies(): Promise<TreeSpecies[]> {
    return await this.speciesRepository.find({ order: { common_name: 'ASC' } });
  }

  async findAllAreas(): Promise<AdministrativeArea[]> {
    return await this.areaRepository.find({ order: { area_name: 'ASC' } });
  }
}
