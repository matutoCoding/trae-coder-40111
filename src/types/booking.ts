import type { ApprovalNode, ApprovalTrail } from './approval';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_use' | 'completed';

export interface Booking {
  id: string;
  cageId: string;
  cageCode: string;
  cageName: string;
  groupId: string;
  groupName: string;
  applicantId: string;
  applicantName: string;
  startTime: string;
  endTime: string;
  duration: number;
  animalCount: number;
  animalType: string;
  purpose: string;
  remark: string;
  status: BookingStatus;
  isMerged: boolean;
  mergedFrom?: string[];
  currentApprovalNode?: number;
  approvalNodes: ApprovalNode[];
  approvalTrails: ApprovalTrail[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedingRecord {
  id: string;
  bookingId: string;
  cageId: string;
  operatorId: string;
  operatorName: string;
  type: 'feeding' | 'cleaning' | 'health_check' | 'treatment' | 'other';
  typeName: string;
  content: string;
  timestamp: string;
}
