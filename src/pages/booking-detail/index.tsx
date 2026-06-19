import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import StatusTag from '@/components/StatusTag';
import Timeline from '@/components/Timeline';
import SectionHeader from '@/components/SectionHeader';
import { useAppStore } from '@/store';
import { formatDateTime, getDurationText } from '@/utils/date';
import dayjs from 'dayjs';
import styles from './index.module.scss';

const BookingDetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id || '';
  
  const bookings = useAppStore(s => s.bookings);
  const approvalTrails = useAppStore(s => s.approvalTrails);
  const feedingRecords = useAppStore(s => s.feedingRecords);
  const cancelBooking = useAppStore(s => s.cancelBooking);
  const requestReschedule = useAppStore(s => s.requestReschedule);
  const checkAndHandleOvertime = useAppStore(s => s.checkAndHandleOvertime);
  
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  const [splitDate, setSplitDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [splitTime, setSplitTime] = useState('12:00');
  
  const [showReschedule, setShowReschedule] = useState(false);
  const [resStartDate, setResStartDate] = useState(dayjs().add(3, 'day').format('YYYY-MM-DD'));
  const [resStartTime, setResStartTime] = useState('08:00');
  const [resEndDate, setResEndDate] = useState(dayjs().add(5, 'day').format('YYYY-MM-DD'));
  const [resEndTime, setResEndTime] = useState('18:00');
  const [resReason, setResReason] = useState('');
  
  const booking = useMemo(() => {
    return bookings.find(b => b.id === bookingId);
  }, [bookings, bookingId]);
  
  const trails = useMemo(() => {
    return approvalTrails[bookingId] || [];
  }, [approvalTrails, bookingId]);
  
  const cageFeedingRecords = useMemo(() => {
    if (!booking) return [];
    return feedingRecords
      .filter(r => r.cageId === booking.cageId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [feedingRecords, booking]);
  
  const splitBookings = useMemo(() => {
    if (!booking || !booking.remark?.includes('退订拆分')) return [];
    return bookings.filter(b => b.id.startsWith(bookingId) && b.id !== bookingId);
  }, [bookings, bookingId, booking]);
  
  const handleCancel = () => {
    if (!booking) return;
    
    if (booking.status === 'in_use') {
      Taro.showModal({
        title: '中途退订',
        content: '使用中的预约退订将从指定时间点拆分，前段保留为已完成，后段取消。是否继续？',
        success: (res) => {
          if (res.confirm) {
            const splitTimeStr = `${splitDate} ${splitTime}`;
            cancelBooking(bookingId, splitTimeStr);
            console.log('[BookingDetail] 中途退订', bookingId, splitTimeStr);
            Taro.showToast({ title: '已退订并拆分', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 1500);
          }
        }
      });
    } else {
      Taro.showModal({
        title: '确认取消',
        content: '确定要取消这个预约吗？',
        success: (res) => {
          if (res.confirm) {
            cancelBooking(bookingId);
            console.log('[BookingDetail] 取消预约', bookingId);
            Taro.showToast({ title: '已取消', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 1500);
          }
        }
      });
    }
  };
  
  const canCancel = booking && (booking.status === 'pending' || booking.status === 'approved' || booking.status === 'in_use');
  const canReschedule = booking && (booking.status === 'pending' || booking.status === 'approved' || booking.status === 'in_use');
  
  const handleReschedule = () => {
    if (!booking) return;
    if (!resReason.trim()) {
      Taro.showToast({ title: '请填写改期原因', icon: 'none' });
      return;
    }
    
    const newStart = `${resStartDate} ${resStartTime}`;
    const newEnd = `${resEndDate} ${resEndTime}`;
    const startTs = new Date(newStart).getTime();
    const endTs = new Date(newEnd).getTime();
    if (endTs <= startTs) {
      Taro.showToast({ title: '结束时间需晚于开始', icon: 'none' });
      return;
    }
    
    const ok = requestReschedule(booking.id, newStart, newEnd, resReason.trim());
    if (ok) {
      Taro.showToast({ title: '改期申请已提交', icon: 'success' });
      setShowReschedule(false);
    } else {
      Taro.showToast({ title: '新时间段存在冲突或不可用', icon: 'none' });
    }
  };
  
  useEffect(() => {
    checkAndHandleOvertime();
  }, [checkAndHandleOvertime]);
  
  const feedIconMap: Record<string, string> = {
    feeding: '🍽️',
    cleaning: '🧹',
    health_check: '🏥',
    treatment: '💊',
    other: '📝'
  };
  
  if (!booking) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: '100rpx 0' }}>
          <Text style={{ color: '#94a3b8' }}>预约不存在</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.cageCode}>{booking.cageCode}</Text>
        <Text className={styles.cageName}>{booking.cageName}</Text>
      </View>
      
      <View className={styles.content}>
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>预约信息</Text>
            </View>
            <StatusTag status={booking.status} />
          </View>
          
          <View className={styles.timeRange}>
            <View className={styles.timeRow}>
              <View className={`${styles.timeDot} ${styles.startDot}`} />
              <Text className={styles.timeText}>{formatDateTime(booking.startTime)}</Text>
              <Text className={styles.timeLabel}>开始</Text>
            </View>
            <View className={styles.timeRow}>
              <View className={`${styles.timeDot} ${styles.endDot}`} />
              <Text className={styles.timeText}>{formatDateTime(booking.endTime)}</Text>
              <Text className={styles.timeLabel}>结束</Text>
            </View>
          </View>
          
          <View className={styles.infoGrid}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>申请人</Text>
              <Text className={styles.infoValue}>{booking.applicantName}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>课题组</Text>
              <Text className={styles.infoValue}>{booking.groupName}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>动物数量</Text>
              <Text className={styles.infoValue}>{booking.animalCount}只</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>动物类型</Text>
              <Text className={styles.infoValue}>{booking.animalType}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>使用时长</Text>
              <Text className={styles.infoValue}>{getDurationText(booking.duration)}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>是否合并</Text>
              <Text className={styles.infoValue}>{booking.isMerged ? '是(连续时段合并)' : '否'}</Text>
            </View>
          </View>
          
          <View className={styles.infoFull}>
            <Text className={styles.infoLabel}>实验用途</Text>
            <Text className={styles.infoValue}>{booking.purpose}</Text>
          </View>
          {booking.remark && (
            <View className={styles.infoFull}>
              <Text className={styles.infoLabel}>备注</Text>
              <Text className={styles.infoValue}>{booking.remark}</Text>
            </View>
          )}
        </View>
        
        {booking.status === 'in_use' && canCancel && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <View className={styles.sectionTitle}>
                <View className={styles.titleBar} />
                <Text>退订拆分</Text>
              </View>
            </View>
            <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '16rpx', display: 'block' }}>
              选择退订时间点，前段保留为已完成，后段取消
            </Text>
            <View style={{ display: 'flex', gap: '16rpx', marginBottom: '16rpx' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '8rpx', display: 'block' }}>退订日期</Text>
                <Picker mode="date" value={splitDate} onChange={(e) => setSplitDate(e.detail.value)}>
                  <View className={styles.timeRow} style={{ background: '#f1f5f9', borderRadius: '12rpx', padding: '0 16rpx', height: '72rpx' }}>
                    <Text style={{ fontSize: '28rpx' }}>{splitDate}</Text>
                  </View>
                </Picker>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '8rpx', display: 'block' }}>退订时间</Text>
                <Picker mode="time" value={splitTime} onChange={(e) => setSplitTime(e.detail.value)}>
                  <View className={styles.timeRow} style={{ background: '#f1f5f9', borderRadius: '12rpx', padding: '0 16rpx', height: '72rpx' }}>
                    <Text style={{ fontSize: '28rpx' }}>{splitTime}</Text>
                  </View>
                </Picker>
              </View>
            </View>
            <View className={styles.splitNotice}>
              <Text className={styles.splitTitle}>拆分预览</Text>
              <Text className={styles.splitText}>
                前: {booking.startTime} ~ {splitDate} {splitTime} (已完成){'\n'}
                后: {splitDate} {splitTime} ~ {booking.endTime} (将取消)
              </Text>
            </View>
            <View className={styles.cancelBtn} onClick={handleCancel}>
              <Text className={styles.cancelText}>确认退订并拆分</Text>
            </View>
          </View>
        )}
        
        {canReschedule && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <View className={styles.sectionTitle}>
                <View className={styles.titleBar} />
                <Text>申请改期</Text>
              </View>
              <View style={{
                fontSize: '24rpx',
                color: '#0ea5e9',
                padding: '6rpx 20rpx',
                background: 'rgba(14, 165, 233, 0.1)',
                borderRadius: '999rpx',
              }} onClick={() => setShowReschedule(v => !v)}>
                <Text>{showReschedule ? '收起' : '展开填写'}</Text>
              </View>
            </View>
            
            <Text style={{ fontSize: '24rpx', color: '#64748b', marginBottom: '16rpx', display: showReschedule ? 'block' : 'none' }}>
              改期需要重新审批，审批通过后排期自动移到新时间段
            </Text>
            
            {showReschedule && (
              <>
                <Text style={{ fontSize: '26rpx', color: '#0ea5e9', fontWeight: 600, marginBottom: '16rpx', display: 'block' }}>
                  原预约时间: {booking.startTime} ~ {booking.endTime}
                </Text>
                
                <View style={{ display: 'flex', gap: '16rpx', marginBottom: '16rpx' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '8rpx', display: 'block' }}>新开始日期</Text>
                    <Picker mode="date" value={resStartDate} onChange={(e) => setResStartDate(e.detail.value)}>
                      <View className={styles.timeRow} style={{ background: '#f1f5f9', borderRadius: '12rpx', padding: '0 16rpx', height: '72rpx' }}>
                        <Text style={{ fontSize: '28rpx' }}>{resStartDate}</Text>
                      </View>
                    </Picker>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '8rpx', display: 'block' }}>新开始时间</Text>
                    <Picker mode="time" value={resStartTime} onChange={(e) => setResStartTime(e.detail.value)}>
                      <View className={styles.timeRow} style={{ background: '#f1f5f9', borderRadius: '12rpx', padding: '0 16rpx', height: '72rpx' }}>
                        <Text style={{ fontSize: '28rpx' }}>{resStartTime}</Text>
                      </View>
                    </Picker>
                  </View>
                </View>
                
                <View style={{ display: 'flex', gap: '16rpx', marginBottom: '16rpx' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '8rpx', display: 'block' }}>新结束日期</Text>
                    <Picker mode="date" value={resEndDate} onChange={(e) => setResEndDate(e.detail.value)}>
                      <View className={styles.timeRow} style={{ background: '#f1f5f9', borderRadius: '12rpx', padding: '0 16rpx', height: '72rpx' }}>
                        <Text style={{ fontSize: '28rpx' }}>{resEndDate}</Text>
                      </View>
                    </Picker>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '8rpx', display: 'block' }}>新结束时间</Text>
                    <Picker mode="time" value={resEndTime} onChange={(e) => setResEndTime(e.detail.value)}>
                      <View className={styles.timeRow} style={{ background: '#f1f5f9', borderRadius: '12rpx', padding: '0 16rpx', height: '72rpx' }}>
                        <Text style={{ fontSize: '28rpx' }}>{resEndTime}</Text>
                      </View>
                    </Picker>
                  </View>
                </View>
                
                <View style={{ marginBottom: '16rpx' }}>
                  <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginBottom: '8rpx', display: 'block' }}>改期原因（必填）</Text>
                  <View style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: '160rpx',
                    background: '#f1f5f9',
                    borderRadius: '12rpx',
                    padding: '16rpx',
                    fontSize: '28rpx',
                    border: '2rpx solid transparent',
                  }}>
                    <textarea
                      style={{ width: '100%', minHeight: '120rpx', fontSize: '28rpx', background: 'transparent' }}
                      placeholder="请说明改期原因，如实验安排变化等"
                      value={resReason}
                      onInput={(e: any) => setResReason(e.detail.value)}
                    />
                  </View>
                </View>
                
                <View
                  className={styles.cancelBtn}
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)' }}
                  onClick={handleReschedule}
                >
                  <Text style={{ color: '#fff', fontWeight: 600 }}>提交改期申请</Text>
                </View>
              </>
            )}
          </View>
        )}
        
        {booking.status !== 'in_use' && canCancel && (
          <View className={styles.section}>
            <View className={styles.cancelBtn} onClick={handleCancel}>
              <Text className={styles.cancelText}>取消预约</Text>
            </View>
          </View>
        )}
        
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>审批轨迹</Text>
            </View>
          </View>
          {trails.length > 0 ? (
            <Timeline trails={trails} />
          ) : (
            <View className={styles.feedEmpty}>
              <Text className={styles.feedEmptyText}>暂无审批记录</Text>
            </View>
          )}
        </View>
        
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>饲养记录</Text>
            </View>
            <Text style={{ fontSize: '24rpx', color: '#94a3b8' }}>{cageFeedingRecords.length}条</Text>
          </View>
          {cageFeedingRecords.length > 0 ? (
            cageFeedingRecords.map(record => (
              <View key={record.id} className={styles.feedItem}>
                <View className={styles.feedIcon}>
                  <Text>{feedIconMap[record.type] || '📝'}</Text>
                </View>
                <View className={styles.feedContent}>
                  <View className={styles.feedHeader}>
                    <Text className={styles.feedType}>{record.typeName}</Text>
                    <Text className={styles.feedTime}>{formatDateTime(record.timestamp)}</Text>
                  </View>
                  <Text className={styles.feedDesc}>{record.content}</Text>
                  <Text className={styles.feedOperator}>操作人: {record.operatorName}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className={styles.feedEmpty}>
              <Text className={styles.feedEmptyText}>暂无饲养记录</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default BookingDetailPage;
