import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

export type StatusType = 
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'reserved'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'in_use'
  | 'completed'
  | 'overtime'
  | 'escalated';

interface StatusTagProps {
  status: StatusType;
  text?: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<StatusType, { text: string; className: string } = {
  available: { text: '空闲', className: 'available' },
  occupied: { text: '占用中', className: 'occupied' },
  maintenance: { text: '维护中', className: 'maintenance' },
  reserved: { text: '已预约', className: 'reserved' },
  pending: { text: '待审批', className: 'pending' },
  approved: { text: '已通过', className: 'approved' },
  rejected: { text: '已拒绝', className: 'rejected' },
  cancelled: { text: '已取消', className: 'cancelled' },
  in_use: { text: '使用中', className: 'inUse' },
  completed: { text: '已完成', className: 'completed' },
  overtime: { text: '已超时', className: 'overtime' },
  escalated: { text: '已升级', className: 'escalated' }
};

const StatusTag: React.FC<StatusTagProps> = ({ status, text, size = 'md' }) => {
  const config = statusMap[status] || statusMap.pending;
  
  return (
    <View className={classnames(styles.tag, styles[config.className], styles[size])}>
      <Text className={styles.text}>{text || config.text}</Text>
    </View>
  );
};

export default StatusTag;
