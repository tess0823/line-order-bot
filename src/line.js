import crypto from "node:crypto";

const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
const LINE_PROFILE_ENDPOINT = "https://api.line.me/v2/bot";

export function verifyLineSignature({ body, signature, channelSecret }) {
  if (!signature || !channelSecret) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function replyText({ replyToken, text, channelAccessToken }) {
  if (!replyToken || !text) {
    return;
  }

  const response = await fetch(LINE_REPLY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text: text.slice(0, 5000)
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE reply failed: ${response.status} ${body}`);
  }
}

export async function getProfile({ source, channelAccessToken }) {
  if (!source?.userId) {
    return null;
  }

  let url;
  if (source.type === "group" && source.groupId) {
    url = `${LINE_PROFILE_ENDPOINT}/group/${source.groupId}/member/${source.userId}`;
  } else if (source.type === "room" && source.roomId) {
    url = `${LINE_PROFILE_ENDPOINT}/room/${source.roomId}/member/${source.userId}`;
  } else {
    url = `${LINE_PROFILE_ENDPOINT}/profile/${source.userId}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${channelAccessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
