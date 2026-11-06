import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Allow payload sizes up to 25MB for high-resolution images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Google Gemini API on server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API route to scan delivery timeline image or fuel receipt
app.post('/api/scan-order', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data in request body' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel in AI Studio.'
      });
    }

    // Clean base64 string if it contains data URI prefix
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const detectedMime = mimeType || (imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');

    const prompt = `Analyze this image carefully. It is either a screenshot from a food delivery rider app (like Keeta, Deliveroo, Hungerstation, Jahez, etc.) showing order delivery milestones, or a fuel receipt/odometer.
    
Extract the exact details:
1. "Order no." / "Order ID" (e.g., "5736823099441079"):
   - Extract the entire order number in fullOrderNo.
   - Extract strictly the LAST 4 DIGITS of this order number into last4Digits (e.g. from "5736823099441079", last4Digits is "1079").
2. Milestone times:
   - "Order accepted" (e.g. "11:22") -> orderAccepted
   - "Arrived at store" (e.g. "11:22") -> arrivedAtStore
   - "Order picked up" (e.g. "11:27") -> orderPickedUp
   - "At destination" (e.g. "11:41") -> atDestination
   - "Arrived at customer" / "Delivered" (e.g. "11:42") -> arrivedAtCustomer
   - "Expected delivery time" (e.g. "11:51") -> expectedDeliveryTime
3. Format all times strictly as 24-hour "HH:mm" (e.g. "11:42", "14:05"). If AM/PM is present, convert to 24h format.
4. If a date is visible, extract it as YYYY-MM-DD.
5. If this is a fuel receipt or vehicle odometer instead, extract odometer, fuelAmount, and fuelLiters.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: detectedMime,
            data: base64Data,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING, description: "Either 'order' or 'fuel'" },
            fullOrderNo: { type: Type.STRING, description: "Full raw order number or null" },
            last4Digits: { type: Type.STRING, description: "Exactly the last 4 digits of the order number, or null" },
            orderAccepted: { type: Type.STRING, description: "Order accepted time in HH:mm, or null" },
            arrivedAtStore: { type: Type.STRING, description: "Arrived at store time in HH:mm, or null" },
            orderPickedUp: { type: Type.STRING, description: "Order picked up time in HH:mm, or null" },
            atDestination: { type: Type.STRING, description: "At destination time in HH:mm, or null" },
            arrivedAtCustomer: { type: Type.STRING, description: "Arrived at customer time in HH:mm, or null" },
            expectedDeliveryTime: { type: Type.STRING, description: "Expected delivery time in HH:mm, or null" },
            orderDate: { type: Type.STRING, description: "Date YYYY-MM-DD if visible, or null" },
            odometer: { type: Type.STRING, description: "Odometer digits if fuel reading, or null" },
            fuelAmount: { type: Type.NUMBER, description: "Fuel cost amount if receipt, or null" },
            fuelLiters: { type: Type.NUMBER, description: "Fuel liters if receipt, or null" },
          },
        },
      },
    });

    const text = response.text?.trim() || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : {};
    }

    // Ensure last4Digits fallback if fullOrderNo exists
    if (!data.last4Digits && data.fullOrderNo) {
      const digitsOnly = data.fullOrderNo.replace(/\D/g, '');
      if (digitsOnly.length >= 4) {
        data.last4Digits = digitsOnly.slice(-4);
      } else if (digitsOnly.length > 0) {
        data.last4Digits = digitsOnly;
      }
    }

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error scanning image with Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Failed to scan image',
      details: error.status || error.code || 'UNKNOWN_ERROR',
    });
  }
});

// Setup dev server with Vite middlewares or production static serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
