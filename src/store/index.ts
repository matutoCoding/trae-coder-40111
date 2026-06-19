import { create } from 'zustand';
import type { Booking, FeedingRecord } from '@/types/booking';
import type { ApprovalNode, ApprovalTrail, OvertimeRecord, RescheduleRequest } from '@/types/approval';
import type { Cage } from '@/types/cage';
import { myBookings as initBookings, feedingRecords as initFeeding } from '@/data/booking';
import { pendingApprovals as initPending, myApproved as initApproved, overtimeRecords as initOvertime } from '@/data/approval';
import { cageList as initCages } from '@/data/cage';
import { currentUser } from '@/data/user';
import { canMerge, mergeBookings } from '@/utils/booking-merge';

interface ApprovalItem {
  node: ApprovalNode;
  booking: Booking;
}

interface OvertimeStatus {
  handled: boolean;
  handledAt?: string;
  handledBy?: string;
  handledByName?: string;
  handlingComment?: string;
}

interface AppState {
  bookings: Booking[];
  cages: Cage[];
  pendingApprovals: ApprovalItem[];
  approvedList: ApprovalItem[];
  overtimeRecords: OvertimeRecord[];
  overtimeStatus: Record<string, OvertimeStatus>;
  feedingRecords: FeedingRecord[];
  approvalTrails: Record<string, ApprovalTrail[]>;
  rescheduleRequests: RescheduleRequest[];
  _overtimeHandled: Set<string>;

  addBooking: (booking: Booking) => void;
  cancelBooking: (bookingId: string, splitTime?: string) => void;
  approveNode: (nodeId: string, comment: string) => void;
  rejectNode: (nodeId: string, comment: string) => void;
  addOvertimeRecord: (record: OvertimeRecord) => void;
  resolveOvertimeRecord: (recordId: string, comment: string) => void;
  addApprovalTrail: (bookingId: string, trail: ApprovalTrail) => void;
  addFeedingRecord: (record: FeedingRecord) => void;
  checkAndHandleOvertime: () => void;
  syncCageState: () => void;
  requestReschedule: (bookingId: string, newStartTime: string, newEndTime: string, reason: string) => boolean;
  approveReschedule: (requestId: string, comment: string) => void;
  rejectReschedule: (requestId: string, comment: string) => void;
  getCageOccupancy: (cageId: string) => Array<{
    startTime: string;
    endTime: string;
    groupId: string;
    groupName: string;
    bookingId: string;
    bookingStatus: string;
  }>;
  getOccupancyForDay: (cageId: string, dateStr: string) => Array<{
    startTime: string;
    endTime: string;
    startHour: number;
    endHour: number;
    groupId: string;
    groupName: string;
    bookingId: string;
    bookingStatus: string;
  }>;
  checkConflict: (cageId: string, startTime: string, endTime: string, excludeBookingId?: string) => boolean;
}

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const nodeTypeMap: Record<string, { idx: number; approverId: string; approverName: string; nodeName: string }> = {
  group_leader: { idx: 0, approverId: 'approver001', approverName: '李教授', nodeName: '课题组负责人审批' },
  lab_manager: { idx: 1, approverId: 'approver002', approverName: '赵主任', nodeName: '实验室管理员审批' },
  animal_center: { idx: 2, approverId: 'approver003', approverName: '孙主任', nodeName: '动物中心审批' }
};

const buildApprovalNodes = (bookingId: string, status: Record<number, ApprovalNode['status']> = {}, startIdx = 0): ApprovalNode[] => {
  const now = new Date();
  const nodes: ApprovalNode[] = [
    {
      id: `${bookingId}-node-1`,
      bookingId,
      nodeType: 'group_leader',
      nodeName: '课题组负责人审批',
      approverId: 'approver001',
      approverName: '李教授',
      status: 'pending',
      comment: '',
      createdAt: now.toISOString(),
      deadline: new Date(now.getTime() + 86400000).toISOString(),
      isOvertime: false,
      escalated: false
    },
    {
      id: `${bookingId}-node-2`,
      bookingId,
      nodeType: 'lab_manager',
      nodeName: '实验室管理员审批',
      approverId: 'approver002',
      approverName: '赵主任',
      status: 'pending',
      comment: '',
      createdAt: now.toISOString(),
      deadline: new Date(now.getTime() + 86400000 * 2).toISOString(),
      isOvertime: false,
      escalated: false
    },
    {
      id: `${bookingId}-node-3`,
      bookingId,
      nodeType: 'animal_center',
      nodeName: '动物中心审批',
      approverId: 'approver003',
      approverName: '孙主任',
      status: 'pending',
      comment: '',
      createdAt: now.toISOString(),
      deadline: new Date(now.getTime() + 86400000 * 3).toISOString(),
      isOvertime: false,
      escalated: false
    }
  ];
  
  Object.keys(status).forEach(k => {
    const idx = parseInt(k);
    if (nodes[idx]) {
      nodes[idx].status = status[idx];
    }
  });
  
  return nodes;
};

