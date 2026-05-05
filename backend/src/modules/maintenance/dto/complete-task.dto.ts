import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CompleteTaskDto {
  @ApiProperty({
    description: 'Current latitude of the staff member (WGS84)',
    example: 16.0544,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Current longitude of the staff member (WGS84)',
    example: 108.2022,
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Completion notes',
    example: 'Task completed successfully. Tree is healthy.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
