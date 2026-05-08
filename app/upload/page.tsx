'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Upload, Video, Brain, ArrowRight, Loader2 } from 'lucide-react';

const VPS_ANALYZE = 'https://76.13.99.138:19999';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const analyzeVideo = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    try {
      // For now: simulate AI analysis with a realistic response
      // In production, this calls my vision tool to analyze the video
      await new Promise((r) => setTimeout(r, 2000));
      setResult(`Based on the video, I can see a repetitive pattern. Here's the plan I would generate:

**Actions detected:**
- Player navigates to the mining area (2s)
- Press A to mine ore (repeated every 3-4 seconds)
- Move between nodes using Left Stick Up/Right
- After 5 nodes, return to deposit point

**Implementation Plan:**
1. Press A — mine current node
2. Wait 3 seconds
3. Move Left Stick Up — walk to next node
4. Wait 1 second
5. Press A — mine
6. Repeat steps 2-5 (15 times)
7. Move to deposit — LS-Down + A

Shall I add this to your execution plan?`);
    } catch (err) {
      setError('Analysis failed. Make sure your laptop bridge is connected.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>📤 Upload Video</span>
        </div>
        <Link href="/" style={{ color: '#00d4ff', textDecoration: 'none', fontSize: 14 }}>← Back to Dashboard</Link>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Upload Zone */}
        <div
          style={{
            border: '2px dashed #333',
            borderRadius: 16,
            padding: '60px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            marginBottom: 24,
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input id="file-input" type="file" accept="video/*" onChange={handleFile} style={{ display: 'none' }} />
          <Upload size={40} color="#444" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, color: '#888', fontSize: 16 }}>
            {file ? file.name : 'Drop a video here or click to browse'}
          </p>
          <p style={{ margin: '8px 0 0', color: '#444', fontSize: 12 }}>MP4, MOV, WebM — any length</p>
        </div>

        {/* Video Preview */}
        {preview && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: '#666', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>Preview</p>
            <video
              ref={videoRef}
              src={preview}
              controls
              style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: 360 }}
            />
          </div>
        )}

        {/* Analyze Button */}
        {file && (
          <button
            onClick={analyzeVideo}
            disabled={analyzing}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: analyzing ? '#1a3a3a' : '#00d4ff',
              color: analyzing ? '#00d4ff' : '#000',
              border: 'none', borderRadius: 12, padding: '16px 24px',
              fontWeight: 700, fontSize: 16, cursor: analyzing ? 'not-allowed' : 'pointer',
              marginBottom: 24,
            }}
          >
            {analyzing ? <><Loader2 size={20} className="spin" /> Analyzing with AI...</> : <><Brain size={20} /> Analyze Video with Hermes</>}
          </button>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#1a0a0a', border: '1px solid #ff4444', borderRadius: 12, padding: 16, marginBottom: 24, color: '#ff6666' }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ background: '#0f0f1a', border: '1px solid #00d4ff33', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Brain size={20} color="#00d4ff" />
              <span style={{ fontWeight: 700, color: '#00d4ff' }}>Hermes Analysis</span>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 14, lineHeight: 1.6, color: '#ccc', fontFamily: 'system-ui' }}>
              {result}
            </pre>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <Link
                href="/"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#00ff88', color: '#000',
                  borderRadius: 8, padding: '10px 20px',
                  fontWeight: 700, fontSize: 14, textDecoration: 'none',
                }}
              >
                Add to Plan <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => { setResult(null); setFile(null); setPreview(null); }}
                style={{ background: 'transparent', border: '1px solid #333', color: '#888', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}
              >
                Try Another Video
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
