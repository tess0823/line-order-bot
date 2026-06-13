const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      isOpen: false,
      orders: new Map()
    });
  }

  return sessions.get(chatId);
}

function normalizeItem(value) {
  return value.trim().replace(/\s+/g, " ");
}

function displayName(profile, fallbackUserId) {
  return profile?.displayName || fallbackUserId || "未知使用者";
}

export function handleCommand({ chatId, userId, text, profile }) {
  const session = getSession(chatId);
  const trimmed = text.trim();
  const name = displayName(profile, userId);

  if (trimmed === "/help" || trimmed === "/說明") {
    return helpText();
  }

  if (trimmed === "/開單") {
    session.isOpen = true;
    session.orders.clear();
    return [
      "已開單，大家可以開始點餐。",
      "",
      "格式：/點 餐點",
      "範例：/點 牛肉麵"
    ].join("\n");
  }

  if (trimmed === "/清空") {
    session.isOpen = false;
    session.orders.clear();
    return "已清空這一輪點餐。";
  }

  if (trimmed.startsWith("/點 ") || trimmed.startsWith("/改 ")) {
    if (!session.isOpen) {
      return "目前還沒開單，請先輸入 /開單。";
    }

    const item = normalizeItem(trimmed.slice(3));
    if (!item) {
      return "請在指令後面加上餐點，例如：/點 牛肉麵";
    }

    session.orders.set(userId, {
      userId,
      name,
      item
    });

    return `${name} 已記錄：${item}`;
  }

  if (trimmed === "/取消") {
    if (!session.orders.has(userId)) {
      return `${name} 目前沒有點餐紀錄。`;
    }

    session.orders.delete(userId);
    return `${name} 已取消點餐。`;
  }

  if (trimmed === "/統計") {
    return summaryText(session);
  }

  if (trimmed === "/明細") {
    return detailText(session);
  }

  return null;
}

export function resetAllSessionsForTests() {
  sessions.clear();
}

function helpText() {
  return [
    "點餐機器人指令",
    "",
    "/開單：開始新一輪點餐",
    "/點 餐點：記錄自己的餐點",
    "/改 餐點：改成新的餐點",
    "/取消：取消自己的點餐",
    "/統計：合併相同餐點並顯示數量",
    "/明細：依餐點列出人名",
    "/清空：結束並清掉本輪資料"
  ].join("\n");
}

function summaryText(session) {
  if (session.orders.size === 0) {
    return "目前還沒有人點餐。";
  }

  const counts = new Map();
  for (const order of session.orders.values()) {
    counts.set(order.item, (counts.get(order.item) || 0) + 1);
  }

  const lines = ["今日點餐統計", ""];
  for (const [item, count] of sortEntries(counts)) {
    lines.push(`${item}：${count}`);
  }

  return lines.join("\n");
}

function detailText(session) {
  if (session.orders.size === 0) {
    return "目前還沒有人點餐。";
  }

  const byItem = new Map();
  for (const order of session.orders.values()) {
    if (!byItem.has(order.item)) {
      byItem.set(order.item, []);
    }
    byItem.get(order.item).push(order.name);
  }

  const lines = ["點餐明細"];
  for (const [item, names] of sortEntries(byItem)) {
    lines.push("", item);
    for (const name of names.sort((a, b) => a.localeCompare(b, "zh-Hant"))) {
      lines.push(`- ${name}`);
    }
  }

  return lines.join("\n");
}

function sortEntries(map) {
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "zh-Hant"));
}
