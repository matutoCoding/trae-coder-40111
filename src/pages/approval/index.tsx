import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import ApprovalCard from '@/components/ApprovalCard';
import SectionHeader from '@/components/SectionHeader';
import { useAppStore } from '@/store';
import { currentUser } from '@/data/user';
import { formatDateTime } from '@/utils/date';
import styles from './index.module.scss';

const ApprovalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  
  const pendingApprovals = useAppStore(s => s.pendingApprovals);
  const approvedList = useAppStore(s => s.approvedList);
  const overtimeRecords = useAppStore(s => s.overtimeRecords);
  const overtimeStatus = useAppStore(s => s.overtimeStatus);
  const rescheduleRequests = useAppStore(s => s.rescheduleRequests);
  const approveNode = useAppStore(s => s.approveNode);
  const rejectNode = useAppStore(s => s.rejectNode);
  const checkAndHandleOvertime = useAppStore(s => s.checkAndHandleOvertime);
  
  const pendingNodeIds = useMemo(() => {
    return new Set(pendingApprovals.map(item => item.node.id));
  }, [pendingApprovals]);
  
  const unhandledOvertimeRecords = useMemo(() => {
    return overtimeRecords.filter(r => !overtimeStatus[r.id]?.handled);
  }, [overtimeRecords, overtimeStatus]);
  
  const overtimeNodeIds = useMemo(() => {
    const ids = new Set<string>();
    unhandledOvertimeRecords.forEach(record => {
      if (pendingNodeIds.has(record.nodeId)) {
        ids.add(record.nodeId);
      }
    });
    return ids;
  }, [unhandledOvertimeRecords, pendingNodeIds]);
  
  const overtimeBookings = useMemo(() => {
    const bookingMap = new Map<string, { count: number; escalated: boolean; records: typeof overtimeRecords }>();
    unhandledOvertimeRecords.forEach(record => {
      if (!pendingNodeIds.has(record.nodeId)) return;
      if (!bookingMap.has(record.bookingId)) {
        bookingMap.set(record.bookingId, { count: 0, escalated: false, records: [] });
      }
      const data = bookingMap.get(record.bookingId)!;
      data.count++;
      if (record.escalated) data.escalated = true;
      data.records.push(record);
    });
    return bookingMap;
  }, [unhandledOvertimeRecords, pendingNodeIds]);
  
  const getRescheduleInfo = useCallback((nodeId: string, bookingId: string) => {
    if (!nodeId.startsWith('reschedule-node-')) return null;
    const requestId = nodeId.replace('reschedule-node-', '');
    return rescheduleRequests.find(r => r.id === requestId && r.bookingId === bookingId) || null;
  }, [rescheduleRequests]);
  
  const overtimeCount = overtimeNodeIds.size;
  
  useEffect(() => {
    checkAndHandleOvertime();
  }, [checkAndHandleOvertime]);
  
  const handleRefresh = () => {
    console.log('[ApprovalPage] 下拉刷新');
    checkAndHandleOvertime();
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  };
  
  const handleTabChange = (tab: 'pending' | 'approved') => {
    setActiveTab(tab);
  };
  
  const handleApprove = (nodeId: string) => {
    Taro.showModal({
      title: '确认通过',
      content: '确定通过该审批吗？',
      editable: true,
      placeholderText: '请输入审批意见（选填）',
      success: (res) => {
        if (res.confirm) {
          const comment = res.content || '同意';
          approveNode(nodeId, comment);
          console.log('[ApprovalPage] 审批通过', nodeId, comment);
          Taro.showToast({ title: '已通过', icon: 'success' });
        }
      }
    });
  };
  
  const handleReject = (nodeId: string) => {
    Taro.showModal({
      title: '确认拒绝',
      content: '确定拒绝该审批吗？请填写拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因（必填）',
      success: (res) => {
        if (res.confirm) {
          const comment = res.content || '不通过';
          rejectNode(nodeId, comment);
          console.log('[ApprovalPage] 审批拒绝', nodeId, comment);
          Taro.showToast({ title: '已拒绝', icon: 'none' });
        }
      }
    });
  };
  
  const pendingList = useMemo(() => {
    return pendingApprovals.map(item => ({
      ...item.node,
      booking: item.booking,
      isOvertime: overtimeNodeIds.has(item.node.id)
    }));
  }, [pendingApprovals, overtimeNodeIds]);
  
  const approvedItems = useMemo(() => {
    return approvedList.map(item => ({
      ...item.node,
      booking: item.booking
    }));
  }, [approvedList]);
  
  const list = activeTab === 'pending' ? pendingList : approvedItems;
  
  const recentOvertimeRecords = useMemo(() => {
    const seen = new Set<string>();
    const result: typeof overtimeRecords = [];
    for (const record of overtimeRecords) {
      if (!pendingNodeIds.has(record.nodeId)) continue;
      const key = `${record.nodeId}-${record.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(record);
      if (result.length >= 4) break;
    }
    return result;
  }, [overtimeRecords, pendingNodeIds]);
  
  return (
    <ScrollView
      className={styles.page}
      scrollY
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.header}>
        <Text className={styles.headerTitle}>审批中心</Text>
        <Text className={styles.headerSubtitle}>{currentUser.name}，你有 {pendingApprovals.length} 条待审批</Text>
      </View>
      
      <View className={styles.content}>
        {overtimeCount > 0 && (
          <View className={styles.overtimeAlert}>
            <View className={styles.alertHeader}>
              <Text className={styles.alertTitle}>
                ⚠️ 超时提醒
              </Text>
              <Text className={styles.alertCount}>{overtimeCount} 个节点</Text>
            </View>
            <Text className={styles.alertDesc}>
              有 {overtimeCount} 个审批节点已超时，请尽快处理
            </Text>
            {recentOvertimeRecords.length > 0 && (
              <View style={{ marginTop: '16rpx' }}>
                {recentOvertimeRecords.map(record => (
                  <View key={`${record.nodeId}-${record.level}`} style={{ marginBottom: '8rpx', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: '24rpx', color: '#94a3b8' }}>
                      责任人: {record.responsiblePersonName}
                    </Text>
                    <Text style={{ fontSize: '24rpx', color: record.escalated ? '#ef4444' : '#f59e0b', fontWeight: 500 }}>
                      {record.escalated ? `已升级 L${record.level}` : `已催办 L${record.level}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        
        <View className={styles.tabs}>
          <View 
            className={`${styles.tabItem} ${activeTab === 'pending' ? styles.active : ''}`}
            onClick={() => handleTabChange('pending')}
          >
            <Text className={styles.tabText}>待审批 ({pendingApprovals.length})</Text>
          </View>
          <View 
            className={`${styles.tabItem} ${activeTab === 'approved' ? styles.active : ''}`}
            onClick={() => handleTabChange('approved')}
          >
            <Text className={styles.tabText}>已审批 ({approvedList.length})</Text>
          </View>
        </View>
        
        <SectionHeader 
          title={activeTab === 'pending' ? '待我审批' : '我已审批'}
          extra={
            <Text style={{ fontSize: '24rpx', color: '#94a3b8' }}>共 {list.length} 条</Text>
          }
        />
        
        {list.length > 0 ? (
          list.map(item => {
            const reschedule = getRescheduleInfo(item.node.id, item.booking.id);
            return (
              <View key={item.id} style={{ marginBottom: '24rpx' }}>
                <ApprovalCard 
                  approval={item}
                  showActions={activeTab === 'pending'}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
                {reschedule && (
                  <View style={{
                    marginTop: '-12rpx',
                    padding: '24rpx',
                    paddingTop: '36rpx',
                    background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, #ffffff 100%)',
                    borderRadius: '0 0 20rpx 20rpx',
                    border: '2rpx solid #fbbf24',
                    borderTop: 'none'
                  }}>
                    <Text style={{
                      fontSize: '26rpx',
                      fontWeight: 600,
                      color: '#d97706',
                      display: 'block',
                      marginBottom: '12rpx'
                    }}>🔄 改期申请</Text>
                    <View style={{ display: 'flex', gap: '16rpx', marginBottom: '8rpx' }}>
                      <View style={{ flex: 1, background: '#fef3c7', padding: '12rpx', borderRadius: '8rpx' }}>
                        <Text style={{ fontSize: '22rpx', color: '#92400e', display: 'block', marginBottom: '4rpx' }}>原时间</Text>
                        <Text style={{ fontSize: '24rpx', color: '#78350f', fontWeight: 500 }}>
                          {formatDateTime(reschedule.originalStartTime)}
                        </Text>
                        <Text style={{ fontSize: '22rpx', color: '#92400e' }}>
                          ~ {formatDateTime(reschedule.originalEndTime)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, background: '#dcfce7', padding: '12rpx', borderRadius: '8rpx' }}>
                        <Text style={{ fontSize: '22rpx', color: '#166534', display: 'block', marginBottom: '4rpx' }}>新时间</Text>
                        <Text style={{ fontSize: '24rpx', color: '#166534', fontWeight: 500 }}>
                          {formatDateTime(reschedule.newStartTime)}
                        </Text>
                        <Text style={{ fontSize: '22rpx', color: '#166534' }}>
                          ~ {formatDateTime(reschedule.newEndTime)}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: '22rpx', color: '#64748b', marginTop: '4rpx' }}>
                      原因: {reschedule.reason}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View className={styles.emptyState}>
            <View className={styles.emptyIcon}>
              <Text className={styles.emptyIconText}>📋</Text>
            </View>
            <Text className={styles.emptyText}>
              {activeTab === 'pending' ? '暂无待审批事项' : '暂无已审批记录'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ApprovalPage;
