import type { Cage, TimeSlot } from '@/types/cage';

export const cageList: Cage[] = [
  {
    id: 'cage001',
    code: 'SPF-A-001',
    name: 'SPF级小鼠笼 A-001',
    type: 'SPF',
    room: 'A栋301室',
    location: 'A区第1排第1列',
    capacity: 10,
    currentAnimals: 6,
    status: 'available',
    description: 'SPF级小鼠饲养笼位，配备独立通风系统',
    equipment: ['独立通风系统', '自动饮水器', '恒温控制', '光照控制']
  },
  {
    id: 'cage002',
    code: 'SPF-A-002',
    name: 'SPF级小鼠笼 A-002',
    type: 'SPF',
    room: 'A栋301室',
    location: 'A区第1排第2列',
    capacity: 10,
    currentAnimals: 8,
    status: 'occupied',
    description: 'SPF级小鼠饲养笼位，配备独立通风系统',
    equipment: ['独立通风系统', '自动饮水器', '恒温控制']
  },
  {
    id: 'cage003',
    code: 'SPF-A-003',
    name: 'SPF级大鼠笼 A-003',
    type: 'SPF',
    room: 'A栋302室',
    location: 'B区第2排第1列',
    capacity: 6,
    currentAnimals: 0,
    status: 'available',
    description: 'SPF级大鼠饲养笼位，空间宽敞',
    equipment: ['独立通风系统', '自动饮水器', '跑轮']
  },
  {
    id: 'cage004',
    code: 'CONV-B-001',
    name: '普通级兔笼 B-001',
    type: 'conventional',
    room: 'B栋201室',
    location: 'C区第1排第1列',
    capacity: 2,
    currentAnimals: 2,
    status: 'occupied',
    description: '普通级实验兔饲养笼位',
    equipment: ['自动饮水器', '食槽', '托盘']
  },
  {
    id: 'cage005',
    code: 'ISO-C-001',
    name: '隔离笼 C-001',
    type: 'isolation',
    room: 'C栋101室',
    location: '隔离区',
    capacity: 4,
    currentAnimals: 0,
    status: 'maintenance',
    description: '隔离检疫专用笼位，负压通风',
    equipment: ['负压隔离系统', '空气过滤', '消毒装置']
  },
  {
    id: 'cage006',
    code: 'SPF-A-004',
    name: 'SPF级小鼠笼 A-004',
    type: 'SPF',
    room: 'A栋301室',
    location: 'A区第2排第1列',
    capacity: 10,
    currentAnimals: 4,
    status: 'available',
    description: 'SPF级小鼠饲养笼位，配备独立通风系统',
    equipment: ['独立通风系统', '自动饮水器', '恒温控制', '光照控制']
  },
  {
    id: 'cage007',
    code: 'QUAR-D-001',
    name: '检疫笼 D-001',
    type: 'quarantine',
    room: 'D栋101室',
    location: '检疫区',
    capacity: 5,
    currentAnimals: 3,
    status: 'reserved',
    description: '新进动物检疫专用笼位',
    equipment: ['隔离系统', '健康监测', '消毒设备']
  },
  {
    id: 'cage008',
    code: 'SPF-A-005',
    name: 'SPF级小鼠笼 A-005',
    type: 'SPF',
    room: 'A栋301室',
    location: 'A区第2排第2列',
    capacity: 10,
    currentAnimals: 7,
    status: 'available',
    description: 'SPF级小鼠饲养笼位',
    equipment: ['独立通风系统', '自动饮水器', '恒温控制']
  },
  {
    id: 'cage009',
    code: 'CONV-B-002',
    name: '普通级豚鼠笼 B-002',
    type: 'conventional',
    room: 'B栋202室',
    location: 'D区第1排第1列',
    capacity: 4,
    currentAnimals: 0,
    status: 'available',
    description: '普通级豚鼠饲养笼位',
    equipment: ['自动饮水器', '食槽', '垫料']
  },
  {
    id: 'cage010',
    code: 'SPF-A-006',
    name: 'SPF级裸鼠笼 A-006',
    type: 'SPF',
    room: 'A栋303室',
    location: '特殊动物区',
    capacity: 8,
    currentAnimals: 5,
    status: 'occupied',
    description: 'SPF级裸鼠专用饲养笼位',
    equipment: ['独立通风系统', '恒温恒湿', '无菌操作接口']
  }
];

const generateTimeSlots = (cageId: string, baseDate: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    for (let hour = 8; hour < 20; hour += 2) {
      const startHour = hour.toString().padStart(2, '0');
      const endHour = (hour + 2).toString().padStart(2, '0');
      const isOccupied = Math.random() > 0.6;
      
      slots.push({
        id: `${cageId}-${dateStr}-${startHour}`,
        cageId,
        startTime: `${dateStr} ${startHour}:00`,
        endTime: `${dateStr} ${endHour}:00`,
        status: isOccupied ? 'occupied' : 'available',
        bookingId: isOccupied ? `booking-${Math.random().toString(36).substr(2, 9)}` : undefined,
        groupId: isOccupied ? 'group001' : undefined
      });
    }
  }
  return slots;
};

export const getCageTimeSlots = (cageId: string): TimeSlot[] => {
  const today = new Date().toISOString().split('T')[0];
  return generateTimeSlots(cageId, today);
};
