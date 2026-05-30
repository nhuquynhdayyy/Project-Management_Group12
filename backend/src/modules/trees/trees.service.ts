import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tree } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { TreePhysicalLog } from '../../entities/tree-physical-log.entity';
import { MaintenanceTask, TaskStatus } from '../../entities/maintenance-task.entity';
import { CreateTreeDto } from './dto/create-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { UpdatePhysicalDto } from './dto/update-physical.dto';
import { PhysicalHistoryQueryDto } from './dto/physical-history-query.dto';
import { OfflineActionDto } from './dto/sync-trees.dto';

export interface SyncResultItem {
  id?: string;
  type: string;
  treeId: number;
  taskId?: number;
}

export interface SyncErrorItem extends SyncResultItem {
  message: string;
}

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
    @InjectRepository(MaintenanceTask)
    private readonly taskRepository: Repository<MaintenanceTask>,
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

  async syncOfflineActions(
    actions: OfflineActionDto[],
    userId: number,
  ): Promise<{ synced: SyncResultItem[]; skipped: SyncResultItem[]; errors: SyncErrorItem[] }> {
    const synced: SyncResultItem[] = [];
    const skipped: SyncResultItem[] = [];
    const errors: SyncErrorItem[] = [];
    const targetUpdatedAtByKey = new Map<string, Date>();

    for (const action of actions) {
      const item = this.toSyncResultItem(action);
      const targetKey = this.getSyncTargetKey(action);

      try {
        const offlineDate = new Date(action.offlineTimestamp);
        if (Number.isNaN(offlineDate.getTime())) {
          errors.push({ ...item, message: 'Invalid offlineTimestamp' });
          continue;
        }

        const targetUpdatedAt = targetUpdatedAtByKey.has(targetKey)
          ? targetUpdatedAtByKey.get(targetKey)
: await this.getSyncTargetUpdatedAt(action);
        if (!targetUpdatedAt) {
          errors.push({ ...item, message: action.type === 'task_complete' ? 'Task not found' : 'Tree not found' });
          continue;
        }
        targetUpdatedAtByKey.set(targetKey, targetUpdatedAt);

        if (offlineDate.getTime() <= targetUpdatedAt.getTime()) {
          skipped.push(item);
          continue;
        }

        await this.applyOfflineAction(action, userId, offlineDate);
        targetUpdatedAtByKey.set(targetKey, offlineDate);
        synced.push(item);
      } catch (error: any) {
        errors.push({ ...item, message: error?.message || 'Sync failed' });
      }
    }

    return { synced, skipped, errors };
  }

  private async getSyncTargetUpdatedAt(action: OfflineActionDto): Promise<Date | null> {
    if (action.type === 'task_complete') {
      if (!action.taskId) {
        return null;
      }
      const task = await this.taskRepository.findOne({ where: { id: action.taskId } });
      return task?.updated_at ?? null;
    }

    const tree = await this.treeRepository.findOne({ where: { id: action.treeId } });
    return tree?.updated_at ?? null;
  }

  private getSyncTargetKey(action: OfflineActionDto): string {
    return action.type === 'task_complete'
      ? `task:${action.taskId ?? 'missing'}`
      : `tree:${action.treeId}`;
  }

  private async applyOfflineAction(
    action: OfflineActionDto,
    userId: number,
    offlineDate: Date,
  ): Promise<void> {
    if (action.type === 'health_update') {
      const healthStatus = action.data.health_status ?? action.data.healthStatus;
      if (!healthStatus) {
        throw new BadRequestException('health_status is required');
      }
      await this.updateHealthStatus(action.treeId, healthStatus);
      return;
    }

    if (action.type === 'physical_update') {
      await this.updatePhysical(action.treeId, userId, action.data as UpdatePhysicalDto);
      return;
    }

    if (!action.taskId) {
      throw new BadRequestException('taskId is required for task_complete');
    }

    const task = await this.taskRepository.findOne({ where: { id: action.taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.tree_id !== action.treeId) {
      throw new BadRequestException('Task does not belong to tree');
    }

    task.status = TaskStatus.COMPLETED;
    task.completed_at = offlineDate;
    if (action.data.notes) {
      task.notes = task.notes
        ? `${task.notes}\n\nCompletion notes: ${action.data.notes}`
        : action.data.notes;
    }

    await this.taskRepository.save(task);
  }

  private toSyncResultItem(action: OfflineActionDto): SyncResultItem {
    return {
      id: action.id,
      type: action.type,
      treeId: action.treeId,
      taskId: action.taskId,
    };
  }
}
