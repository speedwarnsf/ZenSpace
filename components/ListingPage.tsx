import { useParams, Link } from 'react-router-dom';
import { getListingById } from '../services/listingService';
import { Camera } from 'lucide-react';
import { useEffect } from 'react';
import GlobalTypeset from './GlobalTypeset';

export function ListingPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const listing = listingId ? getListingById(listingId) : null;

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

  return (
    <div className="min-h-screen bg-stone-900" style={{ fontFamily: 'Inter, sans-serif' }}>
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
            <p className="text-stone-300 text-lg md:text-xl mb-6">
              {listing.city}, {listing.state} {listing.zip}
            </p>
            <div className="flex items-center gap-6 text-stone-200 text-base md:text-lg">
              <div>
                <span className="font-bold text-2xl md:text-3xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  ${listing.price.toLocaleString()}
                </span>
              </div>
              <div className="h-6 w-px bg-stone-600" />
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
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-stone-300 text-lg leading-relaxed" style={{ textWrap: 'pretty' }}>
          {listing.description}
        </p>
      </div>

      {/* Room Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <h2
          className="text-3xl md:text-4xl font-bold text-stone-100 mb-8"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Explore Design Possibilities
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {listing.rooms.map(room => (
            <Link
              key={room.id}
              to={`/listing/${listing.id}/room/${room.id}`}
              className="group block bg-stone-950 border border-stone-800 overflow-hidden hover:border-amber-600 transition-colors"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={room.thumbnail}
                  alt={room.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <div className="text-stone-200 font-medium mb-1">{room.label}</div>
                <div className="text-amber-600 text-sm">
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
