import { createClient } from "@libsql/client";

// 初始化 Turso 客戶端 (連線會自動共用，適合 Serverless 環境)
const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    // 處理跨域問題 (CORS)，讓你的前端 (如 Vite 本地端) 可以順利呼叫
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 如果是 Preflight 請求，直接回傳 OK
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 【情境一：儲存分數】 前端發送 POST 請求
        if (req.method === 'POST') {
        const { player_name, score } = req.body;

        // 簡單的防呆驗證
        if (!player_name || score === undefined) {
                return res.status(400).json({ success: false, message: "缺少必要欄位" });
        }

        // 使用安全防護的參數化查詢 (?) 塞入資料
        await client.execute({
                sql: "INSERT INTO game_logs (player_name, score) VALUES (?, ?)",
                args: [player_name, score || 1],
        });

        return res.status(200).json({ success: true, message: "分數儲存成功！" });
        }

            // 【情境二：讀取排行榜】 前端發送 GET 請求
            if (req.method === 'GET') {
                // 抓取前 10 名的高分玩家
                const result = await client.execute(
                "SELECT player_name, score FROM game_logs ORDER BY score DESC LIMIT 10"
            );

            return res.status(200).json({
                success: true,
                leaderboard: result.rows // Turso 會將資料包在 .rows 中
            });
        }

        // 若不是 GET 或 POST，回傳不支援該方法
        return res.status(405).json({ message: "Method Not Allowed" });

    } catch (error) {
        console.error("Turso 資料庫出錯:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}