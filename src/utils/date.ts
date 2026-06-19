import dayjs from 'dayjs';

export const formatDateTime = (date: string | Date, format: string = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(date).format(format);
};

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('HH:mm');
};

export const getDurationText = (hours: number): string => {
  if (hours < 24) {
    return `${hours}小时`;
  }
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}天${remainHours}小时` : `${days}天`;
};

export const getRelativeTime = (date: string | Date): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');
  
  if (diffMinutes < 0) {
    const absMinutes = Math.abs(diffMinutes);
    if (absMinutes < 60) {
      return `还有${absMinutes}分钟`;
    }
    const hours = Math.floor(absMinutes / 60);
    if (hours < 24) {
      return `还有${hours}小时`;
    }
    const days = Math.floor(hours / 24);
    return `还有${days}天`;
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    return `${hours}小时前`;
  }
  const days = Math.floor(hours / 24);
  return `${days}天前`;
};

export const isOvertime = (deadline: string | Date): boolean => {
  return dayjs().isAfter(dayjs(deadline));
};

export const getOvertimeText = (deadline: string | Date): string => {
  const now = dayjs();
  const target = dayjs(deadline);
  const diff = now.diff(target, 'minute');
  
  if (diff <= 0) {
    return `剩余 ${Math.ceil(Math.abs(diff) / 60)} 小时`;
  }
  
  if (diff < 60) {
    return `超时 ${diff} 分钟`;
  }
  const hours = Math.floor(diff / 60);
  if (hours < 24) {
    return `超时 ${hours} 小时`;
  }
  const days = Math.floor(hours / 24);
  return `超时 ${days} 天`;
};