const initTrails: Record<string, ApprovalTrail[]> = {};
const initBookingIds = ['booking001', 'booking002', 'booking003', 'booking004', 'booking005'];
initBookingIds.forEach(id => {
  const booking = initBookings.find(b => b.id === id);
  if (booking && booking.approvalTrails.length > 0) {
    initTrails[id] = booking.approvalTrails;
  }
});

const initOvertimeHandled = new Set<string>();
initOvertime.forEach(record => {
  const key = `${record.nodeId}-l${record.level}`;
  initOvertimeHandled.add(key);
});

const normalizePendingBookings = (bookings: Booking[], pendingList: ApprovalItem[]): { bookings: Booking[]; pending: ApprovalItem[] } => {
  const bookingMap = new Map<string, Booking>();
  bookings.forEach(b => bookingMap.set(b.id, b));
  
  const newPending: ApprovalItem[] = [];
  
  pendingList.forEach(item => {
    const bookingId = item.booking.id;
    const existing = bookingMap.get(bookingId);
    const existingNodes = existing?.approvalNodes || [];
    
    let nodes: ApprovalNode[] = existingNodes;
    if (!nodes || nodes.length === 0) {
      const nodeIdx = nodeTypeMap[item.node.nodeType]?.idx || 0;
      const statusMap: Record<number, ApprovalNode['status']> = {};
      for (let i = 0; i < nodeIdx; i++) {
        statusMap[i] = 'approved';
      }
      statusMap[nodeIdx] = item.node.status;
      nodes = buildApprovalNodes(bookingId, statusMap, nodeIdx);
      
      nodes[nodeIdx] = {
        ...nodes[nodeIdx],
        ...item.node,
        id: item.node.id
      };
    }
    
    const updatedBooking: Booking = {
      ...item.booking,
      ...(existing || {}),
      approvalNodes: nodes,
      currentApprovalNode: (nodeTypeMap[item.node.nodeType]?.idx || 0) + 1
    };
    
    bookingMap.set(bookingId, updatedBooking);
    newPending.push({
      node: nodes[nodeTypeMap[item.node.nodeType]?.idx || 0],
      booking: updatedBooking
    });
  });
  
  return {
    bookings: Array.from(bookingMap.values()),
    pending: newPending
  };
};

const syncBookingInApprovals = (bookings: Booking[], pending: ApprovalItem[], approved: ApprovalItem[]): { pending: ApprovalItem[]; approved: ApprovalItem[] } => {
  const newPending = pending.map(item => {
    const freshBooking = bookings.find(b => b.id === item.booking.id);
    if (freshBooking) {
      const freshNode = freshBooking.approvalNodes.find(n => n.id === item.node.id);
      return {
        node: freshNode || item.node,
        booking: freshBooking
      };
    }
    return item;
  });

  const newApproved = approved.map(item => {
    const freshBooking = bookings.find(b => b.id === item.booking.id);
    if (freshBooking) {
      const freshNode = freshBooking.approvalNodes.find(n => n.id === item.node.id);
      return {
        node: freshNode || item.node,
        booking: freshBooking
      };
    }
    return item;
  });

  return { pending: newPending, approved: newApproved };
};

