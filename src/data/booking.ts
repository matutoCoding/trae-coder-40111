import type { Booking, FeedingRecord } from '@/types/booking';
import type { ApprovalNode, ApprovalTrail } from '@/types/approval';

const now = new Date();

const generateApprovalNodes = (status: string): ApprovalNode[] => {
  const nodes: ApprovalNode[] = [
    {
      id: 'node1',
      bookingId: '',
      nodeType: 'group_leader',
      nodeName: '课题组负责人审批',
      approverId: 'approver001',
      approverName: '李教授',
      status: status === 'pending' ? 'pending' : 'approved',
      comment: status === 'approved' ? '同意，科研需要' : '',
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      handledAt: status !== 'pending' ? new Date(now.getTime() - 86400000).toISOString() : undefined,
      deadline: new Date(now.getTime() + 86400000).toISOString(),
      isOvertime: false,
      escalated: false
    },
    {
      id: 'node2',
      bookingId: '',
      nodeType: 'lab_manager',
      nodeName: '实验室管理员审批',
      approverId: 'approver002',
      approverName: '赵主任',
      status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
      comment: status === 'approved' ? '笼位充足，同意' : status === 'rejected' ? '笼位紧张，请调整时间' : '',
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      handledAt: status !== 'pending' ? new Date(now.getTime() - 43200000).toISOString() : undefined,
      deadline: new Date(now.getTime() + 43200000).toISOString(),
      isOvertime: false,
      escalated: false
    },
    {
      id: 'node3',
      bookingId: '',
      nodeType: 'animal_center',
      nodeName: '动物中心审批',
      approverId: 'approver003',
      approverName: '孙主任',
      status: status === 'approved' ? 'approved' : 'pending',
      comment: status === 'approved' ? '同意，请遵守动物伦理规范' : '',
      createdAt: new Date(now.getTime() - 43200000).toISOString(),
      handledAt: status === 'approved' ? new Date(now.getTime() - 21600000).toISOString() : undefined,
      deadline: new Date(now.getTime() + 21600000).toISOString(),
      isOvertime: false,
      escalated: false
    }
  ];
  return nodes;
};

const generateApprovalTrails = (status: string): ApprovalTrail[] => {
  const trails: ApprovalTrail[] = [
    {
      id: 'trail1',
      nodeId: 'node1',
      action: 'submit',
      operatorId: 'user001',
      operatorName: '张伟',
      operatorRole: '申请人',
      comment: '提交预约申请',
      timestamp: new Date(now.getTime() - 86400000 * 2).toISOString()
    }
  ];
  
  if (status !== 'pending') {
    trails.push({
      id: 'trail2',
      nodeId: 'node1',
      action: status === 'rejected' ? 'reject' : 'approve',
      operatorId: 'approver001',
      operatorName: '李教授',
      operatorRole: '课题组负责人',
      comment: status === 'rejected' ? '请重新评估' : '同意，科研需要',
      timestamp: new Date(now.getTime() - 86400000).toISOString()
    });
  }
  
  if (status === 'approved' || status === 'rejected') {
    trails.push({
      id: 'trail3',
      nodeId: 'node2',
      action: status === 'rejected' ? 'reject' : 'approve',
      operatorId: 'approver002',
      operatorName: '赵主任',
      operatorRole: '实验室管理员',
      comment: status === 'rejected' ? '笼位紧张' : '笼位充足，同意',
      timestamp: new Date(now.getTime() - 43200000).toISOString()
    });
  }
  
  return trails;
};

