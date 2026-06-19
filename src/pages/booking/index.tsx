import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import BookingCard from '@/components/BookingCard';
import { useAppStore } from '@/store';

import styles from './index.module.scss';

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '已通过' },
  { key: 'in_use', label: '使用中' },
  { key: 'completed', label: '已完成' }
];

const BookingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const bookings = useAppStore(s => s.bookings);
  
  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(b => b.status === activeTab);
  }, [bookings, activeTab]);
  
  const tabCounts = useMemo(() => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      in_use: bookings.filter(b => b.status === 'in_use').length,
      completed: bookings.filter(b => b.status === 'completed').length
    };
  }, [bookings]);
  
  const handleRefresh = () => {
    console.log('[BookingPage] 下拉刷新');
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  };
  
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };
  
  return (
    <View className={styles.page}>
      <View className={styles.tabs}>
        {tabs.map(tab => (
          <View 
            key={tab.key}
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
          </View>
        ))}
      </View>
      
      <ScrollView
        scrollY
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
        className={styles.content}
      >
        <View className={styles.listContainer}>
          {filteredBookings.length > 0 ? (
            filteredBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <View className={styles.emptyState}>
              <View className={styles.emptyIcon}>
                <Text className={styles.emptyIconText}>📋</Text>
              </View>
              <Text className={styles.emptyText}>暂无预约记录</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default BookingPage;
