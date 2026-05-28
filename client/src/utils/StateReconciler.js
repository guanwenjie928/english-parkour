// 重连后状态快照恢复

export const reconcileState = async (socket, localSnapshot) => {
  // 请求服务端全量快照
  const remote = await new Promise((resolve) => {
    socket.emit('request_state_sync', (data) => resolve(data));
    // 3秒超时
    setTimeout(() => resolve(null), 3000);
  });

  if (!remote) {
    return { reconciled: false, reason: 'no_server_state' };
  }

  // 计算差异
  const diff = computeDiff(localSnapshot, remote);

  return {
    reconciled: true,
    playerProgress: remote.progress,
    correctCount: remote.correctCount,
    items: remote.items,
    effects: remote.effects,
    status: remote.status,
    elapsed: remote.elapsed,
    diff,
  };
};

const computeDiff = (local, remote) => ({
  progressDelta: (remote.progress ?? 0) - (local?.progress ?? 0),
  newItems: (remote.items ?? []).filter(
    (i) => !(local?.items ?? []).includes(i)
  ),
  lostEffects: (local?.effects ?? []).filter(
    (e) => !(remote.effects ?? []).includes(e)
  ),
});

// 平滑插值追赶
export const smoothCatchUp = (current, target, factor = 0.1) =>
  current + (target - current) * factor;
