import { MaintenanceTask } from '../api/maintenance';

export type RootStackParamList = {
  Login: undefined;
  TaskList: undefined;
  TaskDetail: { task: MaintenanceTask };
  TreeHistory: { treeId: number; treeCode?: string };
  QRScanner: undefined;
  NearbyTrees: undefined;
  RegisterTree: undefined;
  Notifications: undefined;
  IncidentReport: undefined;
};
