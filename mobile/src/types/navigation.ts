import { MaintenanceTask } from '../api/maintenance';

export type RootStackParamList = {
  Login: undefined;
  TaskList: undefined;
  TaskDetail: { task: MaintenanceTask };
};
