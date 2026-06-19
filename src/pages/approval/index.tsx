import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import ApprovalCard from '@/components/ApprovalCard';
import SectionHeader from '@/components/SectionHeader';
import { pendingApprovals, myApproved } from '@/data/approval';
import { currentUser } from '@/data/user';
import styles from './index.module.scss';

const ApprovalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  
  const overtimeCount = useMemo(() => {
    return pendingApprovals.filter(a => a.isOvertime || a.escalated).length;
  }, []);
  
  const handleRefresh = () => {
    console.log('[ApprovalPage] 下拉刷新');
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  };
  
  const handleTabChange = (tab: 'pending' | 'approved') => {
    setActiveTab(tab);
  };
  
  const handleApprove = (id: string) => {
    console.log('[ApprovalPage] 审批通过', id);
    Taro.showToast({ title: '已通过', icon: 'success' });
  };
  
  const handleReject = (id: string) => {
    console.log('[ApprovalPage] 审批拒绝', id);
    Taro.showToast({ title: '已拒绝', icon: 'none' });
  };
  
  const list = activeTab === 'pending' ? pendingApprovals : myApproved;
  
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
            <Text className={styles.tabText}>已审批 ({myApproved.length})</Text>
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
