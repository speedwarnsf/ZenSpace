import { useParams, Link } from 'react-router-dom';
import { getListingById } from '../services/listingService';
import { Camera } from 'lucide-react';
import { useEffect, useState } from 'react';
import GlobalTypeset from './GlobalTypeset';
import { Listing as ListingType } from '../types';

interface Listing extends ListingType {
  status: string;
}

export function ListingPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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
          <p className="text-stone-400">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-stone-200 mb-4">Listing Not Found</h1>
          <p className="text-stone-400">This property could not be located.</p>
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
      {/* Hero Section */}
      <div className="relative h-[60vh] md:h-[70vh]">
        <img
          src={listing.heroImage}
          alt={listing.address}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-6xl mx-auto">
            <h1
              className="text-4xl md:text-6xl font-bold text-stone-100 mb-4"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}
            >
              {listing.address}
            </h1>
            <p className="text-stone-300 text-base md:text-lg mb-4">
              {listing.city}, {listing.state} {listing.zip}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-stone-200 text-sm md:text-base">
              <div>
                <span className="font-bold text-xl md:text-2xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  ${listing.price.toLocaleString()}
                </span>
              </div>
              <div className="h-5 w-px bg-stone-600" />
              <div>{listing.beds} bed</div>
              <div>{listing.baths} bath</div>
              <div>{listing.sqft.toLocaleString()} sqft</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Bar */}
      <div className="border-b border-stone-800 bg-stone-950">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {listing.agent.photo && (
              <img
                src={listing.agent.photo}
                alt={listing.agent.name}
                className="w-12 h-12 object-cover"
              />
            )}
            <div>
              <div className="text-stone-200 font-medium">{listing.agent.name}</div>
              <div className="text-stone-500 text-sm">{listing.agent.brokerage}</div>
            </div>
          </div>
          <div className="text-amber-600 text-sm font-medium tracking-wide" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Powered by ZenSpace
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-stone-300 leading-relaxed" style={{ textWrap: 'pretty' }}>
          {descriptionExpanded
            ? listing.description
            : `${listing.description.substring(0, 150)}${listing.description.length > 150 ? '...' : ''}`}
        </p>
        {listing.description.length > 150 && (
          <button
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="mt-3 text-amber-600 hover:text-amber-500 transition-colors font-medium"
          >
            {descriptionExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Room Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <h2
          className="text-2xl md:text-3xl font-bold text-stone-100 mb-6"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Explore Design Possibilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {listing.rooms.map(room => (
            <Link
              key={room.id}
              to={`/listing/${listing.id}/room/${room.id}`}
              className="group block bg-stone-950 border border-stone-800 overflow-hidden hover:border-amber-600 transition-colors"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={room.thumbnail}
                  alt={room.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <div className="text-stone-200 font-semibold mb-1">{room.label}</div>
                <div className="text-amber-600 text-xs">
                  {room.designs.length} design {room.designs.length === 1 ? 'direction' : 'directions'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Camera CTA */}
      <div className="border-t border-stone-800 bg-stone-950">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <h3
            className="text-2xl md:text-3xl font-bold text-stone-100 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            See it your way
          </h3>
          <p className="text-stone-400 mb-6 max-w-2xl mx-auto" data-no-smooth>
            Photograph any room from your own angle and generate personalized design directions
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-amber-600 text-stone-900 px-8 py-4 font-semibold hover:bg-amber-500 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Open ZenSpace Camera
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-8">
        <p className="max-w-6xl mx-auto px-6 text-center text-stone-500 text-sm" data-no-smooth>
          Powered by ZenSpace — AI-assisted design visualization
        </p>
      </footer>
    </div>
  );
}
