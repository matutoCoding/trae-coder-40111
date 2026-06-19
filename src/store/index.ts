import { create } from 'zustand';
import type { Booking, FeedingRecord } from '@/types/booking';
import type { ApprovalNode, ApprovalTrail, OvertimeRecord } from '@/types/approval';
import { myBookings as initBookings, feedingRecords as initFeeding } from '@/data/booking';
import { pendingApprovals as initPending, myApproved as initApproved, overtimeRecords as initOvertime } from '@/data/approval';
import { currentUser } from '@/data/user';

interface ApprovalItem {
  node: ApprovalNode;
  booking: Booking;
}

interface AppState {
  bookings: Booking[];
  pendingApprovals: ApprovalItem[];
  approvedList: ApprovalItem[];
  overtimeRecords: OvertimeRecord[];
  feedingRecords: FeedingRecord[];
  approvalTrails: Record<string, ApprovalTrail[]>;

  addBooking: (booking: Booking) => void;
  cancelBooking: (bookingId: string, splitTime?: string) => void;
  approveNode: (nodeId: string, comment: string) => void;
  rejectNode: (nodeId: string, comment: string) => void;
  addOvertimeRecord: (record: OvertimeRecord) => void;
  addApprovalTrail: (bookingId: string, trail: ApprovalTrail) => void;
  addFeedingRecord: (record: FeedingRecord) => void;
  checkAndHandleOvertime: () => void;
}

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const buildApprovalNodes = (bookingId: string): ApprovalNode[] => {
  const now = new Date();
  return [
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
};

const initTrails: Record<string, ApprovalTrail[]> = {};
const initBookingIds = ['booking001', 'booking002', 'booking003', 'booking004', 'booking005'];
initBookingIds.forEach(id => {
  const booking = initBookings.find(b => b.id === id);
  if (booking && booking.approvalTrails.length > 0) {
    initTrails[id] = booking.approvalTrails;
  }
});
initPending.forEach(item => {
  if (item.booking.approvalTrails && item.booking.approvalTrails.length > 0) {
    initTrails[item.booking.id] = item.booking.approvalTrails;
  }
});

export const useAppStore = create<AppState>((set, get) => ({
  bookings: initBookings,
  pendingApprovals: initPending.map(item => ({ node: item, booking: item.booking })),
  approvedList: initApproved.map(item => ({ node: item, booking: item.booking })),
  overtimeRecords: initOvertime,
  feedingRecords: initFeeding,
  approvalTrails: initTrails,

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

      if (splitTime && booking.status === 'in_use') {
        const startMs = new Date(booking.startTime).getTime();
        const endMs = new Date(booking.endTime).getTime();
        const splitMs = new Date(splitTime).getTime();

        if (splitMs > startMs && splitMs < endMs) {
          const firstDuration = Math.floor((splitMs - startMs) / (1000 * 60 * 60));
          const secondDuration = Math.floor((endMs - splitMs) / (1000 * 60 * 60));

          const firstBooking: Booking = {
            ...booking,
            id: `${booking.id}-part1`,
            endTime: splitTime,
            duration: firstDuration,
            status: 'completed',
            isMerged: false,
            mergedFrom: undefined,
            updatedAt: now.toISOString()
          };

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

          const newBookings = state.bookings.map(b => {
            if (b.id === bookingId) {
              return { ...b, status: 'completed' as const, endTime: splitTime, duration: firstDuration, updatedAt: now.toISOString() };
            }
            return b;
          });

          return {
            bookings: [...newBookings, secondBooking],
            approvalTrails: {
              ...state.approvalTrails,
              [bookingId]: [...existingTrails, cancelTrail],
              [`${booking.id}-part2`]: [cancelTrail]
            }
          };
        }
      }

      const newBookings = state.bookings.map(b => {
        if (b.id === bookingId) {
          return { ...b, status: 'cancelled' as const, updatedAt: now.toISOString() };
        }
        return b;
      });

      return {
        bookings: newBookings,
        approvalTrails: {
          ...state.approvalTrails,
          [bookingId]: [...existingTrails, cancelTrail]
        }
      };
    });
  },

  approveNode: (nodeId, comment) => {
    set(state => {
      const targetIdx = state.pendingApprovals.findIndex(item => item.node.id === nodeId);
      if (targetIdx === -1) return state;

      const target = state.pendingApprovals[targetIdx];
      const now = new Date();

      const approvedNode: ApprovalNode = {
        ...target.node,
        status: 'approved',
        comment,
        handledAt: now.toISOString()
      };

      const trail: ApprovalTrail = {
        id: generateId(),
        nodeId: target.node.id,
        action: 'approve',
        operatorId: target.node.approverId,
        operatorName: target.node.approverName,
        operatorRole: target.node.nodeName,
        comment,
        timestamp: now.toISOString()
      };

      const bookingId = target.node.bookingId;
      const existingTrails = state.approvalTrails[bookingId] || [];

      const bookingIdx = state.bookings.findIndex(b => b.id === bookingId);
      let updatedBookings = [...state.bookings];
      let updatedBooking = target.booking;

      if (bookingIdx !== -1) {
        const currentNodeIdx = updatedBooking.approvalNodes.findIndex(n => n.id === nodeId);
        const isLastNode = currentNodeIdx >= 0 && currentNodeIdx === updatedBooking.approvalNodes.length - 1;

        const updatedNodes = updatedBooking.approvalNodes.map(n =>
          n.id === nodeId ? approvedNode : n
        );

        if (isLastNode) {
          updatedBooking = {
            ...updatedBooking,
            status: 'approved',
            approvalNodes: updatedNodes,
            currentApprovalNode: updatedBooking.approvalNodes.length,
            updatedAt: now.toISOString()
          };
        } else {
          const nextNodeIdx = (currentNodeIdx >= 0 ? currentNodeIdx : 0) + 1;
          updatedBooking = {
            ...updatedBooking,
            approvalNodes: updatedNodes,
            currentApprovalNode: nextNodeIdx + 1,
            updatedAt: now.toISOString()
          };
        }

        updatedBookings[bookingIdx] = updatedBooking;
      }

      const remainingPending = state.pendingApprovals.filter((_, i) => i !== targetIdx);

      const newPending = remainingPending.map(item => {
        if (item.booking.id === bookingId) {
          return { ...item, booking: updatedBooking };
        }
        return item;
      });

      const isLastApprovalForBooking = !newPending.some(item => item.booking.id === bookingId);

      return {
        bookings: updatedBookings,
        pendingApprovals: newPending,
        approvedList: [{ node: approvedNode, booking: updatedBooking }, ...state.approvedList],
        approvalTrails: {
          ...state.approvalTrails,
          [bookingId]: [...existingTrails, trail]
        }
      };
    });
  },

  rejectNode: (nodeId, comment) => {
    set(state => {
      const targetIdx = state.pendingApprovals.findIndex(item => item.node.id === nodeId);
      if (targetIdx === -1) return state;

      const target = state.pendingApprovals[targetIdx];
      const now = new Date();

      const rejectedNode: ApprovalNode = {
        ...target.node,
        status: 'rejected',
        comment,
        handledAt: now.toISOString()
      };

      const trail: ApprovalTrail = {
        id: generateId(),
        nodeId: target.node.id,
        action: 'reject',
        operatorId: target.node.approverId,
        operatorName: target.node.approverName,
        operatorRole: target.node.nodeName,
        comment,
        timestamp: now.toISOString()
      };

      const bookingId = target.node.bookingId;
      const existingTrails = state.approvalTrails[bookingId] || [];

      const bookingIdx = state.bookings.findIndex(b => b.id === bookingId);
      let updatedBookings = [...state.bookings];

      if (bookingIdx !== -1) {
        updatedBookings[bookingIdx] = {
          ...updatedBookings[bookingIdx],
          status: 'rejected',
          updatedAt: now.toISOString(),
          approvalNodes: updatedBookings[bookingIdx].approvalNodes.map(n =>
            n.id === nodeId ? rejectedNode : n
          )
        };
      }

      const remainingPending = state.pendingApprovals.filter(item => item.booking.id !== bookingId);

      return {
        bookings: updatedBookings,
        pendingApprovals: remainingPending,
        approvedList: [{ node: rejectedNode, booking: state.bookings.find(b => b.id === bookingId) || target.booking }, ...state.approvedList],
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

    state.pendingApprovals.forEach(item => {
      const deadline = new Date(item.node.deadline);
      if (now > deadline && !item.node.isOvertime) {
        const overtimeRecord: OvertimeRecord = {
          id: generateId(),
          nodeId: item.node.id,
          bookingId: item.node.bookingId,
          deadline: item.node.deadline,
          overtimeAt: now.toISOString(),
          level: 1,
          reminded: true,
          escalated: false,
          responsiblePerson: item.node.approverId,
          responsiblePersonName: item.node.approverName
        };
        get().addOvertimeRecord(overtimeRecord);

        const remindTrail: ApprovalTrail = {
          id: generateId(),
          nodeId: item.node.id,
          action: 'remind',
          operatorId: 'system',
          operatorName: '系统',
          operatorRole: '超时催办',
          comment: `${item.node.approverName} 审批超时，已自动催办`,
          timestamp: now.toISOString()
        };
        get().addApprovalTrail(item.node.bookingId, remindTrail);

        const overtimeMs = now.getTime() - deadline.getTime();
        if (overtimeMs > 86400000) {
          const escalateRecord: OvertimeRecord = {
            id: generateId(),
            nodeId: item.node.id,
            bookingId: item.node.bookingId,
            deadline: item.node.deadline,
            overtimeAt: now.toISOString(),
            level: 2,
            reminded: true,
            escalated: true,
            responsiblePerson: item.node.approverId,
            responsiblePersonName: item.node.approverName
          };
          get().addOvertimeRecord(escalateRecord);

          const escalateTrail: ApprovalTrail = {
            id: generateId(),
            nodeId: item.node.id,
            action: 'escalate',
            operatorId: 'system',
            operatorName: '系统',
            operatorRole: '自动升级',
            comment: `超时超过24小时，已自动升级至上级负责人处理，责任人：${item.node.approverName}`,
            timestamp: now.toISOString()
          };
          get().addApprovalTrail(item.node.bookingId, escalateTrail);
        }
      }
    });
  }
}));
