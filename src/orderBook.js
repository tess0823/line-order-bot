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
