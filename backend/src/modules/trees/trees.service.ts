import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tree } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { TreePhysicalLog } from '../../entities/tree-physical-log.entity';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { UpdatePhysicalDto } from './dto/update-physical.dto';
import { PhysicalHistoryQueryDto } from './dto/physical-history-query.dto';

@Injectable()
export class TreesService {
  constructor(
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    @InjectRepository(TreeSpecies)
    private readonly speciesRepository: Repository<TreeSpecies>,
    @InjectRepository(AdministrativeArea)
    private readonly areaRepository: Repository<AdministrativeArea>,
    @InjectRepository(TreePhysicalLog)
    private readonly physicalLogRepository: Repository<TreePhysicalLog>,
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

  async updateHealthStatus(id: number, healthStatus: string): Promise<Tree> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) throw new NotFoundException('Tree not found');
    tree.health_status = healthStatus as any;
    return await this.treeRepository.save(tree);
  }

  async updatePhysical(
    id: number,
    userId: number,
    updatePhysicalDto: UpdatePhysicalDto,
  ): Promise<{ tree: Tree; log: TreePhysicalLog }> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) {
      throw new NotFoundException('Tree not found');
    }

    // Store old values
    const oldValues = {
      height_m: tree.height_m,
      trunk_diameter_cm: tree.trunk_diameter_cm,
      canopy_diameter_m: tree.canopy_diameter_m,
      tilt_degree: tree.tilt_degree,
    };

    // Update tree with new values
    const newValues: any = {};
    if (updatePhysicalDto.height_m !== undefined) {
      tree.height_m = updatePhysicalDto.height_m;
      newValues.height_m = updatePhysicalDto.height_m;
    }
    if (updatePhysicalDto.trunk_diameter_cm !== undefined) {
      tree.trunk_diameter_cm = updatePhysicalDto.trunk_diameter_cm;
      newValues.trunk_diameter_cm = updatePhysicalDto.trunk_diameter_cm;
    }
    if (updatePhysicalDto.canopy_diameter_m !== undefined) {
      tree.canopy_diameter_m = updatePhysicalDto.canopy_diameter_m;
      newValues.canopy_diameter_m = updatePhysicalDto.canopy_diameter_m;
    }
    if (updatePhysicalDto.tilt_degree !== undefined) {
      tree.tilt_degree = updatePhysicalDto.tilt_degree;
      newValues.tilt_degree = updatePhysicalDto.tilt_degree;
    }

    // Save updated tree
    const updatedTree = await this.treeRepository.save(tree);

    // Create physical log
    const log = this.physicalLogRepository.create({
      tree_id: id,
      user_id: userId,
      height_m: updatePhysicalDto.height_m,
      trunk_diameter_cm: updatePhysicalDto.trunk_diameter_cm,
      canopy_diameter_m: updatePhysicalDto.canopy_diameter_m,
      tilt_degree: updatePhysicalDto.tilt_degree,
      old_values: oldValues,
      new_values: newValues,
      notes: updatePhysicalDto.notes,
    });

    const savedLog = await this.physicalLogRepository.save(log);

    return { tree: updatedTree, log: savedLog };
  }

  async getPhysicalHistory(
    id: number,
    query: PhysicalHistoryQueryDto,
  ): Promise<{ data: TreePhysicalLog[]; total: number; page: number; limit: number }> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) {
      throw new NotFoundException('Tree not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await this.physicalLogRepository.findAndCount({
      where: { tree_id: id },
      order: { measured_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
