import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { handleCommand, resetAllSessionsForTests } from "../src/orderBook.js";

afterEach(() => {
  resetAllSessionsForTests();
});

test("records one order per person and summarizes equal items with names", async () => {
  const chatId = "group-1";

  assert.match(await send(chatId, "u1", "王小明", "/開單"), /已開單/);
  assert.equal(await send(chatId, "u1", "王小明", "點牛肉麵"), null);
  assert.equal(await send(chatId, "u2", "陳美美", "點牛肉麵"), null);
  assert.equal(await send(chatId, "u3", "Ken", "點雞腿便當"), null);

  assert.equal(
    await send(chatId, "u1", "王小明", "/結單"),
    [
      "今日點餐統計",
      "",
      "牛肉麵：2",
      "- 王小明",
      "- 陳美美",
      "",
      "雞腿便當：1",
      "- Ken"
    ].join("\n")
  );
});

test("changing an order replaces the previous item", async () => {
  const chatId = "group-1";

  await send(chatId, "u1", "王小明", "/開單");
  await send(chatId, "u1", "王小明", "點牛肉麵");
  await send(chatId, "u1", "王小明", "改雞腿便當");

  assert.equal(
    await send(chatId, "u1", "王小明", "/統計"),
    ["今日點餐統計", "", "雞腿便當：1", "- 王小明"].join("\n")
  );
});

test("accepts legacy item commands and merges aliases", async () => {
  const chatId = "group-1";

  await send(chatId, "u1", "王小明", "/開單");
  await send(chatId, "u1", "王小明", "/點無骨雞腿排便當");
  await send(chatId, "u2", "陳美美", "/點 雞腿排");
  await send(chatId, "u3", "Ken", "/點雞腿排便當");

  assert.equal(
    await send(chatId, "u1", "王小明", "/統計"),
    [
      "今日點餐統計",
      "",
      "無骨雞腿排便當：3",
      "- 王小明",
      "- 陳美美",
      "- Ken"
    ].join("\n")
  );
});

test("closing an order rejects late orders", async () => {
  const chatId = "group-1";

  await send(chatId, "u1", "王小明", "/開單");
  await send(chatId, "u1", "王小明", "點牛肉麵");
  await send(chatId, "u1", "王小明", "/結單");

  assert.equal(await send(chatId, "u2", "陳美美", "點雞腿排"), "來不及了，下次請早");
  assert.equal(
    await send(chatId, "u1", "王小明", "/統計"),
    ["今日點餐統計", "", "牛肉麵：1", "- 王小明"].join("\n")
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
