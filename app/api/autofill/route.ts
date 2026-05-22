import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const { name, brand, isLiquidDeo } = await req.json();

    if (!name || !brand) {
      return NextResponse.json(
        { error: 'Name and Brand are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const autoFillLimit = await checkRateLimit({
      endpoint: 'admin:autofill:hourly',
      identifier: user.id,
      maxRequests: 30,
      windowMinutes: 60
    });

    if (!autoFillLimit.allowed) {
      return NextResponse.json(
        { error: 'Auto-fill limit reached. Wait before fetching more.' },
        { status: 429 }
      );
    }

    // Deliverable 3d: Check master_fragrances first
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: masterMatch } = await supabaseAdmin
      .from('master_fragrances')
      .select('*')
      .ilike('name', name.trim())
      .ilike('house', brand.trim())
      .maybeSingle();

    if (masterMatch) {
      return NextResponse.json({
        category: masterMatch.family || 'Designer',
        occasion: masterMatch.occasion_tags?.[0] || 'Everyday',
        notes: `Top: ${masterMatch.top_notes?.join(', ')}. Heart: ${masterMatch.heart_notes?.join(', ')}. Base: ${masterMatch.base_notes?.join(', ')}`,
        concentration: 'Eau de Parfum',
        rating: 4.5,
        longevity_hours: parseInt(masterMatch.longevity) || 8,
        ideal_season: masterMatch.season_tags?.[0] || 'Fall'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server' },
        { status: 500 }
      );
    }

    let prompt = `You are a fragrance expert API. I am providing you with a perfume name and brand: "${name} by ${brand}".
Please return a valid JSON object with EXACTLY seven keys: "category", "occasion", "notes", "concentration", "rating", "longevity_hours", and "ideal_season".
1. "category": Must be one of exactly these: "Niche", "Designer", "Middle Eastern", "Mass Produced", "Clones", or "Other".
2. "occasion": Must be one of exactly these: "Date Night", "Meeting", "Casual", "Evening", "Office", "Party", "Gym", "Clubbing", "Formal", "Vacation", "Wedding", or "Everyday".
3. "notes": A single string listing the full breakdown of notes including Top, Heart/Middle, and Base notes (e.g., "Top: Bergamot, Lemon. Heart: Rose, Jasmine. Base: Vanilla, Oud").
4. "concentration": The concentration of the perfume, such as "Eau de Parfum", "Eau de Toilette", "Parfum", "Extrait de Parfum", or "Cologne".
5. "rating": A number from 0 to 5 (with one decimal) representing overall community reception (e.g., 4.2).
6. "longevity_hours": A whole number estimating how many hours the fragrance lasts on skin (e.g., 8).
7. "ideal_season": Must be one of exactly these: "Spring", "Summer", "Fall", or "Winter".

Return ONLY the raw JSON object, without markdown formatting or code blocks.`;

    if (isLiquidDeo) {
      prompt = `You are a fragrance expert API. I am providing you with a liquid deodorant name and brand: "${name} by ${brand}".
Please return a valid JSON object with EXACTLY seven keys: "category", "occasion", "notes", "concentration", "rating", "longevity_hours", and "ideal_season".
1. "category": "Liquid Deodorants".
2. "occasion": Must be one of exactly these: "Date Night", "Meeting", "Casual", "Evening", "Office", "Party", "Gym", "Clubbing", "Formal", "Vacation", "Wedding", or "Everyday".
3. "notes": A single string listing ONLY the dry down / base notes of the original perfume it is based on (e.g., "Base: Vanilla, Oud, Musk"). Do NOT include Top or Heart notes.
4. "concentration": "Deodorant" or "Body Spray".
5. "rating": A number from 0 to 5.
6. "longevity_hours": A whole number estimating how many hours the deodorant lasts (e.g., 4).
7. "ideal_season": Must be one of exactly these: "Spring", "Summer", "Fall", or "Winter".

Return ONLY the raw JSON object, without markdown formatting or code blocks.`;
    }

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
      let errMsg = 'Failed to fetch from Gemini API';
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      } catch {
        // ignore JSON parse error
      }
      return NextResponse.json(
        { error: errMsg },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean up potential markdown formatting (e.g. ```json\n...\n```)
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsedData = JSON.parse(cleanedText);
      return NextResponse.json(parsedData);
    } catch {
      console.error('Failed to parse Gemini response as JSON:', cleanedText);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

  } catch (err: unknown) {
    console.error('AutoFill Route Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
