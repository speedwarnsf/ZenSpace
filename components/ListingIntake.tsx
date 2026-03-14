import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import GlobalTypeset from './GlobalTypeset';

export function ListingIntake() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentBrokerage, setAgentBrokerage] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      return;
    }

    setStatus('processing');
    setProgress('Starting intake...');
    setErrorMessage('');

    try {
      const response = await fetch('/api/listings/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.trim(),
          agent: {
            name: agentName.trim() || undefined,
            email: agentEmail.trim() || undefined,
            phone: agentPhone.trim() || undefined,
            brokerage: agentBrokerage.trim() || undefined
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process listing');
      }

      const data = await response.json();

      // Redirect to the manage page (designs generated there)
      navigate(`${data.url}/manage`);
    } catch (error) {
      console.error('Intake error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process listing');
    }
  };

  return (
    <div className="min-h-screen bg-stone-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <a href="/" className="text-amber-600 text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            ZenSpace
          </a>
          <p className="text-stone-400 mt-2">AI interior design for real estate</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1
            className="text-4xl md:text-5xl font-bold text-stone-100 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            New Listing Intake
          </h1>
          <p className="text-stone-400 text-lg">
            Paste a Compass listing URL to generate AI design visualizations for every room.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label htmlFor="url" className="block text-stone-200 font-medium mb-2">
              Listing URL <span className="text-amber-600">*</span>
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.compass.com/homedetails/..."
              required
              disabled={status === 'processing'}
              className="w-full px-4 py-3 bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 focus:border-amber-600 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Optional Agent Info */}
          <div className="border-t border-stone-800 pt-6">
            <h2 className="text-xl font-bold text-stone-200 mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Agent Information <span className="text-stone-500 text-sm font-normal">(Optional)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="agent-name" className="block text-stone-300 text-sm mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="agent-name"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  disabled={status === 'processing'}
                  className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 focus:border-amber-600 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="agent-email" className="block text-stone-300 text-sm mb-2">
                  Email
                </label>
                <input
                  type="text"
                  id="agent-email"
                  value={agentEmail}
                  onChange={e => setAgentEmail(e.target.value)}
                  disabled={status === 'processing'}
                  className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 focus:border-amber-600 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="agent-phone" className="block text-stone-300 text-sm mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  id="agent-phone"
                  value={agentPhone}
                  onChange={e => setAgentPhone(e.target.value)}
                  disabled={status === 'processing'}
                  className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 focus:border-amber-600 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="agent-brokerage" className="block text-stone-300 text-sm mb-2">
                  Brokerage
                </label>
                <input
                  type="text"
                  id="agent-brokerage"
                  value={agentBrokerage}
                  onChange={e => setAgentBrokerage(e.target.value)}
                  disabled={status === 'processing'}
                  className="w-full px-4 py-2 bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 focus:border-amber-600 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={status === 'processing' || !url.trim()}
              className="w-full md:w-auto px-8 py-4 bg-amber-600 text-stone-900 font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'processing' ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Process Listing
                </>
              )}
            </button>
          </div>

          {/* Progress/Status */}
          {status === 'processing' && progress && (
            <div className="bg-stone-950 border border-stone-800 p-4">
              <p className="text-stone-300">{progress}</p>
              <p className="text-stone-500 text-sm mt-2">
                This may take several minutes. The page will redirect when complete.
              </p>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <div className="bg-red-950 border border-red-800 p-4">
              <p className="text-red-300 font-medium">Error</p>
              <p className="text-red-200 text-sm mt-1">{errorMessage}</p>
            </div>
          )}
        </form>

        {/* Info Box */}
        <div className="mt-12 bg-stone-950 border border-stone-800 p-6">
          <h3 className="text-lg font-bold text-stone-200 mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            How it works
          </h3>
          <ol className="text-stone-400 space-y-2 text-sm">
            <li>1. We scrape all photos from the Compass listing</li>
            <li>2. AI labels each room type (Living Room, Kitchen, etc.)</li>
            <li>3. For each room, we generate 5 unique design directions</li>
            <li>4. You get a shareable URL with all designs ready to view</li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-8 mt-12">
        <p data-no-smooth className="max-w-4xl mx-auto px-6 text-center text-stone-500 text-sm">
          Powered by ZenSpace — AI-assisted design visualization
        </p>
      </footer>

      <GlobalTypeset />
    </div>
  );
}
