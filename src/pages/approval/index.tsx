import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import ApprovalCard from '@/components/ApprovalCard';
import SectionHeader from '@/components/SectionHeader';
import { useAppStore } from '@/store';
import { currentUser } from '@/data/user';
import styles from './index.module.scss';

const ApprovalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  
  const pendingApprovals = useAppStore(s => s.pendingApprovals);
  const approvedList = useAppStore(s => s.approvedList);
  const overtimeRecords = useAppStore(s => s.overtimeRecords);
  const approveNode = useAppStore(s => s.approveNode);
  const rejectNode = useAppStore(s => s.rejectNode);
  const checkAndHandleOvertime = useAppStore(s => s.checkAndHandleOvertime);
  
  const overtimeCount = useMemo(() => {
    return pendingApprovals.filter(a => a.node.isOvertime || a.node.escalated).length;
  }, [pendingApprovals]);
  
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
  
  const pendingList = pendingApprovals.map(item => ({
    ...item.node,
    booking: item.booking
  }));
  
  const approvedItems = approvedList.map(item => ({
    ...item.node,
    booking: item.booking
  }));
  
  const list = activeTab === 'pending' ? pendingList : approvedItems;
  
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
              <Text className={styles.alertCount}>{overtimeCount} 条</Text>
            </View>
            <Text className={styles.alertDesc}>
              有 {overtimeCount} 条审批已超时，请尽快处理
            </Text>
            {overtimeRecords.length > 0 && (
              <View style={{ marginTop: '16rpx' }}>
                {overtimeRecords.slice(0, 3).map(record => (
                  <View key={record.id} style={{ marginBottom: '8rpx', display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: '24rpx', color: '#94a3b8' }}>
                      责任人: {record.responsiblePersonName}
                    </Text>
                    <Text style={{ fontSize: '24rpx', color: record.escalated ? '#ef4444' : '#f59e0b' }}>
                      {record.escalated ? `已升级(L${record.level})` : `已催办(L${record.level})`}
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
          list.map(item => (
            <ApprovalCard 
              key={item.id} 
              approval={item}
              showActions={activeTab === 'pending'}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
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
