import http from "node:http";
import { handleCommand } from "./orderBook.js";
import { getProfile, replyText, verifyLineSignature } from "./line.js";
import { initStorage } from "./storage.js";

const port = Number(process.env.PORT || 3000);
const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!channelSecret || !channelAccessToken) {
  console.warn("LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN are required for LINE webhooks.");
}

await initStorage();

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") {
      sendJson(response, 200, {
        ok: true,
        name: "line-order-bot",
        webhook: "/webhook"
      });
      return;
    }

    if (request.method === "GET" && request.url === "/ping") {
      response.writeHead(200, {
        "Content-Type": "text/plain"
      });
      response.end("ok");
      return;
    }

    if (request.method !== "POST" || request.url !== "/webhook") {
      sendJson(response, 404, { ok: false, message: "Not found" });
      return;
    }

    const body = await readBody(request);
    const signature = request.headers["x-line-signature"];
    const isValid = verifyLineSignature({ body, signature, channelSecret });

    if (!isValid) {
      sendJson(response, 401, { ok: false, message: "Invalid signature" });
      return;
    }

    const payload = JSON.parse(body);
    await Promise.all(payload.events.map(processEvent));
    sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { ok: false, message: "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`LINE order bot is running on port ${port}`);
});

async function processEvent(event) {
  if (event.type !== "message" || event.message?.type !== "text") {
    return;
  }

  const source = event.source || {};
  const chatId = source.groupId || source.roomId || source.userId;
  const userId = source.userId;

  if (!chatId || !userId) {
    return;
  }

  const profile = await getProfile({ source, channelAccessToken });
  const reply = await handleCommand({
    chatId,
    userId,
    text: event.message.text,
    profile
  });

  if (reply) {
    await replyText({
      replyToken: event.replyToken,
      text: reply,
      channelAccessToken
    });
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(data));
}
