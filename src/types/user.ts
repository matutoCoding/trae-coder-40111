export interface User {
  id: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'researcher' | 'technician' | 'approver';
  phone: string;
  email: string;
  department: string;
  groupId: string;
  groupName: string;
}

export interface ResearchGroup {
  id: string;
  name: string;
  leader: string;
  memberCount: number;
  members: string[];
}
