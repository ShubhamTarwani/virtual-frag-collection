import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { groups, filterMode } = await req.json();

    if (!groups || !Array.isArray(groups) || !filterMode) {
      return NextResponse.json(
        { error: 'Groups array and filterMode are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    const prompt = `You are a fragrance collection sorting API. 
I have a list of perfume groups categorised by "${filterMode}". 
The groups are: ${JSON.stringify(groups)}.
Please sort these groups into a logical, aesthetic order.
- For "Type" (Niche, Designer, etc.), sort from highest prestige/exclusivity to lowest.
- For "Occasion" (Date Night, Office, etc.), sort from most formal/intimate to most casual/everyday.
- For "Smell" or "Notes", sort from lightest/freshest (e.g. Citrus, Fresh) to heaviest/darkest (e.g. Oud, Leather, Gourmand).
- If "Other" is in the list, always put it at the very end.

Return ONLY a valid JSON array of strings representing the sorted order. No markdown, no code blocks, just the raw JSON array.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch from Gemini API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean up markdown
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedData = JSON.parse(cleanedText);
      if (!Array.isArray(parsedData)) throw new Error("Expected array");
      return NextResponse.json({ sortedGroups: parsedData });
    } catch (parseError: unknown) {
      console.error('Failed to parse Gemini response as JSON array:', cleanedText);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

  } catch (err: unknown) {
    console.error('AutoSort Route Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