export const myBookings: Booking[] = [
  {
    id: 'booking001',
    cageId: 'cage001',
    cageCode: 'SPF-A-001',
    cageName: 'SPF级小鼠笼 A-001',
    groupId: 'group001',
    groupName: '神经生物学课题组',
    applicantId: 'user001',
    applicantName: '张伟',
    startTime: `${new Date(now.getTime() + 86400000).toISOString().split('T')[0]} 08:00`,
    endTime: `${new Date(now.getTime() + 86400000 * 3).toISOString().split('T')[0]} 18:00`,
    duration: 72,
    animalCount: 6,
    animalType: 'C57BL/6小鼠',
    purpose: '行为学实验',
    remark: '需要进行Morris水迷宫实验',
    status: 'approved',
    isMerged: true,
    mergedFrom: ['booking-sub-001', 'booking-sub-002', 'booking-sub-003'],
    currentApprovalNode: 3,
    approvalNodes: generateApprovalNodes('approved'),
    approvalTrails: generateApprovalTrails('approved'),
    createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
    updatedAt: new Date(now.getTime() - 86400000).toISOString()
  },
  {
    id: 'booking002',
    cageId: 'cage003',
    cageCode: 'SPF-A-003',
    cageName: 'SPF级大鼠笼 A-003',
    groupId: 'group001',
    groupName: '神经生物学课题组',
    applicantId: 'user001',
    applicantName: '张伟',
    startTime: `${new Date(now.getTime() + 86400000 * 5).toISOString().split('T')[0]} 09:00`,
    endTime: `${new Date(now.getTime() + 86400000 * 10).toISOString().split('T')[0]} 17:00`,
    duration: 120,
    animalCount: 4,
    animalType: 'SD大鼠',
    purpose: '脑立体定位注射实验',
    remark: '需要手术操作空间',
    status: 'pending',
    isMerged: false,
    currentApprovalNode: 1,
    approvalNodes: generateApprovalNodes('pending'),
    approvalTrails: generateApprovalTrails('pending'),
    createdAt: new Date(now.getTime() - 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 86400000).toISOString()
  },
  {
    id: 'booking003',
    cageId: 'cage006',
    cageCode: 'SPF-A-004',
    cageName: 'SPF级小鼠笼 A-004',
    groupId: 'group001',
    groupName: '神经生物学课题组',
    applicantId: 'user002',
    applicantName: '李明',
    startTime: `${new Date(now.getTime() + 86400000 * 2).toISOString().split('T')[0]} 10:00`,
    endTime: `${new Date(now.getTime() + 86400000 * 7).toISOString().split('T')[0]} 16:00`,
    duration: 96,
    animalCount: 8,
    animalType: 'BALB/c小鼠',
    purpose: '免疫荧光实验',
    remark: '',
    status: 'in_use',
    isMerged: false,
    currentApprovalNode: 3,
    approvalNodes: generateApprovalNodes('approved'),
    approvalTrails: generateApprovalTrails('approved'),
    createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
    updatedAt: new Date(now.getTime() - 86400000 * 2).toISOString()
  },
  {
    id: 'booking004',
    cageId: 'cage004',
    cageCode: 'CONV-B-001',
    cageName: '普通级兔笼 B-001',
    groupId: 'group002',
    groupName: '肿瘤生物学课题组',
    applicantId: 'user004',
    applicantName: '王芳',
    startTime: `${new Date(now.getTime() - 86400000).toISOString().split('T')[0]} 08:00`,
    endTime: `${new Date(now.getTime() - 86400000 * 0.5).toISOString().split('T')[0]} 18:00`,
    duration: 24,
    animalCount: 2,
    animalType: '新西兰大白兔',
    purpose: '抗体制备实验',
    remark: '需要耳缘静脉采血',
    status: 'completed',
    isMerged: false,
    currentApprovalNode: 3,
    approvalNodes: generateApprovalNodes('approved'),
    approvalTrails: generateApprovalTrails('approved'),
    createdAt: new Date(now.getTime() - 86400000 * 7).toISOString(),
    updatedAt: new Date(now.getTime() - 86400000 * 2).toISOString()
  },
  {
    id: 'booking005',
    cageId: 'cage008',
    cageCode: 'SPF-A-005',
    cageName: 'SPF级小鼠笼 A-005',
    groupId: 'group001',
    groupName: '神经生物学课题组',
    applicantId: 'user003',
    applicantName: '刘洋',
    startTime: `${new Date(now.getTime() + 86400000).toISOString().split('T')[0]} 08:00`,
    endTime: `${new Date(now.getTime() + 86400000 * 5).toISOString().split('T')[0]} 20:00`,
    duration: 108,
    animalCount: 5,
    animalType: 'C57BL/6小鼠',
    purpose: 'Western Blot实验',
    remark: '需要取材',
    status: 'rejected',
    isMerged: false,
    currentApprovalNode: 2,
    approvalNodes: generateApprovalNodes('rejected'),
    approvalTrails: generateApprovalTrails('rejected'),
    createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
    updatedAt: new Date(now.getTime() - 86400000).toISOString()
  }
];

export const feedingRecords: FeedingRecord[] = [
  {
    id: 'feed001',
    bookingId: 'booking003',
    cageId: 'cage006',
    operatorId: 'tech001',
    operatorName: '饲养员张师傅',
    type: 'feeding',
    typeName: '饲喂',
    content: '添加标准小鼠饲料200g，更换饮水',
    timestamp: new Date(now.getTime() - 3600000 * 2).toISOString()
  },
  {
    id: 'feed002',
    bookingId: 'booking003',
    cageId: 'cage006',
    operatorId: 'tech001',
    operatorName: '饲养员张师傅',
    type: 'health_check',
    typeName: '健康检查',
    content: '小鼠状态良好，被毛光滑，活动正常',
    timestamp: new Date(now.getTime() - 3600000 * 5).toISOString()
  },
  {
    id: 'feed003',
    bookingId: 'booking003',
    cageId: 'cage006',
    operatorId: 'tech001',
    operatorName: '饲养员张师傅',
    type: 'cleaning',
    typeName: '清洁',
    content: '更换垫料，清洁笼具',
    timestamp: new Date(now.getTime() - 3600000 * 24).toISOString()
  },
  {
    id: 'feed004',
    bookingId: 'booking004',
    cageId: 'cage004',
    operatorId: 'tech002',
    operatorName: '饲养员李师傅',
    type: 'treatment',
    typeName: '治疗',
    content: '每日补充维生素C，观察饮食情况',
    timestamp: new Date(now.getTime() - 3600000 * 30).toISOString()
  }
];
