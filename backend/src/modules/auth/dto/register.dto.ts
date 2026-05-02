import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe', description: 'The username of the new user' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'P@ssw0rd!', description: 'The password of the new user' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'admin', description: 'The role assigned to the user', enum: ['admin', 'user', 'manager'] })
  @IsString()
  @IsNotEmpty()
  role: string;
}
