import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface SectionHeaderProps {
  title: string;
  extra?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, extra }) => {
  return (
    <View className={styles.header}>
      <View className={styles.titleWrapper}>
        <View className={styles.titleBar} />
        <Text className={styles.title}>{title}</Text>
      </View>
      {extra && <View className={styles.extra}>{extra}</View>}
    </View>
  );
};

export default SectionHeader;
