import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Shared Gemini client setup
  const getGeminiAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "DP Web" });
  });

  // AI Style Suggestions API
  app.post("/api/gemini/suggest-style", async (req, res) => {
    try {
      const { profession, stylePreference, platform } = req.body;
      const ai = getGeminiAI();

      const prompt = `You are a professional Display Picture (DP) designer & personal branding expert.
User requested DP recommendations for:
- Profession/Role: ${profession || "General / Content Creator"}
- Style Vibe: ${stylePreference || "Modern Professional"}
- Target Platform: ${platform || "WhatsApp / LinkedIn / Instagram"}

Provide a concise JSON response with:
1. "bgGradient": A CSS linear gradient string fitting this vibe (e.g., "linear-gradient(135deg, #059669 0%, #111827 100%)")
2. "recommendedFrame": One of ["none", "emerald-ring", "gold-ring", "dashed-circle", "neon-glow"]
3. "recommendedBadge": One of ["verified", "open-to-work", "pro", "creator", "whatsapp-tick", "none"]
4. "badgeText": A short text string for status badge if applicable (e.g., "OPEN TO WORK" or "VIP CREATOR")
5. "filterPreset": One of ["auto-hd", "portrait-glow", "warm-studio", "cyber-teal", "bw-dramatic"]
6. "bioCaption": A 1-line catchy bio status quote for their profile.
7. "dpAdvice": A 2-sentence tip to make their profile picture look stand out.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      res.json({ success: true, recommendation: JSON.parse(text) });
    } catch (error: any) {
      console.error("Gemini Suggest Style Error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Failed to generate AI DP suggestions",
      });
    }
  });

  // AI Status & Caption Generator API
  app.post("/api/gemini/generate-bio", async (req, res) => {
    try {
      const { category, tone } = req.body;
      const ai = getGeminiAI();

      const prompt = `Generate 5 creative, short, modern status/bio quotes for a profile picture on ${category || "social media"} with a ${tone || "professional yet friendly"} tone. Return JSON array of strings under property "captions".`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || '{"captions": []}';
      res.json({ success: true, ...JSON.parse(text) });
    } catch (error: any) {
      console.error("Gemini Bio Generator Error:", error);
      res.status(500).json({ success: false, error: error?.message || "Failed to generate bios" });
    }
  });

  // AI Background Image Generator API
  app.post("/api/gemini/generate-bg", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: "Prompt is required" });
      }

      const ai = getGeminiAI();

      // 1. Attempt Gemini Imagen generation if available
      try {
        const response = await ai.models.generateImages({
          model: "imagen-3.0-generate-002",
          prompt: `${prompt}, professional high resolution profile picture background, photorealistic 8k studio lighting, 1080x1080 square`,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "1:1",
          },
        });

        const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64Image) {
          return res.json({
            success: true,
            imageUrl: `data:image/jpeg;base64,${base64Image}`,
            prompt,
            source: "gemini-imagen",
          });
        }
      } catch (genErr) {
        console.warn("Gemini Imagen generateImages not supported on endpoint, falling back to Pollinations AI generator stream:", genErr);
      }

      // 2. High-Definition AI Image Stream Generation
      const encodedPrompt = encodeURIComponent(
        `${prompt} professional high-resolution background portrait photography, studio lighting 1080x1080 hd`
      );
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&seed=${Math.floor(
        Math.random() * 100000
      )}`;

      res.json({
        success: true,
        imageUrl: pollinationsUrl,
        prompt,
        source: "ai-generator",
      });
    } catch (error: any) {
      console.error("AI Generate BG Error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Failed to generate AI background",
      });
    }
  });

  // AI Assistant Route
  app.post("/api/gemini/assistant", async (req, res) => {
    try {
      const { message, history, currentTab, hasImage } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: "Message is required" });
      }

      const ai = getGeminiAI();

      const systemPrompt = `You are DP Web AI Studio Assistant — an expert photo editor & personal branding AI guide built into DP Web.
Your job is to answer user queries, explain DP Web features, give profile picture tips, and recommend/trigger the best editing tools.

DP Web App Capabilities & Available Tool Tabs:
1. "templates": Instant complete DP Presets (WhatsApp Verified, LinkedIn Pro, Emerald Gold, Pakistan Patriot, Islamic Crescent, Cyberpunk, Royal VIP, etc.)
2. "bgchanger": AI Background Studio (Generate any custom 1080x1080 AI background via prompt, or select from 20+ HD built-in presets like Sunset Mountains, Penthouse Office, Cricket Stadium, Pakistan Emerald Flag, Islamic Mosque, Royal Blue Studio, Sunlit Forest, Cyberpunk Neon).
3. "bgremover": AI Background Remover (Automated subject cutout via neural network + manual eraser touch-up tool).
4. "enhance": AI Photo Enhancer (Auto AI HD, Sharpness & Detail Boost, Skin Glow, Brightness, Contrast, Saturation, Warmth).
5. "frames": Decorative DP Frames & Rings (WhatsApp Emerald Green Ring, Gold Luxury Ring, Neon Pulse, Verified Shield, Double Ring, Gradient Ring).
6. "badges": Profile Badges & Status Ticks (Verified Blue Tick, Open to Work, Pro, Creator, WhatsApp Tick, VIP, Custom status text badge).
7. "filters": One-Touch Filters (Auto HD, Portrait Glow, Warm Studio, Cyber Mint, B&W Dramatic).
8. "text": Custom Name Text & Curved Text (Name text, curved circular text, font styles, text color).
9. "shapes": Crop & Mask Shapes (Circle, Squircle, Hexagon, Heart, Shield, Octagon).
10. "compressor": Image Compressor & Resizer (Compress KB/MB, resize dimensions for WhatsApp/LinkedIn/Instagram).
11. "export": Export 1080x1080 HD JPG/PNG & Live Profile Previews (WhatsApp, LinkedIn, Facebook, Instagram preview).

Response Format Instructions:
Return a strictly valid JSON object with 2 fields:
1. "replyText": Clear, concise, encouraging markdown response (2-4 sentences max). Explain what to do or what tool to use.
2. "suggestedActions": An array of actionable shortcut button objects. Each object should have:
   - "label": Short button text (e.g. "Switch to AI Backgrounds", "Apply Auto HD", "Select Pakistan Flag DP", "Add Verified Tick")
   - "actionType": One of ["switch_tab", "apply_preset", "apply_template", "select_frame", "select_badge"]
   - "tab": Target tool tab string if switch_tab (e.g. "bgchanger", "bgremover", "enhance", "frames", "badges", "templates", "text", "shapes", "compressor")
   - "payload": Optional payload object like { "prompt": "Mountains", "preset": "auto-hd", "templateId": "pakistan-patriot", "frameId": "emerald-ring", "badgeId": "verified" }

User Query: "${message}"
Context: Current active tab is "${currentTab || "templates"}", Has user uploaded an image: ${hasImage ? "Yes" : "No"}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      res.json({
        success: true,
        replyText: parsed.replyText || "I'm here to help you design the perfect profile picture! You can use our AI Backgrounds, AI Enhancer, or Frames.",
        suggestedActions: parsed.suggestedActions || [
          { label: "Open AI Backgrounds", actionType: "switch_tab", tab: "bgchanger" },
          { label: "Enhance Photo Quality", actionType: "switch_tab", tab: "enhance" },
        ],
      });
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Failed to process AI assistant query",
      });
    }
  });

  // Vite Middleware in dev mode, static serving in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DP Web server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
