export type CageStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';

export type CageType = 'SPF' | 'conventional' | 'isolation' | 'quarantine';

export interface Cage {
  id: string;
  code: string;
  name: string;
  type: CageType;
  room: string;
  location: string;
  capacity: number;
  currentAnimals: number;
  status: CageStatus;
  description: string;
  equipment: string[];
}

export interface TimeSlot {
  id: string;
  cageId: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'occupied' | 'reserved';
  bookingId?: string;
  groupId?: string;
}
