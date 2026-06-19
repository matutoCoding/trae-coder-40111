import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import StatusTag from '@/components/StatusTag';
import type { Cage } from '@/types/cage';
import styles from './index.module.scss';

interface CageCardProps {
  cage: Cage;
  onClick?: () => void;
}

const typeLabels: Record<string, string> = {
  SPF: 'SPF级',
  conventional: '普通级',
  isolation: '隔离级',
  quarantine: '检疫级'
};

const CageCard: React.FC<CageCardProps> = ({ cage, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/cage-detail/index?id=${cage.id}`
      });
    }
  };
  
  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.code}>
          <Text className={styles.codeText}>{cage.code}</Text>
        </View>
        <StatusTag status={cage.status} size="sm" />
      </View>
      
      <View className={styles.info}>
        <Text className={styles.name}>{cage.name}</Text>
        <View className={styles.meta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>类型</Text>
            <Text className={styles.metaValue}>{typeLabels[cage.type]}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>位置</Text>
            <Text className={styles.metaValue}>{cage.room}</Text>
          </View>
        </View>
      </View>
      
      <View className={styles.footer}>
        <View className={styles.capacity}>
          <Text className={styles.capacityText}>
            容量：{cage.currentAnimals}/{cage.capacity} 只
          </Text>
        </View>
        <View className={styles.typeTag}>
          <Text className={styles.typeTagText}>{typeLabels[cage.type]}</Text>
        </View>
      </View>
      
      <View className={styles.progressBar}>
        <View 
          className={styles.progressFill}
          style={{ width: `${(cage.currentAnimals / cage.capacity) * 100}%` }}
        />
      </View>
    </View>
  );
};

export default CageCard;
