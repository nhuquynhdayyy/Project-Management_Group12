import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { TaskType } from '../../../entities/maintenance-task.entity';

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class CreateRecurringMaintenanceDto {
  @ApiProperty({ description: 'Tree ID. Required when area_id is not provided.', required: false })
  @ValidateIf((dto: CreateRecurringMaintenanceDto) => !dto.area_id)
  @IsInt()
  tree_id?: number;

  @ApiProperty({ description: 'Administrative area ID. Creates tasks for every tree in this area.', required: false })
  @ValidateIf((dto: CreateRecurringMaintenanceDto) => !dto.tree_id)
  @IsInt()
  area_id?: number;

  @ApiProperty({ description: 'Assigned staff user ID', example: 2 })
  @IsInt()
  assigned_to: number;

  @ApiProperty({ enum: TaskType, example: TaskType.WATERING })
  @IsEnum(TaskType)
  task_type: TaskType;

  @ApiProperty({ description: 'First scheduled date (YYYY-MM-DD)', example: '2026-06-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ enum: RecurrenceFrequency, example: RecurrenceFrequency.WEEKLY })
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @ApiProperty({ description: 'Number of occurrences per tree', example: 8, minimum: 1, maximum: 52 })
  @IsInt()
  @Min(1)
  @Max(52)
  occurrences: number;

  @ApiProperty({ description: 'Reminder lead time in minutes', example: 60, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  reminder_minutes?: number;

  @ApiProperty({ description: 'Optional notes copied to generated tasks', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
