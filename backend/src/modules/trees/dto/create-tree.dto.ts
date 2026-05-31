import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { HealthStatus } from '../../../entities/tree.entity';

export class CreateTreeDto {
  @IsString()
  tree_code: string;

  @IsOptional()
  @IsString()
  qr_code?: string;

  @IsInt()
  species_id: number;

  @IsInt()
  area_id: number;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  planting_year?: number;

  @IsOptional()
  @IsNumber()
  height_m?: number;

  @IsOptional()
  @IsNumber()
  trunk_diameter_cm?: number;

  @IsOptional()
  @IsNumber()
  canopy_diameter_m?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  tilt_degree?: number;

  @IsOptional()
  @IsEnum(HealthStatus)
  health_status?: HealthStatus;

  @IsOptional()
  @IsInt()
  created_by?: number;
}
