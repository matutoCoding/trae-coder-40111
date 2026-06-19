import React from 'react';
import { View, Text } from '@tarojs/components';
import { formatDateTime } from '@/utils/date';
import type { ApprovalTrail } from '@/types/approval';
import styles from './index.module.scss';

interface TimelineProps {
  trails: ApprovalTrail[];
}

const actionLabels: Record<string, string> = {
  submit: '提交申请',
  approve: '审批通过',
  reject: '审批拒绝',
  escalate: '升级处理',
  remind: '催办提醒',
  reschedule_request: '申请改期',
  reschedule_approve: '改期通过',
  reschedule_reject: '改期拒绝'
};

const actionColors: Record<string, string> = {
  submit: '#0ea5e9',
  approve: '#10b981',
  reject: '#ef4444',
  escalate: '#f59e0b',
  remind: '#f59e0b',
  reschedule_request: '#8b5cf6',
  reschedule_approve: '#10b981',
  reschedule_reject: '#ef4444'
};

const Timeline: React.FC<TimelineProps> = ({ trails }) => {
  const sortedTrails = [...trails].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  return (
    <View className={styles.timeline}>
      {sortedTrails.map((trail, index) => (
        <View 
          key={trail.id} 
          className={`${styles.timelineItem} ${index === sortedTrails.length - 1 ? styles.lastItem : ''}`}
        >
          <View className={styles.dotWrapper}>
            <View 
              className={styles.dot}
              style={{ backgroundColor: actionColors[trail.action] || '#94a3b8' }}
            />
            {index !== sortedTrails.length - 1 && (
              <View className={styles.line} />
            )}
          </View>
          
          <View className={styles.content}>
            <View className={styles.header}>
              <Text className={styles.action} style={{ color: actionColors[trail.action] }}>
                {actionLabels[trail.action] || trail.action}
              </Text>
              <Text className={styles.time}>{formatDateTime(trail.timestamp)}</Text>
            </View>
            <View className={styles.operator}>
              <Text className={styles.operatorName}>{trail.operatorName}</Text>
              <Text className={styles.operatorRole}>· {trail.operatorRole}</Text>
            </View>
            {trail.comment && (
              <View className={styles.comment}>
                <Text className={styles.commentText}>{trail.comment}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export default Timeline;
