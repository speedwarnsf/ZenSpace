import { useParams, Link } from 'react-router-dom';
import { getListingById } from '../services/listingService';
import { ArrowLeft, Camera } from 'lucide-react';
import { useEffect, useRef } from 'react';
// typeset engine removed — causing layout issues at narrow mobile measures

export function RoomPage() {
  const { listingId, roomId } = useParams<{ listingId: string; roomId: string }>();
  const listing = listingId ? getListingById(listingId) : null;
  const room = listing?.rooms.find(r => r.id === roomId);

  useEffect(() => {
    // Load Google Fonts for this page
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  if (!listing || !room) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-stone-200 mb-4">Room Not Found</h1>
          <p className="text-stone-400">This room could not be located.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to={`/listing/${listing.id}`}
            className="flex items-center gap-2 text-stone-400 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Property
          </Link>
          <div className="text-amber-600 text-sm font-medium tracking-wide" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            ZenSpace
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Room Heading */}
        <div className="mb-8">
          <h1
            className="text-4xl md:text-5xl font-bold text-stone-100 mb-2"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            {room.label}
          </h1>
          <p className="text-stone-400 text-lg">
            {listing.address}
          </p>
        </div>

        {/* Original Photo */}
        <div className="mb-12">
          <div className="text-amber-600 text-sm font-medium tracking-wide mb-3 uppercase" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            As Listed
          </div>
          <div className="bg-stone-950 border border-stone-800 p-2">
            <img
              src={room.originalPhoto}
              alt={`${room.label} - Original`}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Design Directions */}
        <div className="mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold text-stone-100 mb-8"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Design Directions
          </h2>
          <div className="space-y-12">
            {room.designs.map(design => (
              <div key={design.id} className="bg-stone-950 border border-stone-800">
                {/* Design Image */}
                <div className="p-2">
                  <img
                    src={design.imageUrl}
                    alt={design.name}
                    className="w-full h-auto"
                  />
                </div>

                {/* Design Content */}
                <div className="p-6 md:p-8 border-t border-stone-800">
                  <h3
                    className="text-2xl md:text-3xl font-bold text-stone-100 mb-3"
                    style={{ fontFamily: 'Cormorant Garamond, serif' }}
                  >
                    {design.name}
                  </h3>
                  <p className="text-stone-300 text-lg leading-relaxed mb-4" style={{ textWrap: 'balance' }}>
                    {design.description}
                  </p>

                  {/* Framework Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {design.frameworks.map(framework => (
                      <span
                        key={framework}
                        className="px-3 py-1 bg-stone-800 text-amber-600 text-xs font-medium tracking-wide uppercase"
                      >
                        {framework}
                      </span>
                    ))}
                  </div>

                  {/* Go Deeper Button */}
                  <button
                    className="w-full md:w-auto px-6 py-3 bg-stone-800 text-stone-200 font-medium hover:bg-stone-700 transition-colors"
                    onClick={() => {
                      // Placeholder - no-op for now
                    }}
                  >
                    Go Deeper
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Camera CTA */}
        <div className="border border-stone-800 bg-stone-950 p-8 md:p-12 text-center mb-12">
          <h3
            className="text-2xl md:text-3xl font-bold text-stone-100 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Capture your own angle
          </h3>
          <p className="text-stone-400 mb-6 max-w-2xl mx-auto">
            Use the ZenSpace camera to photograph this room from any perspective and generate your own personalized design directions
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-amber-600 text-stone-900 px-8 py-4 font-semibold hover:bg-amber-500 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Open Camera
          </a>
        </div>

        {/* Design Partner Block */}
        <div className="border border-stone-800 bg-stone-950 p-8 md:p-12">
          <div className="text-amber-600 text-sm font-medium tracking-wide mb-3 uppercase" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Ready for the real thing?
          </div>
          <h3
            className="text-2xl md:text-3xl font-bold text-stone-100 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Partner with a design professional
          </h3>
          <p className="text-stone-400 leading-relaxed">
            Connect with premium interior design firms in {listing.city} to bring these concepts to life.
          </p>
          <div className="mt-6">
            <button
              className="px-6 py-3 bg-stone-800 text-stone-200 font-medium hover:bg-stone-700 transition-colors"
              onClick={() => {
                // Placeholder - no-op for now
              }}
            >
              Find a Designer
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-stone-500 text-sm">
          Powered by ZenSpace — AI-assisted design visualization
        </div>
      </footer>
    </div>
  );
}
