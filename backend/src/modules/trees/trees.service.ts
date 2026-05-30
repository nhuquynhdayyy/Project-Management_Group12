import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tree, HealthStatus } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { CreateTreeDto } from './dto/create-tree.dto';
import { UpdateTreeDto } from './dto/update-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditAction } from '../../entities/auditLog.entity';

@Injectable()
export class TreesService {
  constructor(
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    @InjectRepository(TreeSpecies)
    private readonly speciesRepository: Repository<TreeSpecies>,
    @InjectRepository(AdministrativeArea)
    private readonly areaRepository: Repository<AdministrativeArea>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createTreeDto: CreateTreeDto, userId?: number): Promise<Tree> {
    if (!createTreeDto.tree_code) {
      throw new BadRequestException('tree_code is required');
    }

    const species = await this.speciesRepository.findOne({
      where: { id: createTreeDto.species_id },
    });
    if (!species) throw new NotFoundException('Species not found');

    const area = await this.areaRepository.findOne({
      where: { id: createTreeDto.area_id },
    });
    if (!area) throw new NotFoundException('Area not found');

    const location = {
      type: 'Point' as const,
      coordinates: [createTreeDto.longitude, createTreeDto.latitude],
    };

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

    const saved = await this.treeRepository.save(tree);

    // Audit log — fire-and-forget, never throws
    this.auditLogService
      .log(userId ?? null, AuditAction.CREATE, 'tree', saved.id, null, {
        tree_code: saved.tree_code,
        species_id: saved.species_id,
        area_id: saved.area_id,
      })
      .catch(() => {});

    return saved;
  }

  async findTreesWithinRadius(
    findNearbyDto: FindTreesNearbyDto,
  ): Promise<any[]> {
    const { latitude, longitude, radius_meters } = findNearbyDto;
    const wktPoint = `POINT(${longitude} ${latitude})`;

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
      .setParameters({ point: wktPoint, radius: radius_meters })
      .orderBy('distance', 'ASC');

    return await query.getRawMany();
  }

  async findById(id: number): Promise<Tree | null> {
    return await this.treeRepository.findOne({ where: { id } });
  }

  async findAll(filter: { species?: string; health_status?: string } = {}): Promise<Tree[]> {
    const query = this.treeRepository
      .createQueryBuilder('tree')
      .leftJoinAndSelect('tree.species', 'species')
      .leftJoinAndSelect('tree.area', 'area');

    if (filter.species) {
      const speciesTokens = filter.species
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
      const speciesIds = speciesTokens
        .map((token) => Number(token))
        .filter((value) => Number.isInteger(value));
      const speciesNames = speciesTokens
        .filter((token) => !Number.isInteger(Number(token)))
        .map((token) => token.toLowerCase());

      if (speciesIds.length > 0 && speciesNames.length > 0) {
        query.andWhere(
          '(tree.species_id IN (:...speciesIds) OR LOWER(species.common_name) IN (:...speciesNames))',
          { speciesIds, speciesNames },
        );
      } else if (speciesIds.length > 0) {
        query.andWhere('tree.species_id IN (:...speciesIds)', { speciesIds });
      } else if (speciesNames.length > 0) {
        query.andWhere('LOWER(species.common_name) IN (:...speciesNames)', {
          speciesNames,
        });
      }
    }

    if (filter.health_status) {
      if (filter.health_status.toLowerCase() === 'danger') {
        query.andWhere('tree.health_status IN (:...dangerStatuses)', {
          dangerStatuses: [HealthStatus.DISEASED, HealthStatus.DEAD],
        });
      } else {
        query.andWhere('tree.health_status = :healthStatus', {
          healthStatus: filter.health_status,
        });
      }
    }

    return await query.getMany();
  }

  async findSpecies(): Promise<TreeSpecies[]> {
    return await this.speciesRepository.find({ order: { common_name: 'ASC' } });
  }

  async update(
    id: number,
    updateTreeDto: UpdateTreeDto,
    userId?: number,
  ): Promise<Tree> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) throw new NotFoundException('Tree not found');

    if (updateTreeDto.species_id !== undefined) {
      const species = await this.speciesRepository.findOne({
        where: { id: updateTreeDto.species_id },
      });
      if (!species) throw new NotFoundException('Species not found');
    }

    if (updateTreeDto.area_id !== undefined) {
      const area = await this.areaRepository.findOne({
        where: { id: updateTreeDto.area_id },
      });
      if (!area) throw new NotFoundException('Area not found');
    }

    const oldValue = this.toAuditValue(tree);
    const location =
      updateTreeDto.latitude !== undefined ||
      updateTreeDto.longitude !== undefined
        ? {
            type: 'Point' as const,
            coordinates: [
              updateTreeDto.longitude ?? this.getLongitude(tree),
              updateTreeDto.latitude ?? this.getLatitude(tree),
            ] as [number, number],
          }
        : undefined;

    const { latitude, longitude, ...updatableFields } = updateTreeDto;
    void latitude;
    void longitude;

    Object.assign(tree, {
      ...updatableFields,
      ...(location ? { location } : {}),
    });

    const updated = await this.treeRepository.save(tree);

    await this.auditLogService.log(
      userId ?? null,
      AuditAction.UPDATE,
      'tree',
      id,
      oldValue,
      this.toAuditValue(updated),
    );

    return updated;
  }

  async delete(id: number, userId?: number): Promise<void> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) throw new NotFoundException('Tree not found');

    const oldValue = this.toAuditValue(tree);
    await this.treeRepository.remove(tree);
    await this.auditLogService.log(
      userId ?? null,
      AuditAction.DELETE,
      'tree',
      id,
      oldValue,
      null,
    );
  }

  private toAuditValue(tree: Partial<Tree>): Record<string, any> {
    return {
      tree_code: tree.tree_code,
      qr_code: tree.qr_code,
      species_id: tree.species_id,
      area_id: tree.area_id,
      location: tree.location,
      planting_year: tree.planting_year,
      height_m: tree.height_m,
      trunk_diameter_cm: tree.trunk_diameter_cm,
      canopy_diameter_m: tree.canopy_diameter_m,
      tilt_degree: tree.tilt_degree,
      health_status: tree.health_status,
    };
  }

  private getLongitude(tree: Tree): number {
    const location = tree.location as any;
    return typeof location === 'string'
      ? Number(location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)?.[1])
      : location.coordinates[0];
  }

  private getLatitude(tree: Tree): number {
    const location = tree.location as any;
    return typeof location === 'string'
      ? Number(location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/)?.[2])
      : location.coordinates[1];
  }
}
