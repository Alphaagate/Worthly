import { GoogleGenAI } from "@google/genai";
import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const apiKey = Deno.env.get("GEMINI_API_KEY");

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured");
}

const ai = new GoogleGenAI({
  apiKey,
});

Deno.serve(async (req: Request) => {
  // ==================================================
  // CORS
  // ==================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    // ==================================================
    // READ REQUEST
    // ==================================================

    const body = await req.json();

    const rawImage = body?.image;

    if (!rawImage || typeof rawImage !== "string") {
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
        },
      );
    }

    // ==================================================
    // CLEAN BASE64 IMAGE
    // ==================================================

    let cleanImage = rawImage;

    if (cleanImage.includes("base64,")) {
      cleanImage = cleanImage.split("base64,")[1];
    }

    cleanImage = cleanImage.trim();

    if (!cleanImage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Image data was empty.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    console.log(
      `Received image. Base64 length: ${cleanImage.length}`,
    );

    // ==================================================
    // PROMPT
    // ==================================================

    const prompt = `
You are Worthly's product identification AI.

Analyze the image carefully and identify the object being shown.

Your job is to determine as accurately as possible:

- exact product name
- brand
- model
- category
- condition
- condition description
- visible text
- accessories
- identifying characteristics
- confidence
- estimated resale value

Pay special attention to:

- logos
- model numbers
- product numbers
- labels
- stickers
- visible text
- serial/model markings
- distinctive physical characteristics
- included accessories
- visible wear or damage

IMPORTANT:

Do NOT invent information.

If you cannot determine a field confidently,
return an empty string or empty array.

The estimated value is REQUIRED.

The confidence value must be a number from 0 to 1.

Return ONLY valid JSON.

Do not use markdown.

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
  "confidence": 0,
  "estimatedValue": {
    "min": 0,
    "max": 0,
    "average": 0,
    "currency": "USD"
  }
}
`;

    // ==================================================
    // GEMINI 3.6
    // ==================================================

    console.log("Sending image to Gemini 3.6...");

    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",

        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanImage,
            },
          },
          {
            text: prompt,
          },
        ],
      });
    } catch (geminiError) {
      console.error("================================");
      console.error("GEMINI API ERROR");
      console.error("================================");
      console.error(geminiError);

      throw new Error(
        geminiError instanceof Error
          ? `Gemini API error: ${geminiError.message}`
          : "Gemini API request failed.",
      );
    }

    // ==================================================
    // READ RESPONSE
    // ==================================================

    const text = response.text;

    if (!text) {
      throw new Error(
        "Gemini 3.6 returned an empty response.",
      );
    }

    console.log("================================");
    console.log("GEMINI RESPONSE");
    console.log("================================");
    console.log(text);

    // ==================================================
    // CLEAN JSON
    // ==================================================

    let cleanedText = text.trim();

    // Remove markdown fences if present
    cleanedText = cleanedText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Find JSON object if Gemini added surrounding text
    const firstBrace = cleanedText.indexOf("{");
    const lastBrace = cleanedText.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedText = cleanedText.substring(
        firstBrace,
        lastBrace + 1,
      );
    }

    // ==================================================
    // PARSE JSON
    // ==================================================

    let result;

    try {
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("================================");
      console.error("GEMINI JSON PARSE ERROR");
      console.error("================================");
      console.error("Raw text:");
      console.error(text);
      console.error("Cleaned text:");
      console.error(cleanedText);
      console.error(parseError);

      throw new Error(
        "Gemini returned invalid JSON.",
      );
    }

    // ==================================================
    // NORMALIZE RESULT
    // ==================================================

    const normalizedResult = {
      name: result?.name || "",
      brand: result?.brand || "",
      model: result?.model || "",
      category: result?.category || "",
      condition: result?.condition || "",

      conditionDescription:
        result?.conditionDescription || "",

      visibleText: Array.isArray(result?.visibleText)
        ? result.visibleText
        : [],

      accessories: Array.isArray(result?.accessories)
        ? result.accessories
        : [],

      identifyingDetails: Array.isArray(
        result?.identifyingDetails,
      )
        ? result.identifyingDetails
        : [],

      confidence:
        typeof result?.confidence === "number"
          ? Math.max(
              0,
              Math.min(1, result.confidence),
            )
          : 0,

      estimatedValue: {
        min:
          typeof result?.estimatedValue?.min === "number"
            ? result.estimatedValue.min
            : 0,

        max:
          typeof result?.estimatedValue?.max === "number"
            ? result.estimatedValue.max
            : 0,

        average:
          typeof result?.estimatedValue?.average ===
          "number"
            ? result.estimatedValue.average
            : 0,

        currency:
          result?.estimatedValue?.currency || "USD",
      },
    };

    // ==================================================
    // FINAL RESULT
    // ==================================================

    console.log("================================");
    console.log("WORTHLY AI ANALYSIS");
    console.log("================================");
    console.log(
      JSON.stringify(normalizedResult, null, 2),
    );

    return new Response(
      JSON.stringify({
        success: true,
        result: normalizedResult,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    // ==================================================
    // ERROR
    // ==================================================

    console.error("================================");
    console.error("WORTHLY ANALYSIS FAILED");
    console.error("================================");
    console.error(error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error occurred.";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});