````typescript
import { GoogleGenAI } from "@google/genai";
import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const apiKey = Deno.env.get("GEMINI_API_KEY");

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured");
}

const ai = new GoogleGenAI({
  apiKey,
});

Deno.serve(async (req: Request) => {
  // Handle browser/app preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    const image = body.image;

    if (!image) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No image was provided.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Sending image to Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",

      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: image,
          },
        },
        {
          text: `
You are Worthly's product identification AI.

Analyze the image carefully and identify the object being shown.

Your job is to determine as accurately as possible:

- exact product name
- brand
- model
- category
- condition
- visible text
- accessories
- identifying characteristics

Pay special attention to:

- logos
- model numbers
- product numbers
- labels
- text
- serial/model markings
- distinctive physical characteristics
- size information

IMPORTANT:

Do NOT invent information.

If you cannot determine a field confidently,
return an empty string.

Return ONLY valid JSON.

Use exactly this structure:

{
  "name": "",
  "brand": "",
  "model": "",
  "category": "",
  "condition": "",
  "conditionDescription": "",
  "visibleText": [],
  "accessories": [],
  "identifyingDetails": [],
  "confidence": 0
}

The confidence value must be a number from 0 to 1.
`,
        },
      ],
    });

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    console.log("Gemini response:", text);

    // Remove markdown code fences if Gemini adds them
    const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const result = JSON.parse(cleanedText);

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Analysis error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
````
