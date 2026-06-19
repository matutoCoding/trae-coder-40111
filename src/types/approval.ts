export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'overtime' | 'escalated';

export type ApprovalNodeType = 'group_leader' | 'lab_manager' | 'animal_center' | 'admin';

export interface ApprovalNode {
  id: string;
  bookingId: string;
  nodeType: ApprovalNodeType;
  nodeName: string;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  comment: string;
  createdAt: string;
  handledAt?: string;
  deadline: string;
  isOvertime: boolean;
  escalated: boolean;
  escalatedTo?: string;
}

export interface ApprovalTrail {
  id: string;
  nodeId: string;
  action: 'submit' | 'approve' | 'reject' | 'escalate' | 'remind';
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  comment: string;
  timestamp: string;
}

export interface OvertimeRecord {
  id: string;
  nodeId: string;
  bookingId: string;
  deadline: string;
  overtimeAt: string;
  level: 1 | 2 | 3;
  reminded: boolean;
  escalated: boolean;
  responsiblePerson: string;
  responsiblePersonName: string;
}
