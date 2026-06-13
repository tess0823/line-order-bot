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
    session.orders.clear();
    return "已清空這一輪點餐。";
  }

  const orderedItem = parseItemCommand(trimmed, ["點", "改", "/點", "/改"]);
  if (orderedItem !== null) {
    if (!session.isOpen) {
      return "目前還沒開單，請先輸入 /開單。";
    }

    const item = canonicalItem(orderedItem);
    if (!item) {
      return "請在指令後面加上餐點，例如：點牛肉麵";
    }
