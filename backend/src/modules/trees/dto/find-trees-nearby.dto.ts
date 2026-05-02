import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class FindTreesNearbyDto {
  @ApiProperty({
    description: 'Latitude of the search centre point (WGS84)',
    example: 16.0544,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the search centre point (WGS84)',
    example: 108.2022,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Search radius in metres. Defaults to 1000 m if not provided.',
    example: 1000,
    default: 1000,
    minimum: 1,
    maximum: 50000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50000)
  radius_meters: number = 1000;
}
