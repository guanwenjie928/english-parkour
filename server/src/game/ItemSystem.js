// 道具系统 — 查表驱动，零分支逻辑

// 道具注册表
const ITEM_REGISTRY = Object.freeze({
  rocket: {
    type: 'buff',
    selfTarget: true,
    duration: 5000,
    effect: (player) => ({ speed: Math.min(player.speed * 2.5, 8) }),
    sfx: 'rocket',
  },
  electric: {
    type: 'control',
    selfTarget: false,
    duration: null, // 直到恢复
    effect: (target) => ({ paralyzed: true, recoveryNeeded: 2 }),
    sfx: 'electric',
  },
  banana: {
    type: 'control',
    selfTarget: false,
    duration: null,
    effect: (target) => ({ slow: true, recoveryNeeded: 1 }),
    sfx: 'banana',
  },
  shield: {
    type: 'defense',
    selfTarget: true,
    duration: 8000,
    effect: (player) => ({ shielded: true }),
    sfx: 'shield',
  },
  magnet: {
    type: 'buff',
    selfTarget: true,
    duration: 6000,
    effect: (player) => ({ magnet: true }),
    sfx: 'item_get',
  },
});

class ItemSystem {
  static useItem(room, fromSocketId, itemType, targetTrack) {
    const item = ITEM_REGISTRY[itemType];
    if (!item) return { ok: false, reason: 'unknown_item' };

    const from = room.players.get(fromSocketId);
    if (!from?.items?.includes(itemType)) {
      return { ok: false, reason: 'not_owned' };
    }

    // 查表定位目标
    const targetId = item.selfTarget
      ? fromSocketId
      : room.trackMap.get(targetTrack);

    if (!targetId) return { ok: false, reason: 'invalid_target' };
    if (targetId === fromSocketId && !item.selfTarget) {
      return { ok: false, reason: 'cannot_target_self' };
    }

    const target = room.players.get(targetId);
    if (!target) return { ok: false, reason: 'target_not_found' };

    // 护盾抵消
    if (item.type === 'control' && target.effects?.shielded) {
      target.effects.shielded = false;
      return {
        ok: true,
        blocked: true,
        by: 'shield',
        fromId: fromSocketId,
        toId: targetId,
        itemType,
      };
    }

    // 应用效果
    const changes = item.effect(target);
    Object.assign(target.effects, changes);

    // 设置定时器清除 buff
    if (item.duration) {
      setTimeout(() => {
        Object.keys(changes).forEach((k) => delete target.effects?.[k]);
      }, item.duration);
    }

    return {
      ok: true,
      fromId: fromSocketId,
      toId: targetId,
      itemType,
      sfx: item.sfx,
      changes,
    };
  }

  static getItemInfo(itemType) {
    return ITEM_REGISTRY[itemType] || null;
  }

  static getAllItemTypes() {
    return Object.keys(ITEM_REGISTRY);
  }
}

module.exports = { ItemSystem, ITEM_REGISTRY };
