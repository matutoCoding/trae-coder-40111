import React, { useState, useMemo } from 'react';
import { View, Text, Input, Picker } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useAppStore } from '@/store';
import { cageList } from '@/data/cage';
import { currentUser } from '@/data/user';
import { formatDate } from '@/utils/date';
import dayjs from 'dayjs';
import styles from './index.module.scss';

const animalTypes = [
  'C57BL/6小鼠', 'BALB/c小鼠', '裸鼠', 'SD大鼠',
  'Wistar大鼠', '新西兰大白兔', '豚鼠', '比格犬', '其他'
];

const CreateBookingPage: React.FC = () => {
  const router = useRouter();
  const paramCageId = router.params.cageId || '';
  const addBooking = useAppStore(s => s.addBooking);
  const getCageOccupancy = useAppStore(s => s.getCageOccupancy);
  const checkConflict = useAppStore(s => s.checkConflict);
  const bookings = useAppStore(s => s.bookings);
  
  const [selectedCageId, setSelectedCageId] = useState(paramCageId);
  const [startDate, setStartDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(3, 'day').format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [animalCount, setAnimalCount] = useState('');
  const [selectedAnimalType, setSelectedAnimalType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [remark, setRemark] = useState('');
  const [animalTypeIdx, setAnimalTypeIdx] = useState(0);
  
  const availableCages = useMemo(() => {
    return cageList.filter(c => c.status === 'available' || c.status === 'occupied' || c.status === 'reserved');
  }, []);
  
  const selectedCage = useMemo(() => {
    return cageList.find(c => c.id === selectedCageId);
  }, [selectedCageId]);
  
  const startDateTimeStr = `${startDate} ${startTime}`;
  const endDateTimeStr = `${endDate} ${endTime}`;
  
  const occupancy = useMemo(() => {
    if (!selectedCageId) return [];
    return getCageOccupancy(selectedCageId);
  }, [selectedCageId, getCageOccupancy]);
  
  const hasConflict = useMemo(() => {
    if (!selectedCageId || !startDate || !endDate || !startTime || !endTime) return false;
    return checkConflict(selectedCageId, startDateTimeStr, endDateTimeStr);
  }, [selectedCageId, startDateTimeStr, endDateTimeStr, checkConflict]);
  
  const conflictItems = useMemo(() => {
    if (!hasConflict) return [];
    const startTs = new Date(startDateTimeStr).getTime();
    const endTs = new Date(endDateTimeStr).getTime();
    
    return occupancy.filter(occ => {
      const bStart = new Date(occ.startTime).getTime();
      const bEnd = new Date(occ.endTime).getTime();
      return startTs < bEnd && endTs > bStart;
    });
  }, [occupancy, startDateTimeStr, endDateTimeStr, hasConflict]);
  
  const duration = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = dayjs(`${startDate} ${startTime}`);
    const end = dayjs(`${endDate} ${endTime}`);
    return Math.max(0, end.diff(start, 'hour'));
  }, [startDate, endDate, startTime, endTime]);
  
  const canSubmit = useMemo(() => {
    return selectedCageId && startDate && endDate && duration > 0 &&
      animalCount && parseInt(animalCount) > 0 && selectedAnimalType && purpose && !hasConflict;
  }, [selectedCageId, startDate, endDate, duration, animalCount, selectedAnimalType, purpose, hasConflict]);
  
  const handleSubmit = () => {
    if (hasConflict) {
      Taro.showToast({ title: '所选时段存在冲突，请调整', icon: 'none' });
      return;
    }
    if (!canSubmit || !selectedCage) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    
    const count = parseInt(animalCount);
    if (count > selectedCage.capacity) {
      Taro.showToast({ title: `动物数量超过笼位容量(${selectedCage.capacity})`, icon: 'none' });
      return;
    }
    
    const bookingId = `booking-${Date.now()}`;
    const booking = {
      id: bookingId,
      cageId: selectedCage.id,
      cageCode: selectedCage.code,
      cageName: selectedCage.name,
      groupId: currentUser.groupId,
      groupName: currentUser.groupName,
      applicantId: currentUser.id,
      applicantName: currentUser.name,
      startTime: startDateTimeStr,
      endTime: endDateTimeStr,
      duration,
      animalCount: count,
      animalType: selectedAnimalType,
      purpose,
      remark,
      status: 'pending' as const,
      isMerged: false,
      currentApprovalNode: 1,
      approvalNodes: [],
      approvalTrails: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    addBooking(booking);
    console.log('[CreateBooking] 提交预约', bookingId);
    
    Taro.showToast({ title: '预约提交成功', icon: 'success' });
    
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/booking/index' });
    }, 1500);
  };
  
  const handleDateChange = (type: 'start' | 'end', e) => {
    const value = e.detail.value;
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };
  
  const handleTimeChange = (type: 'start' | 'end', e) => {
    const value = e.detail.value;
    if (type === 'start') {
      setStartTime(value);
    } else {
      setEndTime(value);
    }
  };
  
  const handleAnimalTypePick = (e) => {
    const idx = e.detail.value;
    setAnimalTypeIdx(idx);
    setSelectedAnimalType(animalTypes[idx]);
  };
  
  return (
    <View className={styles.page}>
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text className={styles.required}>*</Text>
          <Text>选择笼位</Text>
        </View>
        <View className={styles.cageList}>
          {availableCages.length > 0 ? availableCages.map(cage => {
            const cageOcc = selectedCageId === cage.id ? occupancy : getCageOccupancy(cage.id);
            return (
              <View
                key={cage.id}
                className={`${styles.cageOption} ${selectedCageId === cage.id ? styles.selected : ''}`}
                onClick={() => setSelectedCageId(cage.id)}
              >
                <Text className={styles.cageCode}>{cage.code}</Text>
                <Text className={styles.cageStatus}>
                  {cage.status === 'available' ? '空闲' : cage.status === 'occupied' ? '使用中' : cage.status === 'reserved' ? '已预约' : cage.status === 'maintenance' ? '维护中' : '未知'} · {cage.room}
                </Text>
                {cageOcc.length > 0 && (
                  <Text className={styles.cageConflictBadge}>已占用 {cageOcc.length} 段</Text>
                )}
              </View>
            );
          }) : (
            <View className={styles.emptyCage}>
              <Text className={styles.emptyCageText}>暂无可用笼位</Text>
            </View>
          )}
        </View>
      </View>
      
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text className={styles.required}>*</Text>
          <Text>使用时间</Text>
        </View>
        <View className={styles.dateRow}>
          <View className={styles.dateField}>
            <Text className={styles.dateLabel}>开始日期</Text>
            <Picker mode="date" value={startDate} onChange={(e) => handleDateChange('start', e)}>
              <View className={styles.dateInput}>
                <Text>{startDate}</Text>
              </View>
            </Picker>
          </View>
          <View className={styles.dateField}>
            <Text className={styles.dateLabel}>结束日期</Text>
            <Picker mode="date" value={endDate} onChange={(e) => handleDateChange('end', e)}>
              <View className={styles.dateInput}>
                <Text>{endDate}</Text>
              </View>
            </Picker>
          </View>
        </View>
        <View className={styles.dateRow}>
          <View className={styles.dateField}>
            <Text className={styles.dateLabel}>开始时间</Text>
            <Picker mode="time" value={startTime} onChange={(e) => handleTimeChange('start', e)}>
              <View className={styles.dateInput}>
                <Text>{startTime}</Text>
              </View>
            </Picker>
          </View>
          <View className={styles.dateField}>
            <Text className={styles.dateLabel}>结束时间</Text>
            <Picker mode="time" value={endTime} onChange={(e) => handleTimeChange('end', e)}>
              <View className={styles.dateInput}>
                <Text>{endTime}</Text>
              </View>
            </Picker>
          </View>
        </View>
      </View>
      
      {selectedCageId && occupancy.length > 0 && (
        <View className={styles.occupySection}>
          <View className={styles.sectionTitle}>
            <Text>📅 笼位排期占用</Text>
            <Text style={{ fontSize: '24rpx', color: '#94a3b8' }}>{occupancy.length}段</Text>
          </View>
          {occupancy.map((occ, idx) => {
            const isMine = occ.groupId === currentUser.groupId;
            return (
              <View
                key={`${occ.bookingId}-${idx}`}
                className={`${styles.occupyItem} ${isMine ? styles.occupyItemMine : styles.occupyItemOther}`}
              >
                <View className={styles.occupyItemGroup}>
                  <Text>{occ.groupName}</Text>
                  <View className={`${styles.occupyItemBadge} ${isMine ? 'mineBadge' : 'otherBadge'}`}>
                    <Text>{isMine ? '我的' : '其他组'}</Text>
                  </View>
                </View>
                <Text className={styles.occupyItemTime}>
                  {formatDate(occ.startTime)} ~ {formatDate(occ.endTime)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      
      {hasConflict && conflictItems.length > 0 && (
        <View className={styles.conflictSection}>
          <View className={styles.conflictTitle}>⚠️ 时间冲突</View>
          <Text className={styles.conflictTip}>
            所选时段与以下 {conflictItems.length} 段预约重叠，请调整时间：
          </Text>
          {conflictItems.map((item, idx) => (
            <View key={`${item.bookingId}-${idx}`} className={styles.conflictItem}>
              <Text className={styles.conflictItemGroup}>
                {item.groupName}（{item.groupId === currentUser.groupId ? '本组' : '其他组'}）
              </Text>
              <Text className={styles.conflictItemTime}>
                {formatDate(item.startTime)} ~ {formatDate(item.endTime)}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text className={styles.required}>*</Text>
          <Text>动物信息</Text>
        </View>
        <View className={styles.inputGroup}>
          <Text className={styles.inputLabel}>
            <Text className={styles.required}>*</Text>
            <Text>动物数量</Text>
          </Text>
          <Input
            className={styles.input}
            type="number"
            placeholder={`最多 ${selectedCage?.capacity || 0} 只`}
            value={animalCount}
            onInput={(e) => setAnimalCount(e.detail.value)}
          />
          {selectedCage && (
            <Text style={{ fontSize: '24rpx', color: '#94a3b8', marginTop: '8rpx', display: 'block' }}>
              笼位容量: {selectedCage.capacity}只
            </Text>
          )}
        </View>
        <View className={styles.inputGroup}>
          <Text className={styles.inputLabel}>
            <Text className={styles.required}>*</Text>
            <Text>动物类型</Text>
          </Text>
          <Picker mode="selector" range={animalTypes} value={animalTypeIdx} onChange={handleAnimalTypePick}>
            <View className={styles.dateInput}>
              <Text>{selectedAnimalType || '请选择动物类型'}</Text>
            </View>
          </Picker>
        </View>
      </View>
      
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text className={styles.required}>*</Text>
          <Text>实验用途</Text>
        </View>
        <View className={styles.inputGroup}>
          <Input
            className={styles.input}
            placeholder="请输入实验用途"
            value={purpose}
            onInput={(e) => setPurpose(e.detail.value)}
          />
        </View>
        <View className={styles.inputGroup}>
          <Text className={styles.inputLabel}>备注</Text>
          <Input
            className={styles.input}
            placeholder="选填，特殊需求说明"
            value={remark}
            onInput={(e) => setRemark(e.detail.value)}
          />
        </View>
      </View>
      
      {selectedCage && canSubmit && !hasConflict && (
        <View className={styles.summaryCard}>
          <Text className={styles.summaryTitle}>预约摘要</Text>
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>笼位</Text>
            <Text className={styles.summaryValue}>{selectedCage.code} · {selectedCage.room}</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>时间</Text>
            <Text className={styles.summaryValue}>{startDate} {startTime} ~ {endDate} {endTime}</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>时长</Text>
            <Text className={styles.summaryValue}>{duration}小时</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>动物</Text>
            <Text className={styles.summaryValue}>{animalCount}只 {selectedAnimalType}</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>申请人</Text>
            <Text className={styles.summaryValue}>{currentUser.name} · {currentUser.groupName}</Text>
          </View>
        </View>
      )}
      
      <View className={styles.bottomBar}>
        <View
          className={`${styles.submitBtn} ${!canSubmit ? styles.disabled : ''}`}
          onClick={handleSubmit}
        >
          <Text className={styles.submitText}>
            {hasConflict ? '存在时间冲突' : '提交预约申请'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default CreateBookingPage;
