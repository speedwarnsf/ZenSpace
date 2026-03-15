import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import GlobalTypeset from './GlobalTypeset';

const SUPABASE_URL = 'https://vqkoxfenyjomillmxawh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tbmaJvWmkumAPUuI133fXw_JcHXJU4o';

interface Portrait {
  url: string;
  combo: Record<string, string>;
}

type Step = 'info' | 'photo' | 'generating' | 'choose' | 'complete';

export default function AgentOnboarding() {
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');

  const [originalUrl, setOriginalUrl] = useState('');
  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [agentId, setAgentId] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim()) return;
    const id = `agent-${Date.now().toString(36)}`;
    setAgentId(id);
    setStep('photo');
  };

  const processImage = async (file: File | Blob) => {
    setError('');
    setGenerating(true);
    setStep('generating');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;
      const mimeType = file.type || 'image/jpeg';

      const response = await fetch('/api/agents/portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType, agentId }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Portrait generation failed');
      }

      const data = await response.json();
      setOriginalUrl(data.original);
      setPortraits(data.portraits);
      setStep('choose');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStep('photo');
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1024, height: 1024 },
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        stopCamera();
        processImage(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleChoose = async () => {
    if (selectedIndex === null) return;
    setError('');

    const chosenUrl = selectedIndex === -1 ? originalUrl : portraits[selectedIndex]?.url;
    if (!chosenUrl) return;

    try {
      // Save agent to Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          id: agentId,
          name: name.trim(),
          company: company.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          license_number: license.trim() || null,
          portrait_url: chosenUrl,
          portrait_original_url: originalUrl,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to save profile');
      }

      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
  };

  return (
    <div
      className="min-h-screen bg-stone-900"
      style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', lineHeight: '1.5' }}
    >
      <GlobalTypeset />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="border-b border-stone-800">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <Link to="/" className="text-amber-600 hover:text-amber-500 transition-colors">
            ZenSpace
          </Link>
          <h1
            className="text-3xl md:text-4xl font-bold text-stone-100 mt-4"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Agent Onboarding
          </h1>
          <p className="text-stone-400 mt-2" style={{ fontSize: '13px' }}>
            Set up your professional profile for ZenSpace listings
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 text-red-300" style={{ fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Step 1: Info */}
        {step === 'info' && (
          <form onSubmit={handleInfoSubmit} className="space-y-6">
            <div className="text-amber-600 text-sm font-medium tracking-wide uppercase mb-6"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Your Information
            </div>

            <div>
              <label className="block text-stone-300 text-sm mb-2">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 px-4 py-3 focus:border-amber-600 focus:outline-none"
                style={{ borderRadius: 0 }}
                required
              />
            </div>

            <div>
              <label className="block text-stone-300 text-sm mb-2">Brokerage / Company *</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 px-4 py-3 focus:border-amber-600 focus:outline-none"
                style={{ borderRadius: 0 }}
                required
              />
            </div>

            <div>
              <label className="block text-stone-300 text-sm mb-2">Email</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 px-4 py-3 focus:border-amber-600 focus:outline-none"
                style={{ borderRadius: 0 }}
              />
            </div>

            <div>
              <label className="block text-stone-300 text-sm mb-2">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 px-4 py-3 focus:border-amber-600 focus:outline-none"
                style={{ borderRadius: 0 }}
              />
            </div>

            <div>
              <label className="block text-stone-300 text-sm mb-2">License Number</label>
              <input
                type="text"
                value={license}
                onChange={e => setLicense(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 text-stone-100 px-4 py-3 focus:border-amber-600 focus:outline-none"
                style={{ borderRadius: 0 }}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-3 px-6 tracking-wide uppercase transition-colors"
              style={{ borderRadius: 0 }}
            >
              Continue
            </button>
          </form>
        )}

        {/* Step 2: Photo */}
        {step === 'photo' && (
          <div className="space-y-6">
            <div className="text-amber-600 text-sm font-medium tracking-wide uppercase mb-6"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Your Portrait
            </div>

            <p className="text-stone-300" style={{ fontSize: '13px' }}>
              Upload a photo or take a selfie. We will generate three professional
              headshot options for you to choose from.
            </p>

            {showCamera ? (
              <div className="space-y-4">
                <div className="relative aspect-square max-w-sm mx-auto overflow-hidden border border-stone-700">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {/* Circle guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="border-2 border-amber-600/50"
                      style={{ width: '70%', height: '70%', borderRadius: '50%' }}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-3 px-6 tracking-wide uppercase transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    Capture
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex-1 border border-stone-600 text-stone-300 hover:text-stone-100 py-3 px-6 tracking-wide uppercase transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-stone-700 hover:border-amber-600 text-stone-300 hover:text-amber-600 py-12 px-6 transition-colors text-center"
                  style={{ borderRadius: 0 }}
                >
                  <div className="text-3xl mb-3">+</div>
                  <div className="text-sm font-medium tracking-wide uppercase">Upload Photo</div>
                </button>

                <button
                  onClick={startCamera}
                  className="border border-stone-700 hover:border-amber-600 text-stone-300 hover:text-amber-600 py-12 px-6 transition-colors text-center"
                  style={{ borderRadius: 0 }}
                >
                  <div className="text-3xl mb-3">O</div>
                  <div className="text-sm font-medium tracking-wide uppercase">Take Selfie</div>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => setStep('info')}
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
            >
              Back to info
            </button>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 'generating' && (
          <div className="text-center py-16 space-y-6">
            <div className="text-amber-600 text-sm font-medium tracking-wide uppercase"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Creating Your Portraits
            </div>

            <div className="flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-3 h-3 bg-amber-600"
                  style={{
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>

            <p className="text-stone-400" style={{ fontSize: '13px' }}>
              Generating three unique professional headshots.
              <br />
              This may take up to a minute.
            </p>
          </div>
        )}

        {/* Step 4: Choose */}
        {step === 'choose' && (
          <div className="space-y-8">
            <div className="text-amber-600 text-sm font-medium tracking-wide uppercase"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Choose Your Portrait
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Original */}
              <button
                onClick={() => setSelectedIndex(-1)}
                className="text-center space-y-3 group"
              >
                <div
                  className={`mx-auto overflow-hidden border-2 transition-colors ${
                    selectedIndex === -1 ? 'border-amber-600' : 'border-stone-700 group-hover:border-stone-500'
                  }`}
                  style={{ width: 140, height: 140, borderRadius: '50%' }}
                >
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-stone-400 text-xs uppercase tracking-wide">Original</div>
              </button>

              {/* Generated portraits */}
              {portraits.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className="text-center space-y-3 group"
                >
                  <div
                    className={`mx-auto overflow-hidden border-2 transition-colors ${
                      selectedIndex === i ? 'border-amber-600' : 'border-stone-700 group-hover:border-stone-500'
                    }`}
                    style={{ width: 140, height: 140, borderRadius: '50%' }}
                  >
                    <img
                      src={p.url}
                      alt={`Portrait ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-stone-400 text-xs uppercase tracking-wide">
                    Option {i + 1}
                  </div>
                </button>
              ))}
            </div>

            {/* Preview selected */}
            {selectedIndex !== null && (
              <div className="border border-stone-800 bg-stone-950 p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="overflow-hidden border border-stone-700 flex-shrink-0"
                    style={{ width: 64, height: 64, borderRadius: '50%' }}
                  >
                    <img
                      src={selectedIndex === -1 ? originalUrl : portraits[selectedIndex]?.url}
                      alt="Selected"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-stone-100 font-bold">{name}</div>
                    <div className="text-stone-400 text-sm">{company}</div>
                  </div>
                </div>
                <div className="mt-4 text-stone-500" style={{ fontSize: '11px' }}>
                  This is how your profile will appear on listings
                </div>
              </div>
            )}

            <button
              onClick={handleChoose}
              disabled={selectedIndex === null}
              className={`w-full font-bold py-3 px-6 tracking-wide uppercase transition-colors ${
                selectedIndex !== null
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
              style={{ borderRadius: 0 }}
            >
              Use This Portrait
            </button>

            <div className="text-center text-stone-600" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
              Portraiture and wardrobe powered by <a href="https://nudio.ai" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-400 transition-colors">nudio.ai</a>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <div className="text-center py-16 space-y-6">
            <div
              className="text-3xl font-bold text-stone-100"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}
            >
              Welcome, {name}
            </div>

            <div className="mx-auto overflow-hidden border-2 border-amber-600"
              style={{ width: 120, height: 120, borderRadius: '50%' }}>
              <img
                src={selectedIndex === -1 ? originalUrl : portraits[selectedIndex!]?.url}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-stone-400" style={{ fontSize: '13px' }}>
              Your profile is ready. You can now create listings
              with your professional portrait.
            </p>

            <div className="flex gap-4 justify-center">
              <Link
                to={`/listing/new?agent=${agentId}`}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-3 px-8 tracking-wide uppercase transition-colors inline-block"
                style={{ borderRadius: 0 }}
              >
                Create First Listing
              </Link>
            </div>

            <div className="text-stone-600" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
              Portraiture and wardrobe powered by <a href="https://nudio.ai" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-400 transition-colors">nudio.ai</a>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
