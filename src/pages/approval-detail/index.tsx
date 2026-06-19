import React, { useMemo, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import StatusTag from '@/components/StatusTag';
import Timeline from '@/components/Timeline';
import { useAppStore } from '@/store';
import { formatDateTime, getOvertimeText, isOvertime } from '@/utils/date';
import type { ApprovalStatus } from '@/types/approval';
import styles from './index.module.scss';

const ApprovalDetailPage: React.FC = () => {
  const router = useRouter();
  const nodeId = router.params.id || '';
  const bookingId = router.params.bookingId || '';
  
  const pendingApprovals = useAppStore(s => s.pendingApprovals);
  const approvedList = useAppStore(s => s.approvedList);
  const approvalTrails = useAppStore(s => s.approvalTrails);
  const overtimeRecords = useAppStore(s => s.overtimeRecords);
  const overtimeStatus = useAppStore(s => s.overtimeStatus);
  const bookings = useAppStore(s => s.bookings);
  const approveNode = useAppStore(s => s.approveNode);
  const rejectNode = useAppStore(s => s.rejectNode);
  const checkAndHandleOvertime = useAppStore(s => s.checkAndHandleOvertime);
  const resolveOvertimeRecord = useAppStore(s => s.resolveOvertimeRecord);
  
  useEffect(() => {
    checkAndHandleOvertime();
  }, [checkAndHandleOvertime]);
  
  const booking = useMemo(() => {
    return bookings.find(b => b.id === bookingId) || null;
  }, [bookings, bookingId]);
  
  const node = useMemo(() => {
    if (booking) {
      return booking.approvalNodes.find(n => n.id === nodeId) || null;
    }
    const pending = pendingApprovals.find(item => item.node.id === nodeId);
    if (pending) return pending.node;
    const approved = approvedList.find(item => item.node.id === nodeId);
    if (approved) return approved.node;
    return null;
  }, [booking, pendingApprovals, approvedList, nodeId]);
  
  const trails = useMemo(() => {
    const bid = booking?.id || bookingId;
    return approvalTrails[bid] || [];
  }, [approvalTrails, booking, bookingId]);
  
  const nodeOvertimeRecords = useMemo(() => {
    const seen = new Set<number>();
    const result: typeof overtimeRecords = [];
    overtimeRecords.forEach(r => {
      if (r.nodeId !== nodeId) return;
      if (seen.has(r.level)) return;
      seen.add(r.level);
      result.push(r);
    });
    return result.sort((a, b) => a.level - b.level);
  }, [overtimeRecords, nodeId]);
  
  const handleResolveOvertime = (recordId: string) => {
    Taro.showModal({
      title: '处理超时提醒',
      content: '请填写处理结果，确认归档该超时提醒',
      editable: true,
      placeholderText: '处理结果说明（如：已联系审批人）',
      success: (res) => {
        if (res.confirm) {
          resolveOvertimeRecord(recordId, res.content || '已处理，归档超时提醒');
          Taro.showToast({ title: '已处理并归档', icon: 'success' });
        }
      }
    });
  };
  
  const handleRemindAgain = (record: any) => {
    Taro.showModal({
      title: '再次催办',
      content: `确认再次向「${record.responsiblePersonName}」发送催办？`,
      success: (res) => {
        if (res.confirm) {
          resolveOvertimeRecord(record.id, '再次发送催办通知');
          Taro.showToast({ title: '已再次催办', icon: 'success' });
        }
      }
    });
  };
  
  const isPending = node && (node.status === 'pending' || node.status === 'overtime');
  
  const handleApprove = () => {
    if (!nodeId) return;
    Taro.showModal({
      title: '确认通过',
      content: '确定通过该审批吗？',
      editable: true,
      placeholderText: '请输入审批意见（选填）',
      success: (res) => {
        if (res.confirm) {
          const comment = res.content || '同意';
          approveNode(nodeId, comment);
          console.log('[ApprovalDetail] 审批通过', nodeId);
          Taro.showToast({ title: '已通过', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 1500);
        }
      }
    });
  };
  
  const handleReject = () => {
    if (!nodeId) return;
    Taro.showModal({
      title: '确认拒绝',
      content: '确定拒绝该审批吗？请填写拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因（必填）',
      success: (res) => {
        if (res.confirm) {
          const comment = res.content || '不通过';
          rejectNode(nodeId, comment);
          console.log('[ApprovalDetail] 审批拒绝', nodeId);
          Taro.showToast({ title: '已拒绝', icon: 'none' });
          setTimeout(() => Taro.navigateBack(), 1500);
        }
      }
    });
  };
  
  const getNodeStepClass = (status: ApprovalStatus): string => {
    switch (status) {
      case 'pending': return styles.nodePending;
      case 'approved': return styles.nodeApproved;
      case 'rejected': return styles.nodeRejected;
      default: return styles.nodeDefault;
    }
  };
  
  const getNodeStepText = (status: ApprovalStatus, idx: number): string => {
    switch (status) {
      case 'approved': return '✓';
      case 'rejected': return '✗';
      default: return `${idx + 1}`;
    }
  };
  
  if (!booking) {
    return (
      <View className={styles.page}>
        <View style={{ textAlign: 'center', padding: '100rpx 0' }}>
          <Text style={{ color: '#94a3b8' }}>审批信息不存在</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>{booking.cageCode}</Text>
        <Text className={styles.headerSub}>{booking.cageName}</Text>
      </View>
      
      <View className={styles.content}>
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>预约信息</Text>
            </View>
            <StatusTag status={booking.status} />
          </View>
          
          <View className={styles.infoGrid}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>申请人</Text>
              <Text className={styles.infoValue}>{booking.applicantName}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>课题组</Text>
              <Text className={styles.infoValue}>{booking.groupName}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>动物数量</Text>
              <Text className={styles.infoValue}>{booking.animalCount}只</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>动物类型</Text>
              <Text className={styles.infoValue}>{booking.animalType}</Text>
            </View>
          </View>
          
          <View className={styles.infoFull}>
            <Text className={styles.infoLabel}>使用时间</Text>
            <Text className={styles.infoValue}>
              {formatDateTime(booking.startTime)} ~ {formatDateTime(booking.endTime)}
            </Text>
          </View>
          <View className={styles.infoFull}>
            <Text className={styles.infoLabel}>实验用途</Text>
            <Text className={styles.infoValue}>{booking.purpose}</Text>
          </View>
        </View>
        
        {booking.approvalNodes && booking.approvalNodes.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <View className={styles.sectionTitle}>
                <View className={styles.titleBar} />
                <Text>审批节点</Text>
              </View>
            </View>
            <View className={styles.nodeList}>
              {booking.approvalNodes.map((n, idx) => (
                <View key={n.id} className={styles.nodeItem}>
                  <View className={`${styles.nodeStep} ${getNodeStepClass(n.status)}`}>
                    <Text>{getNodeStepText(n.status, idx)}</Text>
                  </View>
                  <View className={styles.nodeContent}>
                    <Text className={styles.nodeName}>{n.nodeName}</Text>
                    <Text className={styles.nodeApprover}>审批人: {n.approverName}</Text>
                    {n.comment && <Text className={styles.nodeComment}>意见: {n.comment}</Text>}
                    {n.handledAt && <Text className={styles.nodeTime}>处理时间: {formatDateTime(n.handledAt)}</Text>}
                    {!n.handledAt && n.deadline && (
                      <Text className={styles.nodeTime}>
                        截止: {formatDateTime(n.deadline)}
                        {isOvertime(n.deadline) && ' (已超时)'}
                      </Text>
                    )}
                  </View>
                  <StatusTag status={n.status} size="sm" />
                </View>
              ))}
            </View>
          </View>
        )}
        
        {nodeOvertimeRecords.length > 0 && (
          <View className={styles.overtimeSection}>
            <Text className={styles.overtimeTitle}>⚠️ 超时催办记录</Text>
            {nodeOvertimeRecords.map(record => {
              const status = overtimeStatus[record.id];
              const isHandled = status?.handled;
              return (
                <View key={record.id} className={`${styles.overtimeItem} ${isHandled ? styles.overtimeHandled : ''}`}>
                  <View style={{ flex: 1, width: '100%' }}>
                    <Text className={styles.overtimeHandledTag}>
                      {isHandled ? '✓ 已归档' : '待处理'}
                    </Text>
                    <View style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text className={styles.overtimeLabel}>
                          责任人: {record.responsiblePersonName}
                        </Text>
                        <Text className={styles.overtimeLabel}>
                          超时时间: {formatDateTime(record.overtimeAt)}
                        </Text>
                      </View>
                      <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4rpx' }}>
                        <Text className={`${styles.overtimeLevel} ${record.level === 1 ? styles.level1 : record.level === 2 ? styles.level2 : styles.level3}`}>
                          {record.escalated ? `已升级 L${record.level}` : `已催办 L${record.level}`}
                        </Text>
                        <Text style={{ fontSize: '22rpx', color: '#94a3b8' }}>
                          {record.reminded ? '已通知' : '待通知'}
                        </Text>
                      </View>
                    </View>
                    {isHandled && status && (
                      <View className={styles.overtimeHandledInfo}>
                        <Text className={styles.overtimeHandledLabel}>
                          处理人: {status.handledByName} · 处理时间: {formatDateTime(status.handledAt)}
                        </Text>
                        {status.handlingComment && (
                          <Text className={styles.overtimeHandledValue}>
                            处理结果: {status.handlingComment}
                          </Text>
                        )}
                      </View>
                    )}
                    {!isHandled && (
                      <View className={styles.overtimeActions}>
                        <View className={styles.overtimeActionBtn} onClick={() => handleRemindAgain(record)}>
                          <Text>再次催办</Text>
                        </View>
                        <View className={`${styles.overtimeActionBtn} ${styles.overtimeResolveBtn}`} onClick={() => handleResolveOvertime(record.id)}>
                          <Text>处理并归档</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.sectionTitle}>
              <View className={styles.titleBar} />
              <Text>审批轨迹</Text>
            </View>
          </View>
          {trails.length > 0 ? (
            <Timeline trails={trails} />
          ) : (
            <View className={styles.trailEmpty}>
              <Text className={styles.trailEmptyText}>暂无审批记录</Text>
            </View>
          )}
        </View>
      </View>
      
      {isPending && (
        <View className={styles.bottomBar}>
          <View className={`${styles.actionBtn} ${styles.rejectBtn}`} onClick={handleReject}>
            <Text className={styles.rejectText}>拒绝</Text>
          </View>
          <View className={`${styles.actionBtn} ${styles.approveBtn}`} onClick={handleApprove}>
            <Text className={styles.approveText}>通过</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default ApprovalDetailPage;
