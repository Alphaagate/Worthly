import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    console.log("generate-listing received body:", body);

    const {
      itemName,
      brand,
      model,
      description,
      conditionDescription,
      estimatedValue,
      visibleText,
      accessories,
      identifyingDetails,
    } = body;

    if (!itemName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "itemName is required",
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

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured",
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are a marketplace listing assistant for an app called Worthly.

Create a high-quality marketplace listing based ONLY on the information provided.

ITEM INFORMATION:

Item name:
${itemName}

Brand:
${brand || "Unknown"}

Model:
${model || "Unknown"}

Description:
${description || "Unknown"}

Condition:
${conditionDescription || "Unknown"}

Estimated market value:
${
  estimatedValue
    ? JSON.stringify(estimatedValue)
    : "Unknown"
}

Visible text:
${
  visibleText
    ? JSON.stringify(visibleText)
    : "None"
}

Accessories:
${
  accessories
    ? JSON.stringify(accessories)
    : "None"
}

Identifying details:
${
  identifyingDetails
    ? JSON.stringify(identifyingDetails)
    : "None"
}

Create a listing suitable for platforms such as eBay and Facebook Marketplace.

IMPORTANT:
- Do not invent specifications.
- Do not claim something is authentic unless the information supports it.
- Do not exaggerate the condition.
- Keep the title concise.
- Make the description easy for a buyer to read.
- Recommend a reasonable asking price based on the estimated value.
- Explain briefly why that asking price makes sense.

Return ONLY valid JSON in this exact structure:

{
  "title": "string",
  "description": "string",
  "suggestedPrice": number,
  "priceReasoning": "string",
  "condition": "string",
  "category": "string",
  "keywords": ["string", "string", "string"]
}
`;

    console.log(
      "Sending listing request to Gemini...",
    );

    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType:
            "application/json",
        },
      });

    const text = response.text;

    console.log(
      "Gemini listing response:",
      text,
    );

    if (!text) {
      throw new Error(
        "AI returned an empty response",
      );
    }

    const listing = JSON.parse(text);

    console.log(
      "Parsed listing:",
      listing,
    );

    return new Response(
      JSON.stringify({
        success: true,
        listing,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "generate-listing error:",
      error,
    );

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
          "Content-Type":
            "application/json",
        },
      },
    );
  }
});