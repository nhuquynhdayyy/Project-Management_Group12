import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tree, HealthStatus } from '../../entities/tree.entity';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { TreePhysicalLog } from '../../entities/tree-physical-log.entity';
import { MaintenanceTask, TaskStatus } from '../../entities/maintenance-task.entity';
import { CreateTreeDto } from './dto/create-tree.dto';
import { UpdateTreeDto } from './dto/update-tree.dto';
import { FindTreesNearbyDto } from './dto/find-trees-nearby.dto';
import { UpdatePhysicalDto } from './dto/update-physical.dto';
import { PhysicalHistoryQueryDto } from './dto/physical-history-query.dto';
import { OfflineActionDto } from './dto/sync-trees.dto';
import { AuditLogService } from '../audit-log/auditLog.service';
import { AuditAction } from '../../entities/auditLog.entity';
import * as QRCode from 'qrcode';

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
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(createTreeDto: CreateTreeDto, userId?: number): Promise<Tree> {
    if (!createTreeDto.tree_code) {
      throw new BadRequestException('tree_code is required');
    }

    // Kiểm tra trùng mã cây
    const existingTreeByCode = await this.treeRepository.findOne({
      where: { tree_code: createTreeDto.tree_code },
    });
    if (existingTreeByCode) {
      throw new ConflictException('Mã cây này đã tồn tại');
    }

    // Kiểm tra trùng tọa độ (cho phép sai số 0.00001 độ ~ 1 mét)
    const existingTreeByLocation = await this.findTreeAtLocation(
      createTreeDto.latitude,
      createTreeDto.longitude,
    );
    if (existingTreeByLocation) {
      throw new ConflictException(
        `Tọa độ này đã có một cây khác đăng ký (Mã cây: ${existingTreeByLocation.tree_code})`,
      );
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
      .leftJoinAndSelect('tree.species', 'species')
      .leftJoinAndSelect('tree.area', 'area')
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
        'tree.created_at',
        'tree.updated_at',
        'species.id',
        'species.common_name',
        'species.scientific_name',
        'area.id',
        'area.area_name',
      ])
      .addSelect('ST_AsText(tree.location)', 'location')
      .addSelect(
        'ST_Distance(tree.location::geography, ST_GeomFromText(:point, 4326)::geography)',
        'distance',
      )
      .where(
        'ST_DWithin(tree.location::geography, ST_GeomFromText(:point, 4326)::geography, :radius)',
      )
      .setParameters({ point: wktPoint, radius: radius_meters })
      .orderBy('distance', 'ASC');

    const results = await query.getRawAndEntities();
    
    // Kết hợp entities với distance từ raw results
    return results.entities.map((tree, index) => ({
      ...tree,
      distance: Math.round(results.raw[index].distance), // Làm tròn khoảng cách (mét)
    }));
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

  /**
   * Lấy danh sách tọa độ cây (tối ưu cho heatmap)
   * @param areaId Lọc theo khu vực (tùy chọn)
   * @param speciesId Lọc theo loài cây (tùy chọn)
   * @returns Danh sách ID và tọa độ
   */
  async findLocations(
    areaId?: number,
    speciesId?: number,
  ): Promise<Array<{ id: number; latitude: number; longitude: number }>> {
    const query = this.treeRepository
      .createQueryBuilder('tree')
      .select(['tree.id'])
      .addSelect('ST_Y(tree.location::geometry)', 'latitude')
      .addSelect('ST_X(tree.location::geometry)', 'longitude');

    if (areaId) {
      query.andWhere('tree.area_id = :areaId', { areaId });
    }

    if (speciesId) {
      query.andWhere('tree.species_id = :speciesId', { speciesId });
    }

    const results = await query.getRawMany();
    
    return results.map((row) => ({
      id: row.tree_id,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
    }));
  }

  async update(
    id: number,
    updateTreeDto: UpdateTreeDto,
    userId?: number,
  ): Promise<Tree> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) throw new NotFoundException('Tree not found');

    // Kiểm tra trùng mã cây (nếu đang cập nhật tree_code)
    if (updateTreeDto.tree_code && updateTreeDto.tree_code !== tree.tree_code) {
      const existingTreeByCode = await this.treeRepository.findOne({
        where: { tree_code: updateTreeDto.tree_code },
      });
      if (existingTreeByCode) {
        throw new ConflictException('Mã cây này đã tồn tại');
      }
    }

    // Kiểm tra trùng tọa độ (nếu đang cập nhật vị trí)
    if (updateTreeDto.latitude !== undefined || updateTreeDto.longitude !== undefined) {
      const newLatitude = updateTreeDto.latitude ?? this.getLatitude(tree);
      const newLongitude = updateTreeDto.longitude ?? this.getLongitude(tree);
      
      const existingTreeByLocation = await this.findTreeAtLocation(
        newLatitude,
        newLongitude,
        id, // Loại trừ cây hiện tại
      );
      if (existingTreeByLocation) {
        throw new ConflictException(
          `Tọa độ này đã có một cây khác đăng ký (Mã cây: ${existingTreeByLocation.tree_code})`,
        );
      }
    }

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

  async findAllAreas(): Promise<AdministrativeArea[]> {
    return await this.areaRepository.find({ order: { area_name: 'ASC' } });
  }

  async updateHealthStatus(id: number, healthStatus: string, userId?: number): Promise<Tree> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) throw new NotFoundException('Tree not found');
    
    const oldValue = this.toAuditValue(tree);
    tree.health_status = healthStatus as HealthStatus;
    const updated = await this.treeRepository.save(tree);
    
    // Ghi audit log để lưu lịch sử thay đổi
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

  private async updateHealthStatusInternal(treeId: number, status: string): Promise<void> {
    await this.treeRepository.update(treeId, { health_status: status as HealthStatus });
  }

  /**
   * Generate QR Code for a tree
   * @param id Tree ID
   * @returns PNG buffer of QR code
   */
  async generateQRCode(id: number): Promise<Buffer> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) {
      throw new NotFoundException(`Tree with ID ${id} not found`);
    }

    // Generate QR code string: cayxanh://tree/{id}
    const qrCodeData = `cayxanh://tree/${id}`;

    try {
      // Generate QR code as PNG buffer
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
        type: 'png',
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      return qrCodeBuffer;
    } catch (error) {
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  /**
   * Update qr_code field for a tree
   * @param id Tree ID
   * @returns Updated tree
   */
  async updateQRCodeField(id: number): Promise<Tree> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) {
      throw new NotFoundException(`Tree with ID ${id} not found`);
    }

    // Update qr_code field with the URL format
    tree.qr_code = `cayxanh://tree/${id}`;
    return await this.treeRepository.save(tree);
  }

  // ==========================================
  // 1. TÍNH NĂNG CẬP NHẬT CHỈ SỐ VẬT LÝ (ngyn)
  // ==========================================
  async updatePhysical(
    id: number,
    userId: number,
    updatePhysicalDto: UpdatePhysicalDto,
  ): Promise<{ tree: Tree; log: TreePhysicalLog }> {
    const tree = await this.treeRepository.findOne({ where: { id } });
    if (!tree) {
      throw new NotFoundException('Tree not found');
    }

    // Lưu lại giá trị cũ để làm log
    const oldValues = {
      height_m: tree.height_m,
      trunk_diameter_cm: tree.trunk_diameter_cm,
      canopy_diameter_m: tree.canopy_diameter_m,
      tilt_degree: tree.tilt_degree,
    };

    // Cập nhật các giá trị mới
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

    const updatedTree = await this.treeRepository.save(tree);

    // Tạo nhật ký đo đạc (Physical Log)
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

    return { data, total, page, limit };
  }

  // ==========================================
  // 2. TÍNH NĂNG QR CODE & KIỂM TRA VỊ TRÍ (main)
  // ==========================================
  async findByQRCode(qrCode: string): Promise<Tree | null> {
    return await this.treeRepository.findOne({ 
      where: { qr_code: qrCode },
      relations: ['species', 'area']
    });
  }

  async findAllSpecies(): Promise<TreeSpecies[]> {
    return await this.speciesRepository.find({ order: { common_name: 'ASC' } });
  }

  async checkTreeCodeExists(treeCode: string, excludeId?: number): Promise<boolean> {
    const query = this.treeRepository.createQueryBuilder('tree').where('tree.tree_code = :treeCode', { treeCode });
    if (excludeId) query.andWhere('tree.id != :excludeId', { excludeId });
    const count = await query.getCount();
    return count > 0;
  }

  async checkLocationExists(latitude: number, longitude: number, excludeId?: number): Promise<{ exists: boolean; tree?: { id: number; tree_code: string } }> {
    const tree = await this.findTreeAtLocation(latitude, longitude, excludeId);
    if (tree) {
      return { exists: true, tree: { id: tree.id, tree_code: tree.tree_code } };
    }
    return { exists: false };
  }

  // ==========================================
  // 3. TÍNH NĂNG ĐỒNG BỘ OFFLINE (ngyn)
  // ==========================================
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

        // Chống ghi đè dữ liệu cũ hơn dữ liệu hiện tại trên server
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

  // ==========================================
  // 4. CÁC HÀM PRIVATE HỖ TRỢ
  // ==========================================
  private async findTreeAtLocation(latitude: number, longitude: number, excludeId?: number): Promise<Tree | null> {
    const tolerance = 0.00001; // ~1 mét
    const query = this.treeRepository.createQueryBuilder('tree')
      .where('ABS(ST_X(tree.location::geometry) - :longitude) < :tolerance', { longitude, tolerance })
      .andWhere('ABS(ST_Y(tree.location::geometry) - :latitude) < :tolerance', { latitude, tolerance });
    if (excludeId) query.andWhere('tree.id != :excludeId', { excludeId });
    return await query.getOne();
  }

  private async getSyncTargetUpdatedAt(action: OfflineActionDto): Promise<Date | null> {
    if (action.type === 'task_complete') {
      if (!action.taskId) return null;
      const task = await this.taskRepository.findOne({ where: { id: action.taskId } });
      return task?.updated_at ?? null;
    }
    const tree = await this.treeRepository.findOne({ where: { id: action.treeId } });
    return tree?.updated_at ?? null;
  }

  private getSyncTargetKey(action: OfflineActionDto): string {
    return action.type === 'task_complete' ? `task:${action.taskId ?? 'missing'}` : `tree:${action.treeId}`;
  }

  private async applyOfflineAction(action: OfflineActionDto, userId: number, offlineDate: Date): Promise<void> {
    if (action.type === 'health_update') {
      const healthStatus = action.data.health_status ?? action.data.healthStatus;
      if (!healthStatus) throw new BadRequestException('health_status is required');
      await this.updateHealthStatusInternal(action.treeId, healthStatus);
    } else if (action.type === 'physical_update') {
      await this.updatePhysical(action.treeId, userId, action.data as UpdatePhysicalDto);
    } else if (action.type === 'task_complete') {
      if (!action.taskId) throw new BadRequestException('taskId is required for task_complete');
      const task = await this.taskRepository.findOne({ where: { id: action.taskId } });
      if (!task || task.tree_id !== action.treeId) throw new BadRequestException('Invalid task');
      
      task.status = TaskStatus.COMPLETED;
      task.completed_at = offlineDate;
      if (action.data.notes) task.notes = task.notes ? `${task.notes}\n\nNotes: ${action.data.notes}` : action.data.notes;
      await this.taskRepository.save(task);
    }
  }

  private toSyncResultItem(action: OfflineActionDto): SyncResultItem {
    return { id: action.id, type: action.type, treeId: action.treeId, taskId: action.taskId };
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

  private getLatitude(tree: Tree): number {
    if (typeof tree.location === 'string') {
      throw new BadRequestException('Invalid location format');
    }
    return tree.location.coordinates[1];
  }

  private getLongitude(tree: Tree): number {
    if (typeof tree.location === 'string') {
      throw new BadRequestException('Invalid location format');
    }
    return tree.location.coordinates[0];
  }
}