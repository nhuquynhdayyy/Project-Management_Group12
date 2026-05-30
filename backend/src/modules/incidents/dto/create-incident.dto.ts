import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  tree_id: number;

  @ApiProperty({ example: 'Gãy cành' })
  @IsString()
  @MaxLength(100)
  incident_type: string;

  @ApiProperty({ example: 'Cành lớn gãy sát lối đi, cần xử lý gấp.' })
  @IsString()
  description: string;

  @ApiProperty({ required: false, example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;
}
