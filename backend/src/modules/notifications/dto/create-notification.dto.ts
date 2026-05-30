import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  NotificationAudience,
  NotificationSeverity,
} from '../../../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Cập nhật lịch bảo trì' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Các đội kiểm tra lịch mới trong hôm nay.' })
  @IsString()
  content: string;

  @ApiProperty({ enum: NotificationAudience, example: NotificationAudience.ALL })
  @IsEnum(NotificationAudience)
  audience: NotificationAudience;

  @ApiProperty({
    enum: NotificationSeverity,
    example: NotificationSeverity.NORMAL,
  })
  @IsEnum(NotificationSeverity)
  severity: NotificationSeverity;

  @ApiProperty({
    example: ['Staff', 'Manager'],
    required: false,
    description: 'Used when audience is roles.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles?: string[];
}
