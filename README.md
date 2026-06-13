# LINE 點餐統計 Bot

這是一個給公司 LINE 點餐群組用的小機器人。它只保留目前這一輪的點餐資料，不寫入資料庫，也不計算金額。

## 群組指令

```text
/開單
```

開始新一輪點餐，並清掉上一輪內容。

```text
/點 牛肉麵
```

記錄自己的餐點。

```text
/改 雞腿便當
```

把自己的餐點改成新的餐點。

```text
/取消
```

取消自己的點餐。

```text
/統計
```

輸出同品項的數量。

```text
/明細
```

依照餐點列出點餐的人。

```text
/清空
```

結束這一輪點餐。

## 在自己的電腦測試

先安裝 Node.js 20 以上版本。

```powershell
npm test
```

測試通過後，啟動伺服器：

```powershell
$env:LINE_CHANNEL_SECRET="你的 Channel secret"
$env:LINE_CHANNEL_ACCESS_TOKEN="你的 Channel access token"
npm start
```

本機啟動後，瀏覽器打開：

```text
http://localhost:3000
```

看到 `ok: true` 代表服務有啟動。

## 接上 LINE 群組

1. 到 LINE Developers 建立 Provider。
2. 建立 Messaging API channel。
3. 到 Messaging API 分頁取得 Channel secret。
4. 發行 Channel access token。
5. 開啟 Use webhook。
6. 開啟 Allow bot to join group chats。
7. 把這個程式部署到線上服務。
8. 將 Webhook URL 設成：

```text
https://你的網址/webhook
```

9. 在 LINE Developers 按 Verify。
10. 把官方帳號邀請進點餐群組。

## 建議部署方式

這個專案可以部署到 Render、Railway、Fly.io 或任何支援 Node.js 的平台。

部署時需要設定兩個環境變數：

```text
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
```

如果只是公司內部使用，Render 或 Railway 會比較容易上手。
