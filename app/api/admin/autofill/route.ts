import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(cookieStore)
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, house } = await req.json();

    if (!name || !house) {
      return NextResponse.json({ error: 'Name and House are required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const prompt = `You are a fragrance expert API. I am providing you with a perfume name and house: "${name} by ${house}".
Please return a valid JSON object with the following fields for a master database record:
- "family": The main olfactive family (e.g. Woody, Floral, Amber).
- "character": Short description of the character (e.g. Dark, Fresh, Sweet).
- "projection": (e.g. Strong, Moderate, Intimate).
- "longevity": (e.g. 8 hours, Long lasting).
- "season_tags": Array of strings (e.g. ["Fall", "Winter"]).
- "occasion_tags": Array of strings (e.g. ["Date Night", "Evening"]).
- "top_notes": Array of strings.
- "heart_notes": Array of strings.
- "base_notes": Array of strings.
- "description": A 2-3 sentence engaging description.
- "release_year": The release year as an integer (or null if unknown).

Return ONLY the raw JSON object, without markdown formatting or code blocks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Gemini API' }, { status: response.status });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedData = JSON.parse(cleanedText);
      return NextResponse.json(parsedData);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
