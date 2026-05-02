import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { Role } from '../../entities/role.entity';
import { User } from '../../modules/auth/user.entity';
import * as bcrypt from 'bcrypt';

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

const ROLE_SEED: Partial<Role>[] = [
  {
    role_name: 'Admin',
    description: 'Quản trị viên hệ thống - Toàn quyền quản lý',
  },
  {
    role_name: 'Manager',
    description: 'Cán bộ quản lý - Phân công và giám sát công việc',
  },
  {
    role_name: 'Staff',
    description: 'Nhân viên thực hiện - Thực hiện công việc bảo trì cây xanh',
  },
];

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(TreeSpecies)
    private readonly speciesRepo: Repository<TreeSpecies>,
    @InjectRepository(AdministrativeArea)
    private readonly areaRepo: Repository<AdministrativeArea>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seed(): Promise<{ species: string; areas: string; roles: string; users: string }> {
    // IMPORTANT: Seed roles FIRST before users
    await this.upsertRoles();
    await this.upsertSpecies();
    await this.upsertAreas();
    await this.upsertTestUsers();

    const speciesCount = await this.speciesRepo.count();
    const areasCount = await this.areaRepo.count();
    const rolesCount = await this.roleRepo.count();
    const usersCount = await this.userRepo.count();

    this.logger.log(
      `Seeding complete — tree_species: ${speciesCount}, administrative_areas: ${areasCount}, roles: ${rolesCount}, users: ${usersCount}`,
    );

    return {
      species: `${speciesCount} rows in table`,
      areas: `${areasCount} rows in table`,
      roles: `${rolesCount} rows in table`,
      users: `${usersCount} rows in table`,
    };
  }

  // Uses INSERT ... ON CONFLICT (role_name) DO NOTHING at the DB level.
  private async upsertRoles(): Promise<void> {
    await this.roleRepo.upsert(ROLE_SEED, {
      conflictPaths: ['role_name'],
      skipUpdateIfNoValuesChanged: true,
    });
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

  // Create test users with roles for development/testing
  private async upsertTestUsers(): Promise<void> {
    // Find roles first
    const adminRole = await this.roleRepo.findOne({ where: { role_name: 'Admin' } });
    const managerRole = await this.roleRepo.findOne({ where: { role_name: 'Manager' } });
    const staffRole = await this.roleRepo.findOne({ where: { role_name: 'Staff' } });

    if (!adminRole || !managerRole || !staffRole) {
      this.logger.warn('Roles not found. Skipping test user creation.');
      return;
    }

    // Hash password for all test users
    const hashedPassword = await bcrypt.hash('Test@123', 10);

    // Test users data
    const testUsers = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        full_name: 'System Administrator',
        is_active: true,
        roles: [adminRole],
      },
      {
        username: 'manager',
        email: 'manager@example.com',
        password: hashedPassword,
        full_name: 'Nguyễn Văn Quản Lý',
        is_active: true,
        roles: [managerRole],
      },
      {
        username: 'staff',
        email: 'staff@example.com',
        password: hashedPassword,
        full_name: 'Trần Thị Nhân Viên',
        is_active: true,
        roles: [staffRole],
      },
      {
        username: 'supervisor',
        email: 'supervisor@example.com',
        password: hashedPassword,
        full_name: 'Lê Văn Giám Sát',
        is_active: true,
        roles: [managerRole, staffRole], // Multiple roles
      },
    ];

    // Upsert each user
    for (const userData of testUsers) {
      const existingUser = await this.userRepo.findOne({
        where: { username: userData.username },
      });

      if (!existingUser) {
        const user = this.userRepo.create(userData);
        await this.userRepo.save(user);
        this.logger.log(`Created test user: ${userData.username} with roles: ${userData.roles.map(r => r.role_name).join(', ')}`);
      }
    }
  }
}
