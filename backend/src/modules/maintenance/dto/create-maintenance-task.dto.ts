import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsEnum, IsDateString, IsOptional, IsString } from 'class-validator';
import { TaskType } from '../../../entities/maintenance-task.entity';

export class CreateMaintenanceTaskDto {
  @ApiProperty({
    description: 'ID of the tree to maintain',
    example: 1,
  })
  @IsInt()
  tree_id: number;

  @ApiProperty({
    description: 'ID of the user assigned to this task',
    example: 1,
  })
  @IsInt()
  assigned_to: number;

  @ApiProperty({
    description: 'Type of maintenance task',
    enum: TaskType,
    example: TaskType.PRUNING,
  })
  @IsEnum(TaskType)
  task_type: TaskType;

  @ApiProperty({
    description: 'Scheduled date for the task (YYYY-MM-DD)',
    example: '2026-05-15',
  })
  @IsDateString()
  scheduled_date: string;

  @ApiProperty({
    description: 'Optional notes for the task',
    example: 'Tree needs urgent pruning due to overgrown branches',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
