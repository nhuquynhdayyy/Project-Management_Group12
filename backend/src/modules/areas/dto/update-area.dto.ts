import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAreaDto {
  @ApiProperty({ example: 'Quận Liên Chiểu', description: 'Tên khu vực mới' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;
}
