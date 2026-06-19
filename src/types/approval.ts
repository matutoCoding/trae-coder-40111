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
  action: 'submit' | 'approve' | 'reject' | 'escalate' | 'remind' | 'reschedule_request' | 'reschedule_approve' | 'reschedule_reject';
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

export type RescheduleStatus = 'pending' | 'approved' | 'rejected';

export interface RescheduleRequest {
  id: string;
  bookingId: string;
  originalStartTime: string;
  originalEndTime: string;
  newStartTime: string;
  newEndTime: string;
  newDuration: number;
  reason: string;
  status: RescheduleStatus;
  approverId?: string;
  approverName?: string;
  approvalComment?: string;
  applicantId: string;
  applicantName: string;
  createdAt: string;
  handledAt?: string;
}
