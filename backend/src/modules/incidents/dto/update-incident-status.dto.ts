import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IncidentStatus } from '../../../entities/incident.entity';

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus, example: IncidentStatus.IN_PROGRESS })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;
}
