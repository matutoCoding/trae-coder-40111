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
  _overtimeHandled: Set<string>;

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

const initOvertimeHandled = new Set<string>();
initOvertime.forEach(record => {
  const key = `${record.nodeId}-l${record.level}`;
  initOvertimeHandled.add(key);
});

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

export const useAppStore = create<AppState>((set, get) => ({
  bookings: initBookings,
  pendingApprovals: initPending.map(item => ({ node: item, booking: item.booking })),
  approvedList: initApproved.map(item => ({ node: item, booking: item.booking })),
  overtimeRecords: initOvertime,
  feedingRecords: initFeeding,
  approvalTrails: initTrails,
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

          const { pending, approved } = syncBookingInApprovals(finalBookings, state.pendingApprovals, state.approvedList);

          return {
            bookings: finalBookings,
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

      const { pending, approved } = syncBookingInApprovals(finalBookings, state.pendingApprovals, state.approvedList);

      return {
        bookings: finalBookings,
        pendingApprovals: pending.filter(item => item.booking.id !== bookingId),
        approvedList: approved,
        approvalTrails: newTrails
      };
    });
  },

  approveNode: (nodeId, comment) => {
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

      const { pending: syncedPending, approved: syncedApproved } = syncBookingInApprovals(
        updatedBookings,
        newPending,
        newApproved
      );

      return {
        bookings: updatedBookings,
        pendingApprovals: syncedPending,
        approvedList: syncedApproved,
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

      const { pending: syncedPending, approved: syncedApproved } = syncBookingInApprovals(
        updatedBookings,
        newPending,
        newApproved
      );

      return {
        bookings: updatedBookings,
        pendingApprovals: syncedPending,
        approvedList: syncedApproved,
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
  }
}));
