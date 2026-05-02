import { IsNumber, Min } from 'class-validator';

export class FindTreesNearbyDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @Min(1)
  radius_meters: number;
}
