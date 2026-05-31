import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  full_name: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  avatar_url: string | null;

  @ApiProperty({ type: [String] })
  roles: string[];

  @ApiProperty()
  created_at: Date;
}
