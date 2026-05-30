import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'abc123-def456-ghi789',
    description: 'Email verification token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
