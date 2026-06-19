import type { Booking } from '@/types/booking';
import type { TimeSlot } from '@/types/cage';

interface MergeableItem {
  id: string;
  startTime: string;
  endTime: string;
  groupId: string;
  cageId: string;
}

export const canMerge = (item1: MergeableItem, item2: MergeableItem): boolean => {
  if (item1.groupId !== item2.groupId || item1.cageId !== item2.cageId) {
    return false;
  }
  
  const end1 = new Date(item1.endTime).getTime();
  const start2 = new Date(item2.startTime).getTime();
  
  return end1 === start2;
};

export const mergeBookings = (bookings: Booking[]): Booking[] => {
  if (bookings.length <= 1) return bookings;
  
  const sorted = [...bookings].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  const merged: Booking[] = [];
  let current: Booking | null = null;
  
  for (const booking of sorted) {
    if (!current) {
      current = { ...booking };
      continue;
    }
    
    if (
      current.groupId === booking.groupId &&
      current.cageId === booking.cageId &&
      current.status === booking.status &&
      new Date(current.endTime).getTime() === new Date(booking.startTime).getTime()
    ) {
      current = {
        ...current,
        endTime: booking.endTime,
        duration: current.duration + booking.duration,
        isMerged: true,
        mergedFrom: [...(current.mergedFrom || [current.id]), booking.id]
      };
    } else {
      merged.push(current);
      current = { ...booking };
    }
  }
  
  if (current) {
    merged.push(current);
  }
  
  return merged;
};

export const splitBooking = (
  booking: Booking,
  splitTime: string
): { first: Booking; second: Booking } | null => {
  const start = new Date(booking.startTime).getTime();
  const end = new Date(booking.endTime).getTime();
  const split = new Date(splitTime).getTime();
  
  if (split <= start || split >= end) {
    return null;
  }
  
  const firstDuration = Math.floor((split - start) / (1000 * 60 * 60));
  const secondDuration = Math.floor((end - split) / (1000 * 60 * 60));
  
  const first: Booking = {
    ...booking,
    id: `${booking.id}-1`,
    startTime: booking.startTime,
    endTime: splitTime,
    duration: firstDuration,
    isMerged: false,
    mergedFrom: undefined
  };
  
  const second: Booking = {
    ...booking,
    id: `${booking.id}-2`,
    startTime: splitTime,
    endTime: booking.endTime,
    duration: secondDuration,
    isMerged: false,
    mergedFrom: undefined
  };
  
  return { first, second };
};

export const mergeTimeSlots = (slots: TimeSlot[], groupId: string): TimeSlot[] => {
  if (slots.length <= 1) return slots;
  
  const groupSlots = slots.filter(s => s.groupId === groupId);
  const otherSlots = slots.filter(s => s.groupId !== groupId);
  
  if (groupSlots.length <= 1) return slots;
  
  const sorted = [...groupSlots].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  const merged: TimeSlot[] = [];
  let current: TimeSlot | null = null;
  
  for (const slot of sorted) {
    if (!current) {
      current = { ...slot };
      continue;
    }
    
    const currentEnd = new Date(current.endTime).getTime();
    const slotStart = new Date(slot.startTime).getTime();
    
    if (currentEnd === slotStart) {
      current = {
        ...current,
        endTime: slot.endTime,
        id: `${current.id}_merged`
      };
    } else {
      merged.push(current);
      current = { ...slot };
    }
  }
  
  if (current) {
    merged.push(current);
  }
  
  return [...merged, ...otherSlots].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
};
