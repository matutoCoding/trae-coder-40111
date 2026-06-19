import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import StatusTag from '@/components/StatusTag';
import { formatDateTime, getDurationText } from '@/utils/date';
import type { Booking } from '@/types/booking';
import styles from './index.module.scss';

interface BookingCardProps {
  booking: Booking;
  onClick?: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/booking-detail/index?id=${booking.id}`
      });
    }
  };
  
  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.cageInfo}>
          <Text className={styles.cageCode}>{booking.cageCode}</Text>
          <Text className={styles.cageName}>{booking.cageName}</Text>
        </View>
        <View className={styles.statusWrapper}>
          <StatusTag status={booking.status} size="sm" />
          {booking.isMerged && (
            <View className={styles.mergedTag}>
              <Text className={styles.mergedText}>已合并</Text>
            </View>
          )}
        </View>
      </View>
      
      <View className={styles.body}>
        <View className={styles.timeRow}>
          <View className={styles.timeDot} />
          <Text className={styles.timeText}>{formatDateTime(booking.startTime)}</Text>
          <Text className={styles.timeLabel}>开始</Text>
        </View>
        <View className={styles.timeConnector} />
        <View className={styles.timeRow}>
          <View className={`${styles.timeDot} ${styles.endDot}`} />
          <Text className={styles.timeText}>{formatDateTime(booking.endTime)}</Text>
          <Text className={styles.timeLabel}>结束</Text>
        </View>
      </View>
      
      <View className={styles.footer}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>课题组</Text>
          <Text className={styles.infoValue}>{booking.groupName}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>申请人</Text>
          <Text className={styles.infoValue}>{booking.applicantName}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>时长</Text>
          <Text className={styles.infoValue}>{getDurationText(booking.duration)}</Text>
        </View>
      </View>
      
      <View className={styles.purpose}>
        <Text className={styles.purposeLabel}>实验用途：</Text>
        <Text className={styles.purposeText}>{booking.purpose}</Text>
      </View>
    </View>
  );
};

export default BookingCard;
