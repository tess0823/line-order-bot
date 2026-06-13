import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { handleCommand, resetAllSessionsForTests } from "../src/orderBook.js";

afterEach(() => {
  resetAllSessionsForTests();
});

test("records one order per person and summarizes equal items", () => {
  const chatId = "group-1";

  assert.match(send(chatId, "u1", "王小明", "/開單"), /已開單/);
  assert.match(send(chatId, "u1", "王小明", "/點 牛肉麵"), /牛肉麵/);
  assert.match(send(chatId, "u2", "陳美美", "/點 牛肉麵"), /牛肉麵/);
  assert.match(send(chatId, "u3", "Ken", "/點 雞腿便當"), /雞腿便當/);

  assert.equal(
    send(chatId, "u1", "王小明", "/統計"),
    ["今日點餐統計", "", "牛肉麵：2", "雞腿便當：1"].join("\n")
  );
});

test("changing an order replaces the previous item", () => {
  const chatId = "group-1";

  send(chatId, "u1", "王小明", "/開單");
  send(chatId, "u1", "王小明", "/點 牛肉麵");
  send(chatId, "u1", "王小明", "/改 雞腿便當");

  assert.equal(
    send(chatId, "u1", "王小明", "/統計"),
    ["今日點餐統計", "", "雞腿便當：1"].join("\n")
  );
});

test("detail groups people by item", () => {
  const chatId = "group-1";

  send(chatId, "u1", "王小明", "/開單");
  send(chatId, "u1", "王小明", "/點 牛肉麵");
  send(chatId, "u2", "陳美美", "/點 牛肉麵");

  assert.equal(
    send(chatId, "u1", "王小明", "/明細"),
    ["點餐明細", "", "牛肉麵", "- 王小明", "- 陳美美"].join("\n")
  );
});

function send(chatId, userId, displayName, text) {
  return handleCommand({
    chatId,
    userId,
    text,
    profile: { displayName }
  });
}
