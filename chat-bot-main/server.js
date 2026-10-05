const express = require("express");
const app = express();
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();
const mongoose = require("mongoose");

// 🤖 Groq GPT-OSS client
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ✅ Connect to MongoDB using .env
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// 🧱 Chat Schema
const chatSchema = new mongoose.Schema({
  userMessage: String,
  botReply: String,
  timestamp: { type: Date, default: Date.now },
});
const Chat = mongoose.model("Chat", chatSchema);

// ⚙ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🧁 View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🌐 Single Page Route (Chat + History)
app.get("/", async (req, res) => {
  try {
    const chats = await Chat.find().sort({ timestamp: -1 }); // latest first
    res.render("test", { chats });
  } catch (error) {
    console.error("Error loading page:", error);
    res.status(500).send("Error loading page");
  }
});

// 💬 Chat POST API (Enhanced Recipe Recommender)
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // 🧠 Powerful recipe recommendation prompt
    const prompt = `
You are a powerful, professional recipe recommendation assistant whose goal is to give users practical, safe, and delightful cooking guidance.

User request: "${userMessage}"

Behavior & constraints:
1. Be friendly, concise, and confident. Use plain language and organized sections.
2. If the user provides ingredients they have (for example, "I have 4 eggs and rice"), immediately create a practical recipe using those ingredients. Do NOT ask follow-up questions.
3. When information such as servings, equipment, cooking time, or dietary preferences is not provided, make reasonable assumptions and proceed with the recipe.
4. Prioritize the ingredients explicitly mentioned by the user and avoid requiring additional ingredients. You may suggest common optional ingredients if they improve the recipe.
5. If the user gives only a few ingredients, be creative and generate the best possible recipe from them.
6. Only ask a follow-up question when the request is genuinely impossible to answer without clarification or when an important allergy/safety issue must be clarified.
7. Prefer simple, realistic recipes when the user appears to be a beginner; offer optional advanced variations when appropriate.
8. Always include food-safety notes where relevant (e.g., minimum internal temperatures, allergen warnings, safe storage).
9. Respect dietary constraints exactly when the user specifies them (vegetarian, vegan, gluten-free, keto, halal, low-sodium, etc.).
10. If the user asks for substitutions, provide at least two high-quality alternatives.
11. Output only a beautiful, human-readable recipe formatted in Markdown-style — no JSON, no code blocks.

Your response must include the following sections:
- 🏷 *Title*
- 🥣 *Description*
- 🏷 *Tags* (comma-separated)
- 🧂 *Ingredients* (bulleted list)
- 🍳 *Equipment*
- 👩‍🍳 *Step-by-step Method*
- 🍽 *Serving Info*
- 🔄 *Variations & Substitutions*
- 💡 *Tips & Plating Suggestions*
- ⚠ *Food Safety & Storage*
- 💰 *Estimated Difficulty & Cost*

Ensure the tone is warm and encouraging, suitable for home cooks.
`.trim();

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const botReply = response.choices[0].message.content;

    // ✅ Save chat to DB
    await Chat.create({ userMessage, botReply });

    res.json({ reply: botReply });
  } catch (err) {
    console.error("Chat API Error:", err);
    res
      .status(500)
      .json({ reply: "⚠ Something went wrong. Please try again!" });
  }
});

// 🚀 Start Server
app.listen(8080, () => {
  console.log("🍳 Recipe Recommender running at http://localhost:8080");
});
