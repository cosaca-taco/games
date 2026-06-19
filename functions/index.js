const { onRequest } = require("firebase-functions/v2/https");
const { Anthropic } = require("@anthropic-ai/sdk");

exports.analyze = onRequest({
  region: "us-central1",
  secrets: ["ANTHROPIC_API_KEY"],
  cors: true
}, async (req, res) => {
  try {
    // 💡 確実に標準的なJSONオブジェクトから画像を取り出す
    const image = req.body && req.body.image;

    if (!image || image.trim().length === 0) {
      return res.status(400).json({ error: "画像データがありません" });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `与えられた食事の画像を分析し、写っている料理・食品を種類ごとに分けて、以下のjsonフォーマットでのみ結果を返してください。余計なテキストは一切含めないでください。
boxは画像内でその料理・食品が占める矩形領域を、画像の幅・高さに対する比率（0.0〜1.0）で表してください。x,yは矩形左上の座標、width,heightは矩形の幅・高さです。
{
  "items": [
    {
      "name": "料理・食品の名前",
      "calories": 推定カロリー,
      "protein": 推定タンパク質量,
      "fat": 推定脂質量,
      "carbohydrates": 推定炭水化物量,
      "box": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 }
    }
  ],
  "advice": "栄養士としてのアドバイス"
}`;

    const msg = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const replyText = msg.content[0].text;
    const cleanJson = replyText.replace(/```json|```/g, "").trim();
    const resultJson = JSON.parse(cleanJson);

    return res.json(resultJson);

  } catch (error) {
    console.error("Firebase Error:", error);
    return res.status(500).json({
      error: "サーバー内部エラー",
      message: error.message
    });
  }
});
