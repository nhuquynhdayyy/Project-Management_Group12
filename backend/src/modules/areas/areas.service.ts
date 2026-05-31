import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdministrativeArea } from '../../entities/administrative-area.entity';
import { Tree } from '../../entities/tree.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(AdministrativeArea)
    private readonly areaRepository: Repository<AdministrativeArea>,
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
  ) {}

  async create(createAreaDto: CreateAreaDto): Promise<AdministrativeArea> {
    // Check for duplicate name
    const existing = await this.areaRepository.findOne({
      where: { area_name: createAreaDto.name },
    });
    if (existing) {
      throw new BadRequestException('Area name already exists');
    }

    const area = this.areaRepository.create({
      area_name: createAreaDto.name,
      parent_id: null, // All areas are flat (no hierarchy)
    });

    return await this.areaRepository.save(area);
  }

  async update(id: number, updateAreaDto: UpdateAreaDto): Promise<AdministrativeArea> {
    const area = await this.areaRepository.findOne({ where: { id } });
    if (!area) {
      throw new NotFoundException('Area not found');
    }

    // Check for duplicate name (excluding current area)
    const existing = await this.areaRepository.findOne({
      where: { area_name: updateAreaDto.name },
    });
    if (existing && existing.id !== id) {
      throw new BadRequestException('Area name already exists');
    }

    area.area_name = updateAreaDto.name;
    return await this.areaRepository.save(area);
  }

  async delete(id: number): Promise<{ message: string }> {
    const area = await this.areaRepository.findOne({ where: { id } });
    if (!area) {
      throw new NotFoundException('Area not found');
    }

    // Check if area has trees
    const treeCount = await this.treeRepository.count({ where: { area_id: id } });
    if (treeCount > 0) {
      throw new BadRequestException(
        `Cannot delete area with ${treeCount} tree(s). Please reassign or remove trees first.`,
      );
    }

    await this.areaRepository.remove(area);
    return { message: 'Area deleted successfully' };
  }
}
