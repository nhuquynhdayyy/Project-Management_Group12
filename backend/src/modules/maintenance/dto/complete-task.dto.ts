import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

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
    description: 'URL of the evidence image (uploaded to cloud storage)',
    example: 'https://storage.example.com/evidence/task-123.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  evidence_image_url?: string;

  @ApiProperty({
    description: 'Completion notes',
    example: 'Task completed successfully. Tree is healthy.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
