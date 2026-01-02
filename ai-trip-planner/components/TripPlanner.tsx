'use client';
import React, { useState } from 'react';

interface Attraction { 
  name: string; 
  description: string; 
  imagePrompt: string;
}

interface TripBrief { 
  destination: string; 
  destinationInfo: string; 
  destinationImagePrompt: string;
  popularSpots: Attraction[]; 
  kidFriendly: string; 
  bestTimeToVisit: string; 
}

interface Metrics { 
  latencyMs: number; 
  inputTokens: number | string; 
  outputTokens: number | string; 
  provider: string; 
  model: string; 
}

interface ApiResponse { 
  tripBrief: TripBrief; 
  destinationImage: string;
  attractionImages: string[];
  metrics: Metrics; 
  error?: string; 
}

const TripPlannerApp = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ 
    anthropic?: ApiResponse; 
    openai?: ApiResponse; 
    gemini?: ApiResponse; 
  }>({});
  const [selectedBest, setSelectedBest] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');

  const validateInput = (text: string): boolean => {
    const hasDestination = text.length > 10;
    const hasPeopleCount = /\d+\s*(people|person|traveler|adult|child)/i.test(text) || /(solo|alone|myself|family|couple|group)/i.test(text);
    const hasAgeInfo = /(age|years old|kid|child|adult|senior|teenager|toddler|infant)/i.test(text);
    
    if (!hasDestination) { 
      setValidationError('Please provide more details about your destination.'); 
      return false; 
    }
    if (!hasPeopleCount) { 
      setValidationError('Please tell us how many people are traveling.'); 
      return false; 
    }
    if (!hasAgeInfo) { 
      setValidationError('Please mention the age groups of travelers.'); 
      return false; 
    }
    
    setValidationError(''); 
    return true;
  };

  const callAnthropicAPI = async (userInput: string): Promise<ApiResponse> => {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/anthropic', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: 'claude-sonnet-4-20250514', 
          max_tokens: 2500, 
          messages: [{ 
            role: 'user', 
            content: 'Based on: "' + userInput + '". Respond with ONLY valid JSON: {"destination":"name","destinationInfo":"description","destinationImagePrompt":"detailed image description for the destination (for AI image generation)","popularSpots":[{"name":"attraction name","description":"2-3 sentences","imagePrompt":"detailed description for generating an image of this specific attraction"}],"kidFriendly":"yes/no","bestTimeToVisit":"season"}. Provide exactly 10 attractions. For imagePrompt, write detailed descriptions like "photograph of the Eiffel Tower at sunset with tourists" - be specific and descriptive.' 
          }] 
        })
      });
      
      const data = await response.json();
      const latencyMs = Math.round(performance.now() - startTime);
      
      if (!response.ok) throw new Error(data.error?.message || 'Anthropic API error');
      
      const text = data.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const tripBrief = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      
      // Use LoremFlickr as cheap placeholder for Anthropic
      const destinationImage = `https://loremflickr.com/800/600/${encodeURIComponent(tripBrief.destination)}`;
      const attractionImages = tripBrief.popularSpots.map((spot: Attraction) => 
        `https://loremflickr.com/600/400/${encodeURIComponent(spot.name)}`
      );
      
      return { 
        tripBrief,
        destinationImage,
        attractionImages,
        metrics: { 
          latencyMs, 
          inputTokens: data.usage?.input_tokens || 'N/A', 
          outputTokens: data.usage?.output_tokens || 'N/A', 
          provider: 'Anthropic', 
          model: 'Claude Sonnet 4 (LoremFlickr)' 
        } 
      };
    } catch (error: any) {
      return { 
        tripBrief: {} as TripBrief,
        destinationImage: '',
        attractionImages: [],
        metrics: { 
          latencyMs: Math.round(performance.now() - startTime), 
          inputTokens: 'N/A', 
          outputTokens: 'N/A', 
          provider: 'Anthropic', 
          model: 'Claude Sonnet 4' 
        }, 
        error: error.message 
      };
    }
  };

  const callOpenAIAPI = async (userInput: string): Promise<ApiResponse> => {
    const startTime = performance.now();
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI key not configured');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({ 
          model: 'gpt-4o', 
          messages: [{ 
            role: 'user', 
            content: 'Based on: "' + userInput + '". Respond with ONLY valid JSON: {"destination":"name","destinationInfo":"description","destinationImagePrompt":"detailed DALL-E prompt for destination (be specific about style, lighting, perspective)","popularSpots":[{"name":"attraction name","description":"2-3 sentences","imagePrompt":"detailed DALL-E prompt for this specific attraction"}],"kidFriendly":"yes/no","bestTimeToVisit":"season"}. Provide exactly 10 attractions. Write image prompts optimized for DALL-E 3: be detailed, descriptive, specify artistic style if desired.' 
          }], 
          temperature: 0.7 
        })
      });
      
      const data = await response.json();
      const latencyMs = Math.round(performance.now() - startTime);
      
      if (!response.ok) throw new Error(data.error?.message || 'API error');
      
      const text = data.choices[0].message.content;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const tripBrief = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      
      // Generate destination image with DALL-E
      console.log('Generating destination image with DALL-E...');
      const destImgResponse = await fetch('/api/dalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: tripBrief.destinationImagePrompt })
      });
      const destImgData = await destImgResponse.json();
      const destinationImage = destImgData.url || 'https://via.placeholder.com/800x600?text=Image+Generation+Failed';
      
      // Generate attraction images (limit to first 3 for speed/cost)
      console.log('Generating attraction images with DALL-E...');
      const attractionImages: string[] = [];
      for (let i = 0; i < Math.min(3, tripBrief.popularSpots.length); i++) {
        const spot = tripBrief.popularSpots[i];
        const imgResponse = await fetch('/api/dalle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: spot.imagePrompt })
        });
        const imgData = await imgResponse.json();
        attractionImages.push(imgData.url || 'https://via.placeholder.com/600x400?text=Failed');
      }
      
      // Use placeholders for remaining attractions
      for (let i = 3; i < tripBrief.popularSpots.length; i++) {
        attractionImages.push(`https://picsum.photos/seed/${tripBrief.popularSpots[i].name}/600/400`);
      }
      
      return { 
        tripBrief,
        destinationImage,
        attractionImages,
        metrics: { 
          latencyMs, 
          inputTokens: data.usage?.prompt_tokens || 'N/A', 
          outputTokens: data.usage?.completion_tokens || 'N/A', 
          provider: 'OpenAI', 
          model: 'GPT-4o + DALL-E 3' 
        } 
      };
    } catch (error: any) {
      return { 
        tripBrief: {} as TripBrief,
        destinationImage: '',
        attractionImages: [],
        metrics: { 
          latencyMs: Math.round(performance.now() - startTime), 
          inputTokens: 'N/A', 
          outputTokens: 'N/A', 
          provider: 'OpenAI', 
          model: 'GPT-4o' 
        }, 
        error: error.message 
      };
    }
  };

  const callGeminiAPI = async (userInput: string): Promise<ApiResponse> => {
    const startTime = performance.now();
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini key not configured');
      
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ 
              text: 'Based on: "' + userInput + '". JSON only: {"destination":"name","destinationInfo":"description","destinationImagePrompt":"detailed prompt for Stability AI image generation","popularSpots":[{"name":"attraction","description":"2-3 sentences","imagePrompt":"detailed prompt for image generation"}],"kidFriendly":"yes/no","bestTimeToVisit":"season"}. 10 attractions. Write prompts for Stability AI: detailed, specific, photographic style.' 
            }] 
          }] 
        })
      });
      
      const data = await response.json();
      const latencyMs = Math.round(performance.now() - startTime);
      
      if (!response.ok) throw new Error(data.error?.message || 'API error');
      
      const text = data.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const tripBrief = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      
      // Generate destination image with Stability AI
      console.log('Generating destination image with Stability AI...');
      const destImgResponse = await fetch('/api/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: tripBrief.destinationImagePrompt })
      });
      const destImgData = await destImgResponse.json();
      const destinationImage = destImgData.url || 'https://via.placeholder.com/800x600?text=Image+Failed';
      
      // Generate first 3 attraction images
      const attractionImages: string[] = [];
      for (let i = 0; i < Math.min(3, tripBrief.popularSpots.length); i++) {
        const spot = tripBrief.popularSpots[i];
        const imgResponse = await fetch('/api/imagen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: spot.imagePrompt })
        });
        const imgData = await imgResponse.json();
        attractionImages.push(imgData.url || 'https://via.placeholder.com/600x400?text=Failed');
      }
      
      // Placeholders for rest
      for (let i = 3; i < tripBrief.popularSpots.length; i++) {
        attractionImages.push(`https://picsum.photos/600/400?random=${i}`);
      }
      
      return { 
        tripBrief,
        destinationImage,
        attractionImages,
        metrics: { 
          latencyMs, 
          inputTokens: data.usageMetadata?.promptTokenCount || '~250', 
          outputTokens: data.usageMetadata?.candidatesTokenCount || '~800', 
          provider: 'Google', 
          model: 'Gemini 2.5 + Stability AI' 
        } 
      };
    } catch (error: any) {
      return { 
        tripBrief: {} as TripBrief,
        destinationImage: '',
        attractionImages: [],
        metrics: { 
          latencyMs: Math.round(performance.now() - startTime), 
          inputTokens: 'N/A', 
          outputTokens: 'N/A', 
          provider: 'Google', 
          model: 'Gemini 2.5' 
        }, 
        error: error.message 
      };
    }
  };

  const handleSubmit = async () => {
    if (!validateInput(input)) return;
    
    setLoading(true); 
    setResults({}); 
    setSelectedBest(null);
    
    const [anthropicResult, openaiResult, geminiResult] = await Promise.all([
      callAnthropicAPI(input), 
      callOpenAIAPI(input), 
      callGeminiAPI(input)
    ]);
    
    setResults({ 
      anthropic: anthropicResult, 
      openai: openaiResult, 
      gemini: geminiResult 
    });
    
    setLoading(false);
  };

  const ResultCard = ({ result, provider }: { result: ApiResponse; provider: string }) => {
    if (result.error) {
      return (
        <div style={styles.card}>
          <h3 style={styles.providerTitle}>{result.metrics.provider}</h3>
          <div style={styles.errorBox}>
            <p style={styles.errorText}>Error: {result.error}</p>
          </div>
        </div>
      );
    }
    
    const { tripBrief, destinationImage, attractionImages, metrics } = result;
    
    return (
      <div style={styles.card}>
        <h3 style={styles.providerTitle}>{metrics.provider}</h3>
        
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Destination</h4>
          <img src={destinationImage} alt={tripBrief.destination} style={styles.destImage} />
          <p style={styles.destName}>{tripBrief.destination}</p>
          <p style={styles.text}>{tripBrief.destinationInfo}</p>
        </div>
        
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Top 10 Spots</h4>
          {tripBrief.popularSpots?.map((spot, i) => (
            <div key={i} style={styles.spotCard}>
              <img src={attractionImages[i]} alt={spot.name} style={styles.spotImage} />
              <div style={styles.spotContent}>
                <h5 style={styles.spotName}>{i + 1}. {spot.name}</h5>
                <p style={styles.spotDesc}>{spot.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Kid Friendly?</h4>
          <p style={styles.text}>{tripBrief.kidFriendly}</p>
        </div>
        
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Best Time</h4>
          <p style={styles.text}>{tripBrief.bestTimeToVisit}</p>
        </div>
        
        <div style={styles.metricsBox}>
          <h4>Metrics</h4>
          <div style={styles.metricsGrid}>
            <div><span>Latency:</span> <b>{metrics.latencyMs}ms</b></div>
            <div><span>Input:</span> <b>{metrics.inputTokens}</b></div>
            <div><span>Output:</span> <b>{metrics.outputTokens}</b></div>
            <div><span>Model:</span> <b>{metrics.model}</b></div>
          </div>
        </div>
        
        <button 
          onClick={() => setSelectedBest(provider)} 
          style={{
            ...styles.ratingButton, 
            ...(selectedBest === provider ? styles.selected : {})
          }}
        >
          {selectedBest === provider ? '✓ Best' : 'Select Best'}
        </button>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>AI Trip Planner</h1>
        <p style={styles.subtitle}>Compare 3 AI providers with image generation</p>
      </div>
      
      <div style={styles.inputSection}>
        <label style={styles.label}>Tell us about your travel</label>
        <textarea 
          value={input} 
          onChange={(e) => { 
            setInput(e.target.value); 
            setValidationError(''); 
          }} 
          placeholder="I want to visit Paris with my family of 4 (2 adults, 2 kids ages 7 and 10)..." 
          style={styles.textarea} 
          rows={4} 
        />
        {validationError && <p style={styles.validationError}>{validationError}</p>}
        <button 
          onClick={handleSubmit} 
          disabled={loading || !input.trim()} 
          style={{
            ...styles.button, 
            ...(loading || !input.trim() ? styles.buttonDisabled : {})
          }}
        >
          {loading ? 'Generating (this may take 30-60 seconds)...' : 'Go'}
        </button>
      </div>
      
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Generating AI images and trip plans... This takes about 30-60 seconds.</p>
        </div>
      )}
      
      {Object.keys(results).length > 0 && !loading && (
        <div style={styles.resultsGrid}>
          {results.anthropic && <ResultCard result={results.anthropic} provider="anthropic" />}
          {results.openai && <ResultCard result={results.openai} provider="openai" />}
          {results.gemini && <ResultCard result={results.gemini} provider="gemini" />}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f7', padding: '40px 20px', fontFamily: '-apple-system, sans-serif' },
  header: { textAlign: 'center' as const, marginBottom: '40px' },
  title: { fontSize: '48px', fontWeight: '600', color: '#1d1d1f', margin: '0 0 12px 0' },
  subtitle: { fontSize: '18px', color: '#6e6e73', margin: 0 },
  inputSection: { maxWidth: '800px', margin: '0 auto 40px', backgroundColor: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  label: { display: 'block', fontSize: '20px', fontWeight: '600', color: '#1d1d1f', marginBottom: '16px' },
  textarea: { width: '100%', padding: '16px', fontSize: '16px', border: '1px solid #d2d2d7', borderRadius: '12px', fontFamily: 'inherit', boxSizing: 'border-box' as const },
  validationError: { color: '#ff3b30', fontSize: '14px', marginTop: '8px' },
  button: { marginTop: '16px', padding: '14px', fontSize: '17px', fontWeight: '500', backgroundColor: '#0071e3', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', width: '100%' },
  buttonDisabled: { backgroundColor: '#d2d2d7', cursor: 'not-allowed' },
  loadingContainer: { textAlign: 'center' as const, padding: '60px 20px' },
  spinner: { width: '40px', height: '40px', border: '3px solid #f0f0f0', borderTop: '3px solid #0071e3', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', maxWidth: '1600px', margin: '0 auto' },
  card: { backgroundColor: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  providerTitle: { fontSize: '24px', fontWeight: '600', color: '#1d1d1f', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' },
  section: { marginBottom: '32px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#6e6e73', marginBottom: '16px', textTransform: 'uppercase' as const },
  destImage: { width: '100%', borderRadius: '12px', marginBottom: '16px' },
  destName: { fontSize: '22px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' },
  text: { fontSize: '16px', lineHeight: '1.5', color: '#1d1d1f' },
  spotCard: { border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' },
  spotImage: { width: '100%', height: '200px', objectFit: 'cover' as const },
  spotContent: { padding: '16px' },
  spotName: { fontSize: '17px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' },
  spotDesc: { fontSize: '14px', lineHeight: '1.5', color: '#6e6e73' },
  metricsBox: { backgroundColor: '#f5f5f7', borderRadius: '12px', padding: '16px', marginBottom: '20px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' },
  ratingButton: { width: '100%', padding: '12px', fontSize: '15px', fontWeight: '500', backgroundColor: 'white', color: '#0071e3', border: '1px solid #0071e3', borderRadius: '10px', cursor: 'pointer' },
  selected: { backgroundColor: '#0071e3', color: 'white' },
  errorBox: { backgroundColor: '#fff5f5', border: '1px solid #ff3b30', borderRadius: '12px', padding: '20px' },
  errorText: { color: '#ff3b30', fontSize: '15px', fontWeight: '500' }
};

export default TripPlannerApp;
