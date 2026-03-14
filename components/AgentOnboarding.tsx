import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Check } from 'lucide-react';
import { AgentProfile } from '../types';
import { saveAgentProfile } from '../services/agentService';

const BROKERAGES = [
  'Compass',
  'Sothebys International Realty',
  'Coldwell Banker',
  'Keller Williams',
  'Douglas Elliman',
  'eXp Realty',
  'RE/MAX',
  'Other'
];

const PORTRAIT_STYLES = [
  { id: 'studio', name: 'Studio Classic', description: 'Clean backdrop, professional lighting' },
  { id: 'environmental', name: 'Environmental', description: 'Contextual setting, natural feel' },
  { id: 'editorial', name: 'Editorial', description: 'Magazine-quality, dramatic lighting' }
];

export function AgentOnboarding() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license: '',
    brokerage: '',
    customBrokerage: '',
    photoUrl: '',
    enhancedPhotoUrl: '',
    portraitStyle: 'original' as AgentProfile['portraitStyle']
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isGeneratingPortraits, setIsGeneratingPortraits] = useState(false);
  const [enhancedPhotos, setEnhancedPhotos] = useState<Record<string, string>>({});
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBrokerageSelect = (brokerage: string) => {
    setFormData(prev => ({
      ...prev,
      brokerage,
      customBrokerage: brokerage === 'Other' ? prev.customBrokerage : ''
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedPhoto(dataUrl);
        setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePortraits = async () => {
    if (!uploadedPhoto) return;

    setIsGeneratingPortraits(true);

    // Mock 3-second loading, then generate filtered versions
    await new Promise(resolve => setTimeout(resolve, 3000));

    const mockEnhanced = {
      studio: uploadedPhoto,
      environmental: uploadedPhoto,
      editorial: uploadedPhoto
    };

    setEnhancedPhotos(mockEnhanced);
    setHasGenerated(true);
    setIsGeneratingPortraits(false);
  };

  const handlePortraitSelect = (styleId: string) => {
    const selectedUrl = styleId === 'original' ? uploadedPhoto : enhancedPhotos[styleId];
    setFormData(prev => ({
      ...prev,
      portraitStyle: styleId as AgentProfile['portraitStyle'],
      enhancedPhotoUrl: selectedUrl || ''
    }));
  };

  const handleComplete = () => {
    const profile: AgentProfile = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      license: formData.license,
      brokerage: formData.brokerage === 'Other' ? formData.customBrokerage : formData.brokerage,
      customBrokerage: formData.brokerage === 'Other' ? formData.customBrokerage : undefined,
      photoUrl: formData.photoUrl,
      enhancedPhotoUrl: formData.enhancedPhotoUrl,
      portraitStyle: formData.portraitStyle,
      createdAt: Date.now()
    };

    saveAgentProfile(profile);
    navigate('/');
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.email && formData.phone && formData.license);
      case 2:
        return !!formData.brokerage && (formData.brokerage !== 'Other' || !!formData.customBrokerage);
      case 3:
        return !!uploadedPhoto;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-stone-300 text-sm font-medium mb-2">Full Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 text-stone-200 px-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
          placeholder="Enter your full name"
        />
      </div>
      <div>
        <label className="block text-stone-300 text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 text-stone-200 px-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
          placeholder="your.email@domain.com"
        />
      </div>
      <div>
        <label className="block text-stone-300 text-sm font-medium mb-2">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 text-stone-200 px-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
          placeholder="(555) 123-4567"
        />
      </div>
      <div>
        <label className="block text-stone-300 text-sm font-medium mb-2">DRE / License Number</label>
        <input
          type="text"
          value={formData.license}
          onChange={(e) => handleInputChange('license', e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 text-stone-200 px-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
          placeholder="Enter your license number"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-stone-300 text-sm font-medium mb-4">Select Your Brokerage</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BROKERAGES.map((brokerage) => (
            <button
              key={brokerage}
              onClick={() => handleBrokerageSelect(brokerage)}
              className={`p-4 text-left border transition-colors ${
                formData.brokerage === brokerage
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                  : 'border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600'
              }`}
            >
              <div className="font-medium">{brokerage}</div>
            </button>
          ))}
        </div>
        {formData.brokerage === 'Other' && (
          <div className="mt-4">
            <input
              type="text"
              value={formData.customBrokerage}
              onChange={(e) => handleInputChange('customBrokerage', e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 text-stone-200 px-4 py-3 focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="Enter brokerage name"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-stone-300 text-sm font-medium mb-4">Upload Your Professional Headshot</label>
        {!uploadedPhoto ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-700 bg-stone-800 p-8 text-center hover:border-stone-600 cursor-pointer transition-colors"
          >
            <Upload className="w-8 h-8 text-stone-400 mx-auto mb-4" />
            <p className="text-stone-300 mb-2">Click to upload or drag and drop</p>
            <p className="text-stone-500 text-sm">JPG, PNG up to 10MB</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <img
                src={uploadedPhoto}
                alt="Uploaded headshot"
                className="w-32 h-32 object-cover border border-stone-700"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 text-white text-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                Change Photo
              </button>
            </div>

            <div className="border-t border-stone-800 pt-6">
              <h3 className="text-stone-200 font-medium mb-2">Enhance with AI</h3>
              <p className="text-stone-400 text-sm mb-6">Three professional portrait styles generated from your photo</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {PORTRAIT_STYLES.map((style) => (
                  <div
                    key={style.id}
                    className={`p-4 border transition-colors cursor-pointer ${
                      hasGenerated && formData.portraitStyle === style.id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-stone-700 bg-stone-800 hover:border-stone-600'
                    }`}
                    onClick={() => hasGenerated && handlePortraitSelect(style.id)}
                  >
                    {hasGenerated ? (
                      <div className="space-y-3">
                        <img
                          src={enhancedPhotos[style.id]}
                          alt={style.name}
                          className={`w-full aspect-square object-cover ${
                            style.id === 'studio' ? 'grayscale' :
                            style.id === 'environmental' ? 'sepia' :
                            'contrast-125 brightness-110'
                          }`}
                        />
                        <div>
                          <div className="font-medium text-stone-200 text-sm">{style.name}</div>
                          <div className="text-stone-400 text-xs">{style.description}</div>
                        </div>
                      </div>
                    ) : isGeneratingPortraits ? (
                      <div className="space-y-3">
                        <div className="w-full aspect-square bg-stone-700 animate-pulse" />
                        <div>
                          <div className="font-medium text-stone-200 text-sm">{style.name}</div>
                          <div className="text-stone-400 text-xs">{style.description}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-full aspect-square bg-stone-700 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-stone-500 border-dashed" />
                        </div>
                        <div>
                          <div className="font-medium text-stone-200 text-sm">{style.name}</div>
                          <div className="text-stone-400 text-xs">{style.description}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <button
                  onClick={() => hasGenerated && handlePortraitSelect('original')}
                  className={`w-full p-3 border transition-colors ${
                    hasGenerated && formData.portraitStyle === 'original'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-stone-700 bg-stone-800 text-stone-200 hover:border-stone-600'
                  }`}
                  disabled={!hasGenerated}
                >
                  Use Original Photo
                </button>
              </div>

              {!hasGenerated && !isGeneratingPortraits && (
                <button
                  onClick={handleGeneratePortraits}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 font-medium transition-colors"
                >
                  Generate Portraits
                </button>
              )}

              {isGeneratingPortraits && (
                <div className="text-center">
                  <div className="inline-flex items-center text-amber-500">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent animate-spin mr-2" />
                    Generating portraits...
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );

  const renderStep4 = () => {
    const selectedPhotoUrl = formData.portraitStyle === 'original'
      ? uploadedPhoto
      : enhancedPhotos[formData.portraitStyle || 'studio'];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-stone-200 font-medium mb-4">Preview & Confirm</h3>
          <p className="text-stone-400 text-sm mb-6">Here's how your branding will appear on listing pages</p>

          <div className="border border-stone-700 bg-stone-800 p-6">
            <div className="flex items-center space-x-4 mb-6">
              {selectedPhotoUrl && (
                <img
                  src={selectedPhotoUrl}
                  alt="Agent photo"
                  className="w-16 h-16 object-cover"
                />
              )}
              <div>
                <div className="font-medium text-stone-200">{formData.name}</div>
                <div className="text-stone-400 text-sm">
                  {formData.brokerage === 'Other' ? formData.customBrokerage : formData.brokerage}
                </div>
              </div>
            </div>

            <div className="border-t border-stone-700 pt-4">
              <div className="text-stone-400 text-xs">Powered by ZenSpace</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-bold text-stone-100 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Agent Onboarding
          </h1>
          <p className="text-stone-400">Set up your profile for ZenSpace listing pages</p>
        </div>

        {/* Progress */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-300 text-sm font-medium">Step {currentStep} of 4</span>
            <span className="text-stone-400 text-sm">{Math.round((currentStep / 4) * 100)}% Complete</span>
          </div>
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 transition-colors ${
                  step <= currentStep ? 'bg-amber-500' : 'bg-stone-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-12">
          <h2
            className="text-2xl font-bold text-stone-100 mb-6"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            {currentStep === 1 && 'Your Information'}
            {currentStep === 2 && 'Your Brokerage'}
            {currentStep === 3 && 'Your Portrait'}
            {currentStep === 4 && 'Preview & Confirm'}
          </h2>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-6 py-3 font-medium transition-colors ${
              currentStep === 1
                ? 'text-stone-600 cursor-not-allowed'
                : 'text-stone-300 hover:text-stone-100'
            }`}
          >
            Previous
          </button>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed(currentStep)}
              className={`px-6 py-3 font-medium transition-colors ${
                canProceed(currentStep)
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-stone-700 text-stone-500 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 font-medium transition-colors"
            >
              Complete Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}