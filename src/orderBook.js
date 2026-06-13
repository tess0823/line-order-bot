const sessions = new Map();

const itemAliases = [
  {
    item: "無骨雞腿排便當",
    aliases: ["無骨雞腿排便當", "無骨雞腿排", "雞腿排便當", "雞腿排"]
  }
];

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      isOpen: false,
      isClosed: false,
      orders: new Map()
    });
  }

  return sessions.get(chatId);
}

function normalizeItem(value) {
  return value.trim().replace(/\s+/g, " ");
}

function compactItem(value) {
  return normalizeItem(value).replace(/\s+/g, "");
}

function canonicalItem(value) {
  const normalized = normalizeItem(value);
  const compact = compactItem(value);

  for (const group of itemAliases) {
    const aliases = [group.item, ...group.aliases].map(compactItem);
    if (aliases.includes(compact)) {
      return group.item;
    }
  }

  return normalized;
}

function displayName(profile, fallbackUserId) {
  return profile?.displayName || fallbackUserId || "未知使用者";
}

function parseItemCommand(trimmed, commands) {
  for (const command of commands) {
    if (trimmed === command) {
      return "";
    }

    if (trimmed.startsWith(`${command} `)) {
      return trimmed.slice(command.length + 1);
    }

    if (trimmed.startsWith(command)) {
      return trimmed.slice(command.length);
    }
  }

  return null;
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
    session.isClosed = false;
    session.orders.clear();
    return [
      "已開單，大家可以開始點餐。",
      "",
      "格式：點餐點",
      "範例：點牛肉麵"
    ].join("\n");
  }

  if (trimmed === "/清空") {
    session.isOpen = false;
    session.isClosed = false;
    session.orders.clear();
    return "已清空這一輪點餐。";
  }

  if (trimmed === "/結單") {
    session.isOpen = false;
    session.isClosed = true;
    return summaryText(session);
  }

  const orderedItem = parseItemCommand(trimmed, ["點", "改", "/點", "/改"]);
  if (orderedItem !== null) {
    if (session.isClosed) {
      return "來不及了，下次請早";
    }

    if (!session.isOpen) {
      return "目前還沒開單，請先輸入 /開單。";
    }

    const item = canonicalItem(orderedItem);
    if (!item) {
      return "請在指令後面加上餐點，例如：點牛肉麵";
    }

    session.orders.set(userId, {
      userId,
      name,
      item
    });

    return null;
  }

  if (trimmed === "/取消") {
    if (!session.orders.has(userId)) {
      return null;
    }

    session.orders.delete(userId);
    return null;
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
    "點餐點：記錄自己的餐點，例如 點牛肉麵",
    "改餐點：改成新的餐點，例如 改肉燥飯",
    "/取消：取消自己的點餐",
    "/結單：停止收單並顯示統計",
    "/統計：查看目前統計，不會停止收單",
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
