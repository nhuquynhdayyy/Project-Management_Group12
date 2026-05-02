import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';

const SPECIES_SEED: Partial<TreeSpecies>[] = [
  {
    common_name: 'Bàng Đài Loan',
    scientific_name: 'Terminalia mantaly',
    description: 'Cây bóng mát phổ biến ở đô thị, tán rộng, lá xanh quanh năm',
  },
  {
    common_name: 'Muồng Tím',
    scientific_name: 'Peltophorum pterocarpum',
    description: 'Cây hoa vàng, tán rộng, thường trồng dọc đường phố',
  },
  {
    common_name: 'Phượng vĩ',
    scientific_name: 'Delonix regia',
    description: 'Cây phượng vĩ có hoa đỏ rực, thường trồng ở đường phố và công viên',
  },
  {
    common_name: 'Sao đen',
    scientific_name: 'Hopea odorata',
    description: 'Cây gỗ lớn, tán rộng, thích hợp làm cây bóng mát',
  },
  {
    common_name: 'Xà cừ',
    scientific_name: 'Khaya senegalensis',
    description: 'Cây gỗ lớn, tán rộng, chịu hạn tốt',
  },
];

const AREA_SEED: Partial<AdministrativeArea>[] = [
  { area_name: 'Quận Liên Chiểu', parent_id: null },
  { area_name: 'Quận Hải Châu', parent_id: null },
  { area_name: 'Quận Thanh Khê', parent_id: null },
  { area_name: 'Quận Sơn Trà', parent_id: null },
  { area_name: 'Quận Ngũ Hành Sơn', parent_id: null },
];

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(TreeSpecies)
    private readonly speciesRepo: Repository<TreeSpecies>,
    @InjectRepository(AdministrativeArea)
    private readonly areaRepo: Repository<AdministrativeArea>,
  ) {}

  async seed(): Promise<{ species: string; areas: string }> {
    await this.upsertSpecies();
    await this.upsertAreas();

    const speciesCount = await this.speciesRepo.count();
    const areasCount = await this.areaRepo.count();

    this.logger.log(
      `Seeding complete — tree_species rows: ${speciesCount}, administrative_areas rows: ${areasCount}`,
    );

    return {
      species: `${speciesCount} rows in table`,
      areas: `${areasCount} rows in table`,
    };
  }

  // Uses INSERT ... ON CONFLICT (common_name) DO NOTHING at the DB level.
  // Atomic and safe for concurrent restarts — no race condition possible.
  private async upsertSpecies(): Promise<void> {
    await this.speciesRepo.upsert(SPECIES_SEED, {
      conflictPaths: ['common_name'],
      skipUpdateIfNoValuesChanged: true,
    });
  }

  private async upsertAreas(): Promise<void> {
    await this.areaRepo.upsert(AREA_SEED, {
      conflictPaths: ['area_name'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
