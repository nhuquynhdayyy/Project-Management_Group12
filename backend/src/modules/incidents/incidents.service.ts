import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident, IncidentStatus } from '../../entities/incident.entity';
import { Tree } from '../../entities/tree.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(Tree)
    private readonly treeRepository: Repository<Tree>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateIncidentDto, reporterId: number) {
    const tree = await this.treeRepository.findOne({ where: { id: dto.tree_id } });
    if (!tree) throw new NotFoundException('Tree not found');

    const incident = await this.incidentRepository.save(
      this.incidentRepository.create({
        tree_id: dto.tree_id,
        reported_by: reporterId,
        incident_type: dto.incident_type,
        description: dto.description,
        image_url: dto.image_url ?? null,
        status: IncidentStatus.NEW,
      }),
    );

    await this.notificationsService.notifyManagers(
      `Cây cần xử lý gấp: ${tree.tree_code}`,
      `${dto.incident_type}: ${dto.description}`,
      reporterId,
    );

    return incident;
  }

  async findAll() {
    return this.incidentRepository.find({ order: { created_at: 'DESC' } });
  }

  async updateStatus(id: number, dto: UpdateIncidentStatusDto) {
    const incident = await this.incidentRepository.findOne({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    incident.status = dto.status;
    incident.resolved_at = dto.status === IncidentStatus.RESOLVED ? new Date() : null;
    return this.incidentRepository.save(incident);
  }
}
