import { ApiProperty } from '@nestjs/swagger';

export class StaffPerformanceDto {
  @ApiProperty({ example: 'nguyenvana' })
  username: string;

  @ApiProperty({ example: 12 })
  completed: number;

  @ApiProperty({ example: 4 })
  pending: number;

  @ApiProperty({ example: 5.75, nullable: true })
  avg_completion_hours: number | null;

  @ApiProperty({ example: 2 })
  overdueCount: number;

  @ApiProperty({ example: 82.5 })
  onTimeRate: number;

  @ApiProperty({ example: 1.25 })
  avgDaysLate: number;

  @ApiProperty({ example: 4 })
  diversityScore: number;

  @ApiProperty({ example: 8 })
  activeDays: number;
}
