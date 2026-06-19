import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import StatusTag from '@/components/StatusTag';
import { formatDateTime, getOvertimeText, isOvertime } from '@/utils/date';
import type { ApprovalNode } from '@/types/approval';
import type { Booking } from '@/types/booking';
import styles from './index.module.scss';

interface ApprovalCardProps {
  approval: ApprovalNode & { booking: Booking };
  onClick?: () => void;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onClick, showActions = true, onApprove, onReject }) => {
  const { booking, nodeName, approverName, deadline, isOvertime: overtime, escalated } = approval;
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/approval-detail/index?id=${approval.id}&bookingId=${approval.bookingId}`
      });
    }
  };
  
  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApprove) {
      onApprove(approval.id);
    }
  };
  
  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReject) {
      onReject(approval.id);
    }
  };
  
  const overtimeFlag = overtime || isOvertime(deadline);
  
  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.nodeInfo}>
          <Text className={styles.nodeName}>{nodeName}</Text>
          {overtimeFlag && (
            <View className={styles.overtimeBadge}>
              <Text className={styles.overtimeText}>{getOvertimeText(deadline)}</Text>
            </View>
          )}
          {escalated && (
            <View className={styles.escalatedBadge}>
              <Text className={styles.escalatedText}>已升级</Text>
            </View>
          )}
        </View>
        <StatusTag status={approval.status} size="sm" />
      </View>
      
      <View className={styles.bookingInfo}>
        <Text className={styles.cageCode}>{booking.cageCode}</Text>
        <Text className={styles.cageName}>{booking.cageName}</Text>
      </View>
      
      <View className={styles.timeInfo}>
        <View className={styles.timeItem}>
          <Text className={styles.timeLabel}>使用时间</Text>
          <Text className={styles.timeValue}>
            {formatDateTime(booking.startTime)} ~ {formatDateTime(booking.endTime)}
          </Text>
        </View>
      </View>
      
      <View className={styles.applicantInfo}>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>申请人</Text>
          <Text className={styles.infoValue}>{booking.applicantName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>课题组</Text>
          <Text className={styles.infoValue}>{booking.groupName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>实验用途</Text>
          <Text className={styles.infoValue}>{booking.purpose}</Text>
        </View>
      </View>
      
      <View className={styles.deadlineInfo}>
        <Text className={styles.deadlineLabel}>审批截止：</Text>
        <Text className={`${styles.deadlineValue} ${overtimeFlag ? styles.overtime : ''}`}>
          {formatDateTime(deadline)}
        </Text>
      </View>
      
      {showActions && (approval.status === 'pending' || approval.status === 'overtime') && (
        <View className={styles.actions}>
          <View className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={handleReject}>
            <Text className={styles.rejectText}>拒绝</Text>
          </View>
          <View className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={handleApprove}>
            <Text className={styles.approveText}>通过</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default ApprovalCard;
