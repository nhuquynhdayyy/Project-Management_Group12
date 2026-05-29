import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeSpecies } from '../../entities/tree-species.entity';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { Role } from '../../entities/role.entity';
import { User } from '../../modules/auth/user.entity';
import { Tree, HealthStatus } from '../../entities/tree.entity';
import { MaintenanceTask, TaskType, TaskStatus } from '../../entities/maintenance-task.entity';
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
    @InjectRepository(Tree)
    private readonly treeRepo: Repository<Tree>,
    @InjectRepository(MaintenanceTask)
    private readonly taskRepo: Repository<MaintenanceTask>,
  ) {}

  async seed(): Promise<{ species: string; areas: string; roles: string; users: string; trees: string; tasks: string }> {
    // Order matters: roles → species → areas → users → trees → tasks
    await this.upsertRoles();
    await this.upsertSpecies();
    await this.upsertAreas();
    await this.upsertTestUsers();
    await this.seedTrees();
    await this.seedMaintenanceTasks();

    const speciesCount = await this.speciesRepo.count();
    const areasCount = await this.areaRepo.count();
    const rolesCount = await this.roleRepo.count();
    const usersCount = await this.userRepo.count();
    const treesCount = await this.treeRepo.count();
    const tasksCount = await this.taskRepo.count();

    this.logger.log(
      `Seeding complete — species: ${speciesCount}, areas: ${areasCount}, roles: ${rolesCount}, users: ${usersCount}, trees: ${treesCount}, tasks: ${tasksCount}`,
    );

    return {
      species: `${speciesCount} rows`,
      areas: `${areasCount} rows`,
      roles: `${rolesCount} rows`,
      users: `${usersCount} rows`,
      trees: `${treesCount} rows`,
      tasks: `${tasksCount} rows`,
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

  // ── 80 realistic trees spread across Quận Liên Chiểu, Đà Nẵng ──────────
  // Bounding box: lat 16.065–16.115, lng 108.115–108.175
  private async seedTrees(): Promise<void> {
    const existingCount = await this.treeRepo.count();
    if (existingCount > 0) {
      this.logger.log(`Trees already seeded (${existingCount} rows). Skipping.`);
      return;
    }

    const allSpecies = await this.speciesRepo.find();
    const lienChieu = await this.areaRepo.findOne({
      where: { area_name: 'Quận Liên Chiểu' },
    });

    if (!allSpecies.length || !lienChieu) {
      this.logger.warn('Species or area not found. Skipping tree seeding.');
      return;
    }

    // Health distribution: 50% Tốt, 25% Yếu, 15% Sâu bệnh, 10% Chết
    const healthPool: HealthStatus[] = [
      ...Array(50).fill(HealthStatus.GOOD),
      ...Array(25).fill(HealthStatus.WEAK),
      ...Array(15).fill(HealthStatus.DISEASED),
      ...Array(10).fill(HealthStatus.DEAD),
    ];

    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const trees: Partial<Tree>[] = [];
    for (let i = 1; i <= 80; i++) {
      const lat = rand(16.065, 16.115);
      const lng = rand(108.115, 108.175);
      const species = pick(allSpecies);
      const health = pick(healthPool);
      const plantYear = Math.floor(rand(2005, 2023));

      trees.push({
        tree_code: `LC-${String(i).padStart(4, '0')}`,
        qr_code: `cayxanh://tree/${i}`, // Auto-generate QR code string
        species_id: species.id,
        area_id: lienChieu.id,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        } as any,
        planting_year: plantYear,
        height_m: parseFloat(rand(3, 18).toFixed(1)),
        trunk_diameter_cm: parseFloat(rand(10, 80).toFixed(1)),
        health_status: health,
        last_maintained_at:
          health !== HealthStatus.DEAD
            ? new Date(Date.now() - rand(7, 180) * 86400000)
            : undefined,
      });
    }

    const savedTrees = await this.treeRepo.save(trees);
    
    // Update qr_code with actual IDs after saving
    for (const tree of savedTrees) {
      tree.qr_code = `cayxanh://tree/${tree.id}`;
    }
    await this.treeRepo.save(savedTrees);
    
    this.logger.log(`Seeded 80 trees in Quận Liên Chiểu with QR codes.`);
  }

  // ── Maintenance tasks: ~60 tasks spread over the last 14 days ───────────
  private async seedMaintenanceTasks(): Promise<void> {
    const existingCount = await this.taskRepo.count();
    if (existingCount > 0) {
      this.logger.log(`Tasks already seeded (${existingCount} rows). Skipping.`);
      return;
    }

    const trees = await this.treeRepo.find();
    const staffUser = await this.userRepo.findOne({ where: { username: 'staff' } });
    const supervisorUser = await this.userRepo.findOne({ where: { username: 'supervisor' } });

    if (!trees.length || !staffUser || !supervisorUser) {
      this.logger.warn('Trees or users not found. Skipping task seeding.');
      return;
    }

    const taskTypes = Object.values(TaskType);
    const assignees = [staffUser, supervisorUser];
    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const now = Date.now();
    const tasks: Partial<MaintenanceTask>[] = [];

    // 60 tasks: mix of completed (last 14 days) and pending/in-progress
    for (let i = 0; i < 60; i++) {
      const tree = pick(trees);
      const assignee = pick(assignees);
      const daysAgo = Math.floor(rand(0, 14));
      const scheduledDate = new Date(now - daysAgo * 86400000);

      // Tasks in the past 7 days have a 70% chance of being completed
      const isPast = daysAgo > 0;
      const isCompleted = isPast && Math.random() < 0.7;
      const isInProgress = !isCompleted && isPast && Math.random() < 0.4;

      const status = isCompleted
        ? TaskStatus.COMPLETED
        : isInProgress
          ? TaskStatus.IN_PROGRESS
          : TaskStatus.PENDING;

      tasks.push({
        tree_id: tree.id,
        assigned_to: assignee.id,
        task_type: pick(taskTypes),
        status,
        scheduled_date: scheduledDate,
        completed_at: isCompleted
          ? new Date(scheduledDate.getTime() + rand(1, 8) * 3600000)
          : null,
      });
    }

    await this.taskRepo.save(tasks);
    this.logger.log(`Seeded 60 maintenance tasks.`);
  }
}
