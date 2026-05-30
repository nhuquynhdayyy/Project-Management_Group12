import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAreaDto {
  @ApiProperty({ example: 'Phường Hòa Khánh Bắc', description: 'Tên phường' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;
}
