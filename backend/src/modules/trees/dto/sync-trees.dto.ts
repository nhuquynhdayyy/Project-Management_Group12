import { IsArray, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export type OfflineActionType = 'health_update' | 'physical_update' | 'task_complete';

export class OfflineActionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(['health_update', 'physical_update', 'task_complete'])
  type: OfflineActionType;

  @IsNumber()
  treeId: number;

  @IsOptional()
  @IsNumber()
  taskId?: number;

  @IsObject()
  data: Record<string, any>;

  @IsNotEmpty()
  @IsString()
  offlineTimestamp: string;
}

export class SyncTreesDto {
  @IsArray()
  actions: OfflineActionDto[];
}
