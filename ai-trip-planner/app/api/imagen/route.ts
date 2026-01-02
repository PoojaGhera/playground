import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    // Note: Google's Imagen API requires Google Cloud setup
    // For now, we'll use a simpler alternative - Stability AI (cheap and good)
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Stability AI error' }, { status: response.status });
    }

    // Stability returns base64, we'll convert to data URL
    const base64 = data.artifacts[0].base64;
    return NextResponse.json({ url: `data:image/png;base64,${base64}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
