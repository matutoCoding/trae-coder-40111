import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import CageCard from '@/components/CageCard';
import SectionHeader from '@/components/SectionHeader';
import { cageList } from '@/data/cage';
import { currentUser } from '@/data/user';

import styles from './index.module.scss';

const typeFilters = [
  { key: 'all', label: '全部' },
  { key: 'SPF', label: 'SPF级' },
  { key: 'conventional', label: '普通级' },
  { key: 'isolation', label: '隔离级' },
  { key: 'quarantine', label: '检疫级' }
];

const statusFilters = [
  { key: 'all', label: '全部状态' },
  { key: 'available', label: '空闲' },
  { key: 'occupied', label: '占用中' },
  { key: 'maintenance', label: '维护中' }
];

const HomePage: React.FC = () => {
  const [activeType, setActiveType] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const stats = useMemo(() => {
    const total = cageList.length;
    const available = cageList.filter(c => c.status === 'available').length;
    const occupied = cageList.filter(c => c.status === 'occupied').length;
    const maintenance = cageList.filter(c => c.status === 'maintenance').length;
    return { total, available, occupied, maintenance };
  }, []);
  
  const filteredCages = useMemo(() => {
    return cageList.filter(cage => {
      if (activeType !== 'all' && cage.type !== activeType) return false;
      if (activeStatus !== 'all' && cage.status !== activeStatus) return false;
      return true;
    });
  }, [activeType, activeStatus]);
  
  const handleRefresh = () => {
    console.log('[HomePage] 下拉刷新');
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  };
  
  const handleCreateBooking = () => {
    console.log('[HomePage] 跳转到创建预约页');
    Taro.navigateTo({
      url: '/pages/create-booking/index'
    });
  };
  
  const handleTypeFilter = (key: string) => {
    setActiveType(key);
  };
  
  const handleStatusFilter = (key: string) => {
    setActiveStatus(key);
  };
  
  return (
    <ScrollView 
      className={styles.page}
      scrollY
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className={styles.header}>
        <View className={styles.welcome}>
          <Text className={styles.welcomeText}>你好，{currentUser.name}</Text>
          <Text className={styles.subText}>{currentUser.groupName}</Text>
        </View>
        
        <View className={styles.stats}>
          <View className={styles.statCard}>
            <Text className={styles.statNumber}>{stats.total}</Text>
            <Text className={styles.statLabel}>笼位总数</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNumber}>{stats.available}</Text>
            <Text className={styles.statLabel}>空闲笼位</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNumber}>{stats.occupied}</Text>
            <Text className={styles.statLabel}>使用中</Text>
          </View>
        </View>
      </View>
      
      <View className={styles.content}>
        <View className={styles.quickAction}>
          <View className={styles.actionInfo}>
            <Text className={styles.actionTitle}>快速预约笼位</Text>
            <Text className={styles.actionDesc}>选择笼位和时段，一键提交预约</Text>
          </View>
          <View className={styles.actionBtn} onClick={handleCreateBooking}>
            <Text className={styles.actionBtnText}>去预约</Text>
          </View>
        </View>
        
        <SectionHeader title="笼位类型" />
        
        <ScrollView 
          className={styles.filterBar}
          scrollX
          showScrollbar={false}
        >
          {typeFilters.map(item => (
            <View 
              key={item.key}
              className={`${styles.filterItem} ${activeType === item.key ? styles.active : ''}`}
              onClick={() => handleTypeFilter(item.key)}
            >
              <Text className={styles.filterText}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
        
        <SectionHeader 
          title="笼位列表"
          extra={
            <Text className={styles.filterText}>共 {filteredCages.length} 个</Text>
          }
        />
        
        <View className={styles.listContainer}>
          {filteredCages.length > 0 ? (
            filteredCages.map(cage => (
              <CageCard key={cage.id} cage={cage} />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无符合条件的笼位</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default HomePage;
