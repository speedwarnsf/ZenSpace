import { useParams, Link } from 'react-router-dom';
import { getListingById } from '../services/listingService';
import { ArrowLeft, Camera } from 'lucide-react';
import { useEffect, useState } from 'react';
import GlobalTypeset from './GlobalTypeset';
import { Listing as ListingType, ListingRoom } from '../types';

interface Listing extends ListingType {
  status: string;
}

export function RoomPage() {
  const { listingId, roomId } = useParams<{ listingId: string; roomId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) {
      setLoading(false);
      return;
    }

    getListingById(listingId).then(data => {
      setListing(data);
      setLoading(false);
    });
  }, [listingId]);

  const room = listing?.rooms.find(r => r.id === roomId);

  useEffect(() => {
    // Load Google Fonts for this page
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-stone-400">Loading room...</p>
        </div>
      </div>
    );
  }

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

  // Draft gate - only show if status is 'ready'
  if (listing.status !== 'ready') {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-serif text-stone-200 mb-4">Listing Not Yet Published</h1>
          <p className="text-stone-400 mb-6">
            This listing is still being prepared and is not yet available for public viewing.
          </p>
          {listingId && (
            <a
              href={`/listing/${listingId}/manage`}
              className="inline-block px-6 py-3 bg-amber-600 text-stone-900 font-semibold hover:bg-amber-500 transition-colors"
            >
              Go to Management Page
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900" style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', lineHeight: '1.5' }}>
      <GlobalTypeset />
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
                  <p className="text-stone-300 text-base leading-relaxed mb-4">
                    {design.description}
                  </p>

                  {/* Framework Tags */}
                  {design.frameworks && design.frameworks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {design.frameworks.map(framework => (
                        <span
                          key={framework}
                          className="px-3 py-1 bg-stone-800 text-amber-600 text-xs font-medium tracking-wide uppercase"
                        >
                          {framework}
                        </span>
                      ))}
                    </div>
                  )}
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
          <p className="text-stone-400 mb-6 max-w-2xl mx-auto" data-no-smooth>
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
          <p className="text-stone-400 leading-relaxed" data-no-smooth>
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
        <p className="max-w-6xl mx-auto px-6 text-center text-stone-500 text-sm" data-no-smooth>
          Powered by ZenSpace — AI-assisted design visualization
        </p>
      </footer>
    </div>
  );
}
