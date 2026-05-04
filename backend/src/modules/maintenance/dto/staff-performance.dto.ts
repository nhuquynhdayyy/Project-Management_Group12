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
}