const computeCageState = (cages: Cage[], bookings: Booking[]): Cage[] => {
  const now = new Date().getTime();
  
  return cages.map(cage => {
    const activeBookings = bookings.filter(b =>
      b.cageId === cage.id &&
      (b.status === 'approved' || b.status === 'in_use')
    );
    
    let occupiedNow = false;
    let totalAnimalsNow = 0;
    let hasFutureReserved = false;
    
    activeBookings.forEach(b => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      
      if (now >= start && now <= end) {
        occupiedNow = true;
        totalAnimalsNow += b.animalCount;
      }
      if (now < start) {
        hasFutureReserved = true;
      }
    });
    
    const effectiveAnimals = Math.min(totalAnimalsNow, cage.capacity);
    let status: Cage['status'] = cage.status;
    if (cage.status === 'maintenance') {
      status = 'maintenance';
    } else if (occupiedNow) {
      status = 'occupied';
    } else if (hasFutureReserved) {
      status = 'reserved';
    } else {
      status = 'available';
    }
    
    return {
      ...cage,
      currentAnimals: effectiveAnimals,
      status
    };
  });
};

const initData = normalizePendingBookings(
  [...initBookings],
  initPending.map(item => ({ node: item, booking: item.booking }))
);
const initCagesNormalized = computeCageState(initCages, initData.bookings);

