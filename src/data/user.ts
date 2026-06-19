import type { User, ResearchGroup } from '@/types/user';

export const currentUser: User = {
  id: 'user001',
  name: '张伟',
  role: 'researcher',
  phone: '13800138001',
  email: 'zhangwei@research.edu.cn',
  department: '生命科学学院',
  groupId: 'group001',
  groupName: '神经生物学课题组'
};

export const researchGroups: ResearchGroup[] = [
  {
    id: 'group001',
    name: '神经生物学课题组',
    leader: '李教授',
    memberCount: 12,
    members: ['user001', 'user002', 'user003']
  },
  {
    id: 'group002',
    name: '肿瘤生物学课题组',
    leader: '王教授',
    memberCount: 8,
    members: ['user004', 'user005']
  },
  {
    id: 'group003',
    name: '免疫学课题组',
    leader: '陈教授',
    memberCount: 10,
    members: ['user006', 'user007']
  }
];

export const approvers: User[] = [
  {
    id: 'approver001',
    name: '李教授',
    role: 'approver',
    phone: '13900139001',
    email: 'liprof@research.edu.cn',
    department: '生命科学学院',
    groupId: 'group001',
    groupName: '神经生物学课题组'
  },
  {
    id: 'approver002',
    name: '赵主任',
    role: 'approver',
    phone: '13900139002',
    email: 'zhaodr@research.edu.cn',
    department: '实验动物中心',
    groupId: '',
    groupName: ''
  }
];
