import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { currentUser } from '@/data/user';
import { myBookings } from '@/data/booking';
import styles from './index.module.scss';

const roleLabels: Record<string, string> = {
  admin: '系统管理员',
  researcher: '科研人员',
  technician: '饲养技术员',
  approver: '审批人'
};

const menuGroups = [
  {
    title: '我的记录',
    items: [
      { id: 'bookings', icon: '📋', title: '我的预约', desc: '查看预约历史记录', path: '/pages/booking/index' },
      { id: 'feeding', icon: '🍽️', title: '饲养记录', desc: '查看饲养操作日志', path: '' },
      { id: 'approvals', icon: '✅', title: '我的审批', desc: '审批记录追踪', path: '/pages/approval/index' }
    ]
  },
  {
    title: '其他',
    items: [
      { id: 'group', icon: '👥', title: '课题组信息', desc: '查看课题组详情', path: '' },
      { id: 'help', icon: '❓', title: '帮助中心', desc: '常见问题解答', path: '' },
      { id: 'about', icon: 'ℹ️', title: '关于我们', desc: '版本信息', path: '' }
    ]
  }
];

const MinePage: React.FC = () => {
  const stats = {
    bookings: myBookings.length,
    pending: myBookings.filter(b => b.status === 'pending').length,
    completed: myBookings.filter(b => b.status === 'completed').length
  };
  
  const handleMenuClick = (item: { path: string; id: string }) => {
    console.log('[MinePage] 点击菜单项', item.id);
    if (item.path) {
      if (item.path.startsWith('/pages/') && item.path.includes('index')) {
        Taro.switchTab({
          url: item.path
        });
      }
    } else {
      Taro.showToast({ title: '功能开发中', icon: 'none' });
    }
  };
  
  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <View className={styles.avatar}>
            <Text className={styles.avatarText}>{currentUser.name.charAt(0)}</Text>
          </View>
          <View className={styles.userDetail}>
            <Text className={styles.userName}>{currentUser.name}</Text>
            <Text className={styles.userDept}>{currentUser.department}</Text>
            <Text className={styles.userGroup}>{currentUser.groupName}</Text>
            <View className={styles.roleTag}>
              <Text className={styles.roleText}>{roleLabels[currentUser.role]}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View className={styles.content}>
        <View className={styles.statsCard}>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats.bookings}</Text>
            <Text className={styles.statLabel}>总预约</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats.pending}</Text>
            <Text className={styles.statLabel}>审批中</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats.completed}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
        </View>
        
        {menuGroups.map(group => (
          <View key={group.title} className={styles.menuGroup}>
            {group.items.map(item => (
              <View 
                key={item.id}
                className={styles.menuItem}
                onClick={() => handleMenuClick(item)}
              >
                <View className={styles.menuIcon}>
                  <Text>{item.icon}</Text>
                </View>
                <View className={styles.menuContent}>
                  <Text className={styles.menuTitle}>{item.title}</Text>
                  {item.desc && (
                    <Text className={styles.menuDesc}>{item.desc}</Text>
                  )}
                </View>
                <Text className={styles.menuArrow}>›</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default MinePage;