export const useAppStore = create<AppState>((set, get) => ({
  bookings: initData.bookings,
  cages: initCagesNormalized,
  pendingApprovals: initData.pending,
  approvedList: initApproved.map(item => ({ node: item, booking: item.booking })),
  overtimeRecords: initOvertime,
  overtimeStatus: {},
  feedingRecords: initFeeding,
  approvalTrails: initTrails,
  rescheduleRequests: [],
  _overtimeHandled: initOvertimeHandled,

  addBooking: (booking) => {
    const nodes = buildApprovalNodes(booking.id);
    const now = new Date();
    const newBooking: Booking = {
      ...booking,
      status: 'pending',
      currentApprovalNode: 1,
      approvalNodes: nodes,
      approvalTrails: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    const submitTrail: ApprovalTrail = {
      id: generateId(),
      nodeId: nodes[0].id,
      action: 'submit',
      operatorId: booking.applicantId,
      operatorName: booking.applicantName,
      operatorRole: '申请人',
      comment: '提交预约申请',
      timestamp: now.toISOString()
    };

    const pendingItem: ApprovalItem = {
      node: nodes[0],
      booking: newBooking
    };

    set(state => ({
      bookings: [newBooking, ...state.bookings],
      pendingApprovals: [pendingItem, ...state.pendingApprovals],
      approvalTrails: {
        ...state.approvalTrails,
        [booking.id]: [submitTrail]
      }
    }));
  },

  cancelBooking: (bookingId, splitTime) => {
    set(state => {
      const booking = state.bookings.find(b => b.id === bookingId);
      if (!booking) return state;

      const now = new Date();
      const cancelTrail: ApprovalTrail = {
        id: generateId(),
        nodeId: 'cancel',
        action: 'reject',
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        operatorRole: '申请人',
        comment: splitTime ? `中途退订，退订时间点: ${splitTime}` : '取消预约',
        timestamp: now.toISOString()
      };

      const existingTrails = state.approvalTrails[bookingId] || [];

      let finalBookings: Booking[] = state.bookings;
      const newTrails = { ...state.approvalTrails, [bookingId]: [...existingTrails, cancelTrail] };

      if (splitTime && booking.status === 'in_use') {
        const startMs = new Date(booking.startTime).getTime();
        const endMs = new Date(booking.endTime).getTime();
        const splitMs = new Date(splitTime).getTime();

        if (splitMs > startMs && splitMs < endMs) {
          const firstDuration = Math.floor((splitMs - startMs) / (1000 * 60 * 60));
          const secondDuration = Math.floor((endMs - splitMs) / (1000 * 60 * 60));

          const secondBooking: Booking = {
            ...booking,
            id: `${booking.id}-part2`,
            startTime: splitTime,
            duration: secondDuration,
            status: 'cancelled',
            isMerged: false,
            mergedFrom: undefined,
            remark: `由 ${booking.id} 退订拆分产生`,
            updatedAt: now.toISOString()
          };

          finalBookings = state.bookings.map(b => {
            if (b.id === bookingId) {
              return { ...b, status: 'completed' as const, endTime: splitTime, duration: firstDuration, updatedAt: now.toISOString() };
            }
            return b;
          });
          finalBookings = [...finalBookings, secondBooking];
          newTrails[`${booking.id}-part2`] = [cancelTrail];

          const newCages = computeCageState(state.cages, finalBookings);
          const { pending, approved } = syncBookingInApprovals(finalBookings, state.pendingApprovals, state.approvedList);

          return {
            bookings: finalBookings,
            cages: newCages,
            pendingApprovals: pending.filter(item => item.booking.id !== bookingId && item.booking.id !== `${booking.id}-part2`),
            approvedList: approved,
            approvalTrails: newTrails
          };
        }
      }

      finalBookings = state.bookings.map(b => {
        if (b.id === bookingId) {
          return { ...b, status: 'cancelled' as const, updatedAt: now.toISOString() };
        }
        return b;
      });

      const newCages = computeCageState(state.cages, finalBookings);
      const { pending, approved } = syncBookingInApprovals(finalBookings, state.pendingApprovals, state.approvedList);

      return {
        bookings: finalBookings,
        cages: newCages,
        pendingApprovals: pending.filter(item => item.booking.id !== bookingId),
        approvedList: approved,
        approvalTrails: newTrails
      };
    });
  },

  approveNode: (nodeId, comment) => {
    if (nodeId.startsWith('reschedule-node-')) {
      const requestId = nodeId.replace('reschedule-node-', '');
      get().approveReschedule(requestId, comment);
      return;
    }
    
    set(state => {
      const targetIdx = state.pendingApprovals.findIndex(item => item.node.id === nodeId);
      if (targetIdx === -1) return state;

      const target = state.pendingApprovals[targetIdx];
      const now = new Date();
      const bookingId = target.node.bookingId;

      const bookingIdx = state.bookings.findIndex(b => b.id === bookingId);
      if (bookingIdx === -1) return state;

      const booking = state.bookings[bookingIdx];
      const currentNodeIdx = booking.approvalNodes.findIndex(n => n.id === nodeId);
      if (currentNodeIdx === -1) return state;

      const approvedNode: ApprovalNode = {
        ...booking.approvalNodes[currentNodeIdx],
        status: 'approved',
        comment,
        handledAt: now.toISOString()
      };

      const trail: ApprovalTrail = {
        id: generateId(),
        nodeId,
        action: 'approve',
        operatorId: approvedNode.approverId,
        operatorName: approvedNode.approverName,
        operatorRole: approvedNode.nodeName,
        comment,
        timestamp: now.toISOString()
      };

      const updatedNodes = booking.approvalNodes.map(n =>
        n.id === nodeId ? approvedNode : n
      );

      const isLastNode = currentNodeIdx === booking.approvalNodes.length - 1;

      let updatedBooking: Booking;
      if (isLastNode) {
        updatedBooking = {
          ...booking,
          status: 'approved',
          approvalNodes: updatedNodes,
          currentApprovalNode: booking.approvalNodes.length,
          updatedAt: now.toISOString()
        };
      } else {
        const nextNode = { ...updatedNodes[currentNodeIdx + 1] };
        nextNode.createdAt = now.toISOString();
        nextNode.deadline = new Date(now.getTime() + 86400000).toISOString();
        updatedNodes[currentNodeIdx + 1] = nextNode;

        updatedBooking = {
          ...booking,
          approvalNodes: updatedNodes,
          currentApprovalNode: currentNodeIdx + 2,
          updatedAt: now.toISOString()
        };
      }

      const updatedBookings = state.bookings.map((b, i) =>
        i === bookingIdx ? updatedBooking : b
      );

      const remainingPending = state.pendingApprovals.filter((_, i) => i !== targetIdx);

      let newPending = [...remainingPending];
      if (!isLastNode) {
        const nextNode = updatedBooking.approvalNodes[currentNodeIdx + 1];
        const nextPendingItem: ApprovalItem = {
          node: nextNode,
          booking: updatedBooking
        };
        newPending = [nextPendingItem, ...newPending];
      }

      const newApproved = [{ node: approvedNode, booking: updatedBooking }, ...state.approvedList];
      const existingTrails = state.approvalTrails[bookingId] || [];
      const newCages = computeCageState(state.cages, updatedBookings);

      const relatedNodeIds = state.bookings.find(b => b.id === bookingId)?.approvalNodes.map(n => n.id) || [];
      const newOvertimeStatus = { ...state.overtimeStatus };
      relatedNodeIds.forEach(nid => {
        state.overtimeRecords.forEach(or => {
          if (or.nodeId === nid) {
            newOvertimeStatus[or.id] = {
              handled: true,
              handledAt: now.toISOString(),
              handledBy: currentUser.id,
              handledByName: currentUser.name,
              handlingComment: comment
            };
          }
        });
      });

      const { pending: syncedPending, approved: syncedApproved } = syncBookingInApprovals(
        updatedBookings,
        newPending,
        newApproved
      );

      return {
        bookings: updatedBookings,
        cages: newCages,
        pendingApprovals: syncedPending,
        approvedList: syncedApproved,
        overtimeStatus: newOvertimeStatus,
        approvalTrails: {
          ...state.approvalTrails,
          [bookingId]: [...existingTrails, trail]
        }
      };
    });
  },

  rejectNode: (nodeId, comment) => {
    if (nodeId.startsWith('reschedule-node-')) {
      const requestId = nodeId.replace('reschedule-node-', '');
      get().rejectReschedule(requestId, comment);
      return;
    }
    
    set(state => {
      const targetIdx = state.pendingApprovals.findIndex(item => item.node.id === nodeId);
      if (targetIdx === -1) return state;

      const target = state.pendingApprovals[targetIdx];
      const now = new Date();
      const bookingId = target.node.bookingId;

      const bookingIdx = state.bookings.findIndex(b => b.id === bookingId);
      if (bookingIdx === -1) return state;

      const booking = state.bookings[bookingIdx];

      const rejectedNode: ApprovalNode = {
        ...target.node,
        status: 'rejected',
        comment,
        handledAt: now.toISOString()
      };

      const trail: ApprovalTrail = {
        id: generateId(),
        nodeId,
        action: 'reject',
        operatorId: rejectedNode.approverId,
        operatorName: rejectedNode.approverName,
        operatorRole: rejectedNode.nodeName,
        comment,
        timestamp: now.toISOString()
      };

      const updatedNodes = booking.approvalNodes.map(n =>
        n.id === nodeId ? rejectedNode : n
      );

      const updatedBooking: Booking = {
        ...booking,
        status: 'rejected',
        approvalNodes: updatedNodes,
        updatedAt: now.toISOString()
      };

      const updatedBookings = state.bookings.map((b, i) =>
        i === bookingIdx ? updatedBooking : b
      );

      const newPending = state.pendingApprovals.filter(item => item.booking.id !== bookingId);
      const newApproved = [{ node: rejectedNode, booking: updatedBooking }, ...state.approvedList];
      const existingTrails = state.approvalTrails[bookingId] || [];
      const newCages = computeCageState(state.cages, updatedBookings);

      const relatedNodeIds = booking.approvalNodes.map(n => n.id);
      const newOvertimeStatus = { ...state.overtimeStatus };
      relatedNodeIds.forEach(nid => {
        state.overtimeRecords.forEach(or => {
          if (or.nodeId === nid) {
            newOvertimeStatus[or.id] = {
              handled: true,
              handledAt: now.toISOString(),
              handledBy: currentUser.id,
              handledByName: currentUser.name,
              handlingComment: comment
            };
          }
        });
      });

      const { pending: syncedPending, approved: syncedApproved } = syncBookingInApprovals(
        updatedBookings,
        newPending,
        newApproved
      );

      return {
        bookings: updatedBookings,
        cages: newCages,
        pendingApprovals: syncedPending,
        approvedList: syncedApproved,
        overtimeStatus: newOvertimeStatus,
        approvalTrails: {
          ...state.approvalTrails,
          [bookingId]: [...existingTrails, trail]
        }
      };
    });
  },

  addOvertimeRecord: (record) => {
    set(state => ({
      overtimeRecords: [record, ...state.overtimeRecords]
    }));
  },

  resolveOvertimeRecord: (recordId, comment) => {
    set(state => {
      const now = new Date();
      const record = state.overtimeRecords.find(r => r.id === recordId);
      if (!record) return state;
      
      const trail: ApprovalTrail = {
        id: generateId(),
        nodeId: record.nodeId,
        action: 'remind',
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        operatorRole: '审批人',
        comment: `超时处理：${comment || '已处理并继续审批'}`,
        timestamp: now.toISOString()
      };
      
      const existingTrails = state.approvalTrails[record.bookingId] || [];
      
      return {
        overtimeStatus: {
          ...state.overtimeStatus,
          [recordId]: {
            handled: true,
            handledAt: now.toISOString(),
            handledBy: currentUser.id,
            handledByName: currentUser.name,
            handlingComment: comment
          }
        },
        approvalTrails: {
          ...state.approvalTrails,
          [record.bookingId]: [...existingTrails, trail]
        }
      };
    });
  },

  addApprovalTrail: (bookingId, trail) => {
    set(state => {
      const existing = state.approvalTrails[bookingId] || [];
      return {
        approvalTrails: {
          ...state.approvalTrails,
          [bookingId]: [...existing, trail]
        }
      };
    });
  },

  addFeedingRecord: (record) => {
    set(state => ({
      feedingRecords: [record, ...state.feedingRecords]
    }));
  },

  checkAndHandleOvertime: () => {
    const state = get();
    const now = new Date();

    const newOvertimeRecords: OvertimeRecord[] = [];
    const newTrails: Record<string, ApprovalTrail[]> = {};
    const newHandled = new Set(state._overtimeHandled);
    const updatedNodes: Record<string, { isOvertime: boolean; escalated: boolean }> = {};

    state.pendingApprovals.forEach(item => {
      const nodeId = item.node.id;
      const bookingId = item.node.bookingId;
      const deadline = new Date(item.node.deadline);

      if (now <= deadline) return;

      let nodeUpdated = false;
      let updated = updatedNodes[nodeId] || { isOvertime: item.node.isOvertime, escalated: item.node.escalated };

      const remindKey = `${nodeId}-l1`;
      if (!newHandled.has(remindKey)) {
        newHandled.add(remindKey);
        updated.isOvertime = true;
        nodeUpdated = true;

        const overtimeRecord: OvertimeRecord = {
          id: generateId(),
          nodeId,
          bookingId,
          deadline: item.node.deadline,
          overtimeAt: deadline.toISOString(),
          level: 1,
          reminded: true,
          escalated: false,
          responsiblePerson: item.node.approverId,
          responsiblePersonName: item.node.approverName
        };
        newOvertimeRecords.push(overtimeRecord);

        const remindTrail: ApprovalTrail = {
          id: generateId(),
          nodeId,
          action: 'remind',
          operatorId: 'system',
          operatorName: '系统',
          operatorRole: '超时催办',
          comment: `${item.node.approverName} 审批超时，已自动催办`,
          timestamp: deadline.toISOString()
        };
        if (!newTrails[bookingId]) newTrails[bookingId] = [];
        newTrails[bookingId].push(remindTrail);
      }

      const overtimeMs = now.getTime() - deadline.getTime();
      const escalateKey = `${nodeId}-l2`;
      if (overtimeMs > 86400000 && !newHandled.has(escalateKey)) {
        newHandled.add(escalateKey);
        updated.escalated = true;
        nodeUpdated = true;

        const escalateRecord: OvertimeRecord = {
          id: generateId(),
          nodeId,
          bookingId,
          deadline: item.node.deadline,
          overtimeAt: new Date(deadline.getTime() + 86400000).toISOString(),
          level: 2,
          reminded: true,
          escalated: true,
          responsiblePerson: item.node.approverId,
          responsiblePersonName: item.node.approverName
        };
        newOvertimeRecords.push(escalateRecord);

        const escalateTrail: ApprovalTrail = {
          id: generateId(),
          nodeId,
          action: 'escalate',
          operatorId: 'system',
          operatorName: '系统',
          operatorRole: '自动升级',
          comment: `超时超过24小时，已自动升级至上级负责人处理，责任人：${item.node.approverName}`,
          timestamp: new Date(deadline.getTime() + 86400000).toISOString()
        };
        if (!newTrails[bookingId]) newTrails[bookingId] = [];
        newTrails[bookingId].push(escalateTrail);
      }

      if (nodeUpdated) {
        updatedNodes[nodeId] = updated;
      }
    });

    if (newOvertimeRecords.length > 0 || Object.keys(updatedNodes).length > 0) {
      set(currentState => {
        const mergedTrails = { ...currentState.approvalTrails };
        Object.keys(newTrails).forEach(bid => {
          const existing = mergedTrails[bid] || [];
          mergedTrails[bid] = [...existing, ...newTrails[bid]];
        });

        const updatedBookings = currentState.bookings.map(b => {
          const hasUpdates = b.approvalNodes.some(n => updatedNodes[n.id]);
          if (!hasUpdates) return b;
          return {
            ...b,
            approvalNodes: b.approvalNodes.map(n => {
              const upd = updatedNodes[n.id];
              if (upd) {
                return { ...n, isOvertime: upd.isOvertime, escalated: upd.escalated };
              }
              return n;
            })
          };
        });

        const updatedPending = currentState.pendingApprovals.map(item => {
          const upd = updatedNodes[item.node.id];
          if (upd) {
            const freshBooking = updatedBookings.find(b => b.id === item.booking.id) || item.booking;
            return {
              node: { ...item.node, isOvertime: upd.isOvertime, escalated: upd.escalated },
              booking: freshBooking
            };
          }
          return item;
        });

        return {
          bookings: updatedBookings,
          pendingApprovals: updatedPending,
          overtimeRecords: [...newOvertimeRecords, ...currentState.overtimeRecords],
          approvalTrails: mergedTrails,
          _overtimeHandled: newHandled
        };
      });
    }
  },

  syncCageState: () => {
    set(state => ({
      cages: computeCageState(state.cages, state.bookings)
    }));
  },

  requestReschedule: (bookingId, newStartTime, newEndTime, reason) => {
    const state = get();
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) return false;
    if (booking.status !== 'approved' && booking.status !== 'in_use' && booking.status !== 'pending') return false;

    const startMs = new Date(newStartTime).getTime();
    const endMs = new Date(newEndTime).getTime();
    if (endMs <= startMs) return false;

    if (state.checkConflict(booking.cageId, newStartTime, newEndTime, bookingId)) {
      return false;
    }

    const now = new Date();
    const requestId = `reschedule-${Date.now()}`;
    const duration = Math.floor((endMs - startMs) / (1000 * 60 * 60));

    const rescheduleNode: ApprovalNode = {
      id: `reschedule-node-${requestId}`,
      bookingId,
      nodeType: 'lab_manager',
      nodeName: '改期审批',
      approverId: 'approver002',
      approverName: '赵主任',
      status: 'pending',
      comment: '',
      createdAt: now.toISOString(),
      deadline: new Date(now.getTime() + 86400000).toISOString(),
      isOvertime: false,
      escalated: false
    };

    const request: RescheduleRequest = {
      id: requestId,
      bookingId,
      originalStartTime: booking.startTime,
      originalEndTime: booking.endTime,
      newStartTime,
      newEndTime,
      newDuration: duration,
      reason,
      status: 'pending',
      applicantId: currentUser.id,
      applicantName: currentUser.name,
      createdAt: now.toISOString()
    };

    const trail: ApprovalTrail = {
      id: generateId(),
      nodeId: rescheduleNode.id,
      action: 'reschedule_request',
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: '申请人',
      comment: `申请改期：原${booking.startTime}~${booking.endTime} → 新${newStartTime}~${newEndTime}。原因：${reason}`,
      timestamp: now.toISOString()
    };

    set(s => ({
      rescheduleRequests: [request, ...s.rescheduleRequests],
      pendingApprovals: [{ node: rescheduleNode, booking }, ...s.pendingApprovals],
      approvalTrails: {
        ...s.approvalTrails,
        [bookingId]: [...(s.approvalTrails[bookingId] || []), trail]
      }
    }));

    return true;
  },

  approveReschedule: (requestId, comment) => {
    set(state => {
      const reqIdx = state.rescheduleRequests.findIndex(r => r.id === requestId);
      if (reqIdx === -1) return state;

      const req = state.rescheduleRequests[reqIdx];
      const now = new Date();

      const updatedBookings = state.bookings.map(b => {
        if (b.id !== req.bookingId) return b;
        return {
          ...b,
          startTime: req.newStartTime,
          endTime: req.newEndTime,
          duration: req.newDuration,
          updatedAt: now.toISOString()
        };
      });

      const updatedRequests = state.rescheduleRequests.map((r, i) => {
        if (i !== reqIdx) return r;
        return {
          ...r,
          status: 'approved' as const,
          approverId: currentUser.id,
          approverName: currentUser.name,
          approvalComment: comment,
          handledAt: now.toISOString()
        };
      });

      const trail: ApprovalTrail = {
        id: generateId(),
        nodeId: 'reschedule',
        action: 'reschedule_approve',
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        operatorRole: '审批人',
        comment: `改期通过：${comment || '同意改期'}`,
        timestamp: now.toISOString()
      };

      const newCages = computeCageState(state.cages, updatedBookings);
      const { pending, approved } = syncBookingInApprovals(updatedBookings, state.pendingApprovals, state.approvedList);

      return {
        bookings: updatedBookings,
        rescheduleRequests: updatedRequests,
        cages: newCages,
        pendingApprovals: pending.filter(p => p.node.id !== `reschedule-node-${requestId}`),
        approvedList: approved,
        approvalTrails: {
          ...state.approvalTrails,
          [req.bookingId]: [...(state.approvalTrails[req.bookingId] || []), trail]
        }
      };
    });
  },

  rejectReschedule: (requestId, comment) => {
    set(state => {
      const reqIdx = state.rescheduleRequests.findIndex(r => r.id === requestId);
      if (reqIdx === -1) return state;

      const req = state.rescheduleRequests[reqIdx];
      const now = new Date();

      const updatedRequests = state.rescheduleRequests.map((r, i) => {
        if (i !== reqIdx) return r;
        return {
          ...r,
          status: 'rejected' as const,
          approverId: currentUser.id,
          approverName: currentUser.name,
          approvalComment: comment,
          handledAt: now.toISOString()
        };
      });

      const trail: ApprovalTrail = {
        id: generateId(),
        nodeId: 'reschedule',
        action: 'reschedule_reject',
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        operatorRole: '审批人',
        comment: `改期拒绝：${comment || '不同意改期'}`,
        timestamp: now.toISOString()
      };

      const { pending, approved } = syncBookingInApprovals(state.bookings, state.pendingApprovals, state.approvedList);

      return {
        rescheduleRequests: updatedRequests,
        pendingApprovals: pending.filter(p => p.node.id !== `reschedule-node-${requestId}`),
        approvedList: approved,
        approvalTrails: {
          ...state.approvalTrails,
          [req.bookingId]: [...(state.approvalTrails[req.bookingId] || []), trail]
        }
      };
    });
  },

  getCageOccupancy: (cageId) => {
    const state = get();
    const occupancy: Array<{
      startTime: string;
      endTime: string;
      groupId: string;
      groupName: string;
      bookingId: string;
      bookingStatus: string;
    }> = [];

    const relevantBookings = state.bookings
      .filter(b => b.cageId === cageId && (b.status === 'approved' || b.status === 'in_use' || b.status === 'pending'))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const groupMap = new Map<string, typeof occupancy>();
    relevantBookings.forEach(b => {
      const key = b.groupId;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push({
        startTime: b.startTime,
        endTime: b.endTime,
        groupId: b.groupId,
        groupName: b.groupName,
        bookingId: b.id,
        bookingStatus: b.status
      });
    });

    groupMap.forEach(items => {
      let i = 0;
      while (i < items.length) {
        let current = { ...items[i] };
        let j = i + 1;
        while (j < items.length) {
          const endCurrent = new Date(current.endTime).getTime();
          const startNext = new Date(items[j].startTime).getTime();
          if (current.groupId === items[j].groupId && (startNext - endCurrent) <= 3600000) {
            current.endTime = items[j].endTime;
            j++;
          } else {
            break;
          }
        }
        occupancy.push(current);
        i = j;
      }
    });

    return occupancy.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },

  getOccupancyForDay: (cageId, dateStr) => {
    const state = get();
    const dayStart = new Date(`${dateStr} 00:00:00`).getTime();
    const dayEnd = new Date(`${dateStr} 23:59:59`).getTime();

    const relevantBookings = state.bookings
      .filter(b => {
        if (b.cageId !== cageId) return false;
        if (!(b.status === 'approved' || b.status === 'in_use' || b.status === 'pending')) return false;
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return bStart <= dayEnd && bEnd >= dayStart;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return relevantBookings.map(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const startHour = bStart.getHours() + bStart.getMinutes() / 60;
      const endHour = bEnd.getHours() + bEnd.getMinutes() / 60;

      return {
        startTime: b.startTime,
        endTime: b.endTime,
        startHour: Math.max(0, Math.min(24, startHour)),
        endHour: Math.max(0, Math.min(24, endHour)),
        groupId: b.groupId,
        groupName: b.groupName,
        bookingId: b.id,
        bookingStatus: b.status
      };
    });
  },

  checkConflict: (cageId, startTime, endTime, excludeBookingId) => {
    const state = get();
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    
    if (endMs <= startMs) return true;
    
    return state.bookings.some(b => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.cageId !== cageId) return false;
      if (!(b.status === 'approved' || b.status === 'in_use' || b.status === 'pending')) return false;
      
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      
      return startMs < bEnd && endMs > bStart;
    });
  }
}));
