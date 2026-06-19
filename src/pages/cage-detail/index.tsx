import React, { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import StatusTag from '@/components/StatusTag';
import { useAppStore } from '@/store';
import { formatDate } from '@/utils/date';
import dayjs from 'dayjs';
import styles from './index.module.scss';

const typeLabels: Record<string, string> = {
  SPF: 'SPF级',
  conventional: '普通级',
  isolation: '隔离级',
  quarantine: '检疫级'
};

const groupColors: Record<string, { bg: string; border: string; dot: string }> = {
  group001: { bg: 'rgba(14, 165, 233, 0.15)', border: '#0ea5e9', dot: '#0ea5e9' },
  group002: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', dot: '#10b981' },
  group003: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', dot: '#f59e0b' }
};

const getGroupColor = (groupId: string) => {
  return groupColors[groupId] || { bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', dot: '#8b5cf6' };
};

const CageDetailPage: React.FC = () => {
  const router = useRouter();
  const cageId = router.params.id || 'cage001';
  
  const cages = useAppStore(s => s.cages);
  const bookings = useAppStore(s => s.bookings);
  const getCageOccupancy = useAppStore(s => s.getCageOccupancy);
  const getOccupancyForDay = useAppStore(s => s.getOccupancyForDay);
  const checkConflict = useAppStore(s => s.checkConflict);
  const currentUser = { groupId: 'group001', groupName: '神经生物学课题组' };
  
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [viewMonth, setViewMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  
  const cage = useMemo(() => {
    return cages.find(c => c.id === cageId) || cages[0];
  }, [cages, cageId]);
  
  const occupancy = useMemo(() => {
    if (!cage) return [];
    return getCageOccupancy(cage.id);
  }, [cage, getCageOccupancy]);
  
  const capacityPercent = cage ? Math.round((cage.currentAnimals / cage.capacity) * 100) : 0;
  const capacityClass = capacityPercent >= 80 ? styles.capacityHigh : capacityPercent >= 50 ? styles.capacityMid : styles.capacityLow;
  
  const calendarDays = useMemo(() => {
    const firstDay = viewMonth.startOf('month');
    const lastDay = viewMonth.endOf('month');
    const startWeekday = firstDay.day();
    const totalDays = lastDay.date();
    
    const days: Array<{ date: dayjs.Dayjs | null; bookings: typeof occupancy; hasConflict: boolean }> = [];
    
    for (let i = 0; i < startWeekday; i++) {
      days.push({ date: null, bookings: [], hasConflict: false });
    }
    
    for (let d = 1; d <= totalDays; d++) {
      const date = viewMonth.date(d);
      const dateStr = date.format('YYYY-MM-DD');
      const dayStart = new Date(`${dateStr} 00:00:00`).getTime();
      const dayEnd = new Date(`${dateStr} 23:59:59`).getTime();
      
      const dayBookings = occupancy.filter(occ => {
        const bStart = new Date(occ.startTime).getTime();
        const bEnd = new Date(occ.endTime).getTime();
        return dayStart <= bEnd && dayEnd >= bStart;
      });
      
      const groupIds = dayBookings.map(b => b.groupId);
      const uniqueGroups = new Set(groupIds);
      const hasConflict = groupIds.length > uniqueGroups.size;
      
      days.push({ date, bookings: dayBookings, hasConflict });
    }
    
    return days;
  }, [viewMonth, occupancy]);
  
  const handlePrevMonth = () => setViewMonth(v => v.subtract(1, 'month'));
  const handleNextMonth = () => setViewMonth(v => v.add(1, 'month'));
  
  const today = dayjs().format('YYYY-MM-DD');
  
  const uniqueGroups = useMemo(() => {
    const groups = new Map<string, string>();
    occupancy.forEach(o => groups.set(o.groupId, o.groupName));
    return groups;
  }, [occupancy]);
  
  const canBook = cage && cage.status !== 'maintenance';
  
  const handleBook = () => {
    if (!canBook) return;
    Taro.navigateTo({
      url: `/pages/create-booking/index?cageId=${cageId}`
    });
  };
  
  if (!cage) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: '100rpx 0' }}>
          <Text style={{ color: '#94a3b8' }}>笼位不存在</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.codeRow}>
          <Text className={styles.cageCode}>{cage.code}</Text>
          <StatusTag status={cage.status} />
        </View>
        <Text className={styles.cageName}>{cage.name}</Text>
        <View className={styles.cageMeta}>
          <View className={styles.metaItem}><Text>{typeLabels[cage.type]}</Text></View>
          <View className={styles.metaItem}><Text>{cage.room}</Text></View>
          <View className={styles.metaItem}><Text>{cage.location}</Text></View>
        </View>
      </View>
      
      <View className={styles.content}>
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>笼位信息</Text>
            </View>
          </View>
          
          <View className={styles.infoGrid}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>容量</Text>
              <Text className={styles.infoValue}>{cage.capacity}只</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>当前动物</Text>
              <Text className={styles.infoValue}>{cage.currentAnimals}只</Text>
            </View>
          </View>
          
          <View className={styles.infoItem} style={{ width: '100%', marginBottom: 0 }}>
            <Text className={styles.infoLabel}>容量使用</Text>
            <View className={styles.capacityBar}>
              <View className={`${styles.capacityFill} ${capacityClass}`} style={{ width: `${capacityPercent}%` }} />
            </View>
            <Text className={styles.capacityText}>
              已占用 {capacityPercent}%（{cage.currentAnimals}/{cage.capacity}只）
            </Text>
          </View>
        </View>
        
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>排期日历</Text>
            </View>
          </View>
          
          <View className={styles.viewTabs}>
            <View className={`${styles.viewTab} ${viewMode === 'month' ? styles.active : ''}`} onClick={() => setViewMode('month')}>
              <Text>月视图</Text>
            </View>
            <View className={`${styles.viewTab} ${viewMode === 'week' ? styles.active : ''}`} onClick={() => setViewMode('week')}>
              <Text>周视图</Text>
            </View>
            <View className={`${styles.viewTab} ${viewMode === 'day' ? styles.active : ''}`} onClick={() => setViewMode('day')}>
              <Text>日视图</Text>
            </View>
          </View>
          
          {viewMode === 'month' && (
            <>
              <View className={styles.calendarNav}>
                <View className={styles.navBtn} onClick={handlePrevMonth}>
                  <Text className={styles.navBtnText}>‹</Text>
                </View>
                <Text className={styles.calendarTitle}>
                  {viewMonth.format('YYYY年MM月')}
                </Text>
                <View className={styles.navBtn} onClick={handleNextMonth}>
                  <Text className={styles.navBtnText}>›</Text>
                </View>
              </View>
              
              <View className={styles.weekdayRow}>
                {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                  <Text key={w} className={styles.weekday}>{w}</Text>
                ))}
              </View>
              
              {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIdx) => (
                <View key={rowIdx} className={styles.dayRow}>
                  {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, cellIdx) => {
                    if (!day.date) {
                      return <View key={cellIdx} className={`${styles.dayCell} ${styles.dayEmpty}`} />;
                    }
                    
                    const isToday = day.date.format('YYYY-MM-DD') === today;
                    const dayBookingsGroups = new Set(day.bookings.map(b => b.groupId));
                    
                    return (
                      <View
                        key={cellIdx}
                        className={`${styles.dayCell} ${isToday ? styles.dayToday : ''} ${day.bookings.length > 0 ? (day.hasConflict ? styles.dayHasConflict : styles.dayHasBooking) : ''}`}
                        onClick={() => { setSelectedDate(day.date!); setViewMode('day'); }}
                      >
                        <Text className={styles.dayNumber}>{day.date.date()}</Text>
                        <View className={styles.dayDots}>
                          {Array.from(dayBookingsGroups).slice(0, 3).map(gid => {
                            const color = getGroupColor(gid);
                            return <View key={gid} className={styles.dayDot} style={{ backgroundColor: color.dot }} />;
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </>
          )}
          
          {viewMode === 'week' && (
            <>
              <View className={styles.calendarNav}>
                <View className={styles.navBtn} onClick={() => setSelectedDate(v => v.subtract(7, 'day'))}>
                  <Text className={styles.navBtnText}>‹</Text>
                </View>
                <Text className={styles.calendarTitle}>
                  {selectedDate.startOf('week').format('MM/DD')} ~ {selectedDate.endOf('week').format('MM/DD')}
                </Text>
                <View className={styles.navBtn} onClick={() => setSelectedDate(v => v.add(7, 'day'))}>
                  <Text className={styles.navBtnText}>›</Text>
                </View>
              </View>
              
              <View className={styles.weekViewGrid}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const d = selectedDate.startOf('week').add(di, 'day');
                  const dStr = d.format('YYYY-MM-DD');
                  const dOcc = cage ? getOccupancyForDay(cage.id, dStr) : [];
                  const isToday = dStr === today;
                  const hours = [6, 9, 12, 15, 18, 21];
                  
                  return (
                    <View key={di} className={`${styles.weekDayColumnWrap} ${isToday ? styles.weekDayToday : ''}`}>
                      <Text className={styles.weekDayLabel}>
                        {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.day()]} · {d.format('MM月DD日')}
                        {dOcc.length > 0 && ` · ${dOcc.length}段`}
                      </Text>
                      <View style={{ paddingLeft: '0', position: 'relative' }}>
                        {hours.map(h => {
                          const hourStart = dStr + ' ' + String(h).padStart(2, '0') + ':00:00';
                          const hourEnd = dStr + ' ' + String(h + 3).padStart(2, '0') + ':00:00';
                          const hStartTs = new Date(hourStart).getTime();
                          const hEndTs = new Date(hourEnd).getTime();
                          const inHour = dOcc.filter(o => {
                            const oS = new Date(o.startTime).getTime();
                            const oE = new Date(o.endTime).getTime();
                            return hStartTs < oE && hEndTs > oS;
                          });
                          
                          return (
                            <View key={h} className={styles.timelineHourRow}>
                              <View className={styles.timelineHourLabel}>
                                <Text>{String(h).padStart(2, '0')}:00</Text>
                              </View>
                              <View className={styles.timelineHourTrack}>
                                {inHour.length === 0 ? (
                                  <View className={styles.timelineEmpty}>
                                    <Text className={styles.timelineEmptyText}>空闲</Text>
                                  </View>
                                ) : (
                                  inHour.map((o, idx) => {
                                    const color = getGroupColor(o.groupId);
                                    const oS = new Date(o.startTime).getTime();
                                    const oE = new Date(o.endTime).getTime();
                                    const pctStart = Math.max(0, ((Math.max(oS, hStartTs) - hStartTs) / (hEndTs - hStartTs)) * 100);
                                    const pctEnd = Math.min(100, ((Math.min(oE, hEndTs) - hStartTs) / (hEndTs - hStartTs)) * 100);
                                    return (
                                      <View
                                        key={`${o.bookingId}-${idx}`}
                                        className={styles.timelineBlock}
                                        style={{
                                          left: `${pctStart}%`,
                                          width: `${pctEnd - pctStart}%`,
                                          backgroundColor: color.border
                                        }}
                                      >
                                        <Text className={styles.timelineBlockLabel}>{o.groupName}</Text>
                                        <Text className={styles.timelineBlockSub}>
                                          {o.bookingStatus === 'pending' ? '待审' : o.bookingStatus === 'approved' ? '已通过' : '使用中'}
                                        </Text>
                                      </View>
                                    );
                                  })
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
          
          {viewMode === 'day' && (
            <>
              <View className={styles.calendarNav}>
                <View className={styles.navBtn} onClick={() => setSelectedDate(v => v.subtract(1, 'day'))}>
                  <Text className={styles.navBtnText}>‹</Text>
                </View>
                <Text className={styles.calendarTitle}>
                  {selectedDate.format('YYYY年MM月DD日')}
                  {today === selectedDate.format('YYYY-MM-DD') ? '（今天）' : ''}
                </Text>
                <View className={styles.navBtn} onClick={() => setSelectedDate(v => v.add(1, 'day'))}>
                  <Text className={styles.navBtnText}>›</Text>
                </View>
              </View>
              
              <View className={styles.timelineWrap}>
                {(() => {
                  const dStr = selectedDate.format('YYYY-MM-DD');
                  const dOcc = cage ? getOccupancyForDay(cage.id, dStr) : [];
                  const hours = Array.from({ length: 24 }, (_, i) => i);
                  
                  return hours.map(h => {
                    const hourStart = `${dStr} ${String(h).padStart(2, '0')}:00:00`;
                    const hourEnd = `${dStr} ${String(h + 1).padStart(2, '0')}:00:00`;
                    const hStartTs = new Date(hourStart).getTime();
                    const hEndTs = new Date(hourEnd).getTime();
                    const inHour = dOcc.filter(o => {
                      const oS = new Date(o.startTime).getTime();
                      const oE = new Date(o.endTime).getTime();
                      return hStartTs < oE && hEndTs > oS;
                    });
                    
                    return (
                      <View key={h} className={styles.timelineHourRow}>
                        <View className={styles.timelineHourLabel}>
                          <Text>{String(h).padStart(2, '0')}:00</Text>
                        </View>
                        <View className={styles.timelineHourTrack}>
                          {inHour.length === 0 ? (
                            <View className={styles.timelineEmpty}>
                              <Text className={styles.timelineEmptyText}>{(h >= 8 && h < 20) ? '空闲' : ''}</Text>
                            </View>
                          ) : (
                            inHour.map((o, idx) => {
                              const color = getGroupColor(o.groupId);
                              const oS = new Date(o.startTime).getTime();
                              const oE = new Date(o.endTime).getTime();
                              const pctStart = Math.max(0, ((Math.max(oS, hStartTs) - hStartTs) / (hEndTs - hStartTs)) * 100);
                              const pctEnd = Math.min(100, ((Math.min(oE, hEndTs) - hStartTs) / (hEndTs - hStartTs)) * 100);
                              return (
                                <View
                                  key={`${o.bookingId}-${idx}`}
                                  className={styles.timelineBlock}
                                  style={{
                                    left: `${pctStart}%`,
                                    width: `${pctEnd - pctStart}%`,
                                    backgroundColor: color.border
                                  }}
                                >
                                  {pctEnd - pctStart > 18 && (
                                    <>
                                      <Text className={styles.timelineBlockLabel}>{o.groupName}</Text>
                                      <Text className={styles.timelineBlockSub}>
                                        {new Date(o.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - {new Date(o.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                      </Text>
                                    </>
                                  )}
                                </View>
                              );
                            })
                          )}
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            </>
          )}
          
          {uniqueGroups.size > 0 && (
            <View className={styles.legendRow}>
              {Array.from(uniqueGroups.entries()).map(([gid, gname]) => {
                const color = getGroupColor(gid);
                return (
                  <View key={gid} className={styles.legendItem}>
                    <View className={styles.legendDot} style={{ backgroundColor: color.dot }} />
                    <Text className={styles.legendText}>{gname}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>时段占用（同组已合并）</Text>
            </View>
            <Text style={{ fontSize: '24rpx', color: '#94a3b8' }}>{occupancy.length}段</Text>
          </View>
          
          {occupancy.length > 0 ? (
            <View className={styles.bookingList}>
              {occupancy.map((occ, idx) => {
                const color = getGroupColor(occ.groupId);
                const isMine = occ.groupId === currentUser.groupId;
                const originBooking = bookings.find(b => b.id === occ.bookingId);
                const isMerged = originBooking?.isMerged || false;
                return (
                  <View
                    key={`${occ.bookingId}-${idx}`}
                    className={styles.bookingItem}
                    style={{ borderLeftColor: color.border, backgroundColor: color.bg }}
                  >
                    <View className={styles.bookingHeader}>
                      <Text className={styles.bookingGroup}>
                        {occ.groupName}
                        {isMine && '（我的）'}
                      </Text>
                      {isMerged && (
                        <View className={styles.bookingMergeBadge}>
                          <Text>已合并</Text>
                        </View>
                      )}
                    </View>
                    <Text className={styles.bookingTime}>
                      {formatDate(occ.startTime)} ~ {formatDate(occ.endTime)}
                    </Text>
                    <Text className={styles.bookingPurpose}>
                      状态: {originBooking?.status === 'pending' ? '待审批' :
                              originBooking?.status === 'approved' ? '已通过' :
                              originBooking?.status === 'in_use' ? '使用中' :
                              originBooking?.status || ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className={styles.bookingEmpty}>
              <Text className={styles.bookingEmptyText}>暂无排期占用</Text>
            </View>
          )}
        </View>
        
        {cage.equipment && cage.equipment.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <View className={styles.sectionTitle}>
                <View className={styles.titleBar} />
                <Text>配套设备</Text>
              </View>
            </View>
            <View className={styles.equipmentList}>
              {cage.equipment.map(eq => (
                <View key={eq} className={styles.equipmentTag}>
                  <Text>{eq}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>笼位说明</Text>
            </View>
          </View>
          <Text style={{ fontSize: '28rpx', color: '#64748b', lineHeight: 1.6 }}>
            {cage.description}
          </Text>
        </View>
      </View>
      
      <View className={styles.bottomBar}>
        <View
          className={`${styles.bookBtn} ${!canBook ? styles.bookBtnDisabled : ''}`}
          onClick={handleBook}
        >
          <Text className={styles.bookBtnText}>
            {cage.status === 'maintenance' ? '维护中，不可预约' : '立即预约此笼位'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default CageDetailPage;
