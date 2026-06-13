import {
  clearSession,
  closeSession,
  deleteOrder,
  getSession,
  listOrders,
  openSession,
  resetMemoryStorageForTests,
  setOrder
} from "./storage.js";

const itemAliases = [
  {
    item: "無骨雞腿排便當",
    aliases: ["無骨雞腿排便當", "無骨雞腿排", "雞腿排便當", "雞腿排"]
  }
];

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

export async function handleCommand({ chatId, userId, text, profile }) {
  const trimmed = text.trim();
  const name = displayName(profile, userId);
  const userKey = userId;

  if (trimmed === "/help" || trimmed === "/說明") {
    return helpText();
  }

  if (trimmed === "/開單") {
    await openSession(chatId);
    return [
      "已開單，大家可以開始點餐。",
      "",
      "格式：點餐點",
      "範例：點牛肉麵"
    ].join("\n");
  }

  if (trimmed === "/清空") {
    await clearSession(chatId);
    return "已清空這一輪點餐。";
  }

  if (trimmed === "/結單") {
    await closeSession(chatId);
    const orders = await listOrders(chatId);
    return summaryText(orders);
  }

  const orderedItem = parseItemCommand(trimmed, ["點", "改", "/點", "/改"]);
  if (orderedItem !== null) {
    const session = await getSession(chatId);

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

    await setOrder({ chatId, userKey, userId, name, item });
    return null;
  }

  if (trimmed === "/取消") {
    await deleteOrder({ chatId, userKey });
    return null;
  }

  if (trimmed === "/統計") {
    const orders = await listOrders(chatId);
    return summaryText(orders);
  }

  if (trimmed === "/明細") {
    const orders = await listOrders(chatId);
    return detailText(orders);
  }

  return null;
}

export function resetAllSessionsForTests() {
  resetMemoryStorageForTests();
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

function summaryText(orders) {
  if (orders.length === 0) {
    return "目前還沒有人點餐。";
  }

  const byItem = groupOrdersByItem(orders);
  const lines = ["今日點餐統計"];

  for (const [item, itemOrders] of sortEntries(byItem)) {
    lines.push("", `${item}：${itemOrders.length}`);
    for (const order of sortOrdersByName(itemOrders)) {
      lines.push(`- ${order.name}`);
    }
  }

  return lines.join("\n");
}

function detailText(orders) {
  if (orders.length === 0) {
    return "目前還沒有人點餐。";
  }

  return summaryText(orders).replace("今日點餐統計", "點餐明細");
}

function groupOrdersByItem(orders) {
  const byItem = new Map();

  for (const order of orders) {
    if (!byItem.has(order.item)) {
      byItem.set(order.item, []);
    }
    byItem.get(order.item).push(order);
  }

  return byItem;
}

function sortOrdersByName(orders) {
  return [...orders].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

function sortEntries(map) {
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "zh-Hant"));
}
