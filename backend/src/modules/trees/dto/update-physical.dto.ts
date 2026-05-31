import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePhysicalDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Height must be greater than 0' })
  @Type(() => Number)
  height_m?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Trunk diameter must be greater than 0' })
  @Type(() => Number)
  trunk_diameter_cm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Canopy diameter must be greater than or equal to 0' })
  @Type(() => Number)
  canopy_diameter_m?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Tilt degree must be between 0 and 90' })
  @Max(90, { message: 'Tilt degree must be between 0 and 90' })
  @Type(() => Number)
  tilt_degree?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
