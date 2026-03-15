import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/auth';
import GlobalTypeset from './GlobalTypeset';
import {
  Plus, QrCode, BarChart3, Settings, Eye, Loader2,
  MapPin, Clock, ArrowRight, Home, RefreshCw, Trash2,
  Download, ExternalLink, User
} from 'lucide-react';

interface AgentProfile {
  id: string;
  name: string;
  email: string;
  brokerage: string;
  portrait_url: string | null;
  logo_url: string | null;
  phone: string | null;
  city: string | null;
  languages: string[];
  design_partner_name: string | null;
  design_partner_url: string | null;
}

interface DashboardListing {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  hero_image: string;
  status: string;
  created_at: string;
  room_count?: number;
  design_count?: number;
  scan_count?: number;
}

function formatPrice(price: number): string {
  if (!price) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-stone-700 text-stone-300',
    scraping: 'bg-blue-900 text-blue-300',
    generating: 'bg-amber-900 text-amber-300',
    review: 'bg-purple-900 text-purple-300',
    live: 'bg-green-900 text-green-300',
    draft: 'bg-stone-800 text-stone-400',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium uppercase tracking-wider ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}

export function AgentDashboard() {
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [listings, setListings] = useState<DashboardListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'analytics' | 'branding' | 'qrcodes'>('listings');
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    loadDashboard();
    return () => { document.head.removeChild(link); };
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Load agent profile (use first agent for now)
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .limit(1)
        .single();

      if (agentData) {
        setAgent(agentData);
      }

      // Load all listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (listingsData) {
        // Enrich with room/design counts
        const enriched = await Promise.all(listingsData.map(async (l: any) => {
          const { count: roomCount } = await supabase
            .from('listing_rooms')
            .select('*', { count: 'exact', head: true })
            .eq('listing_id', l.id);

          const { count: designCount } = await supabase
            .from('listing_designs')
            .select('*', { count: 'exact', head: true })
            .eq('listing_id', l.id);

          return {
            ...l,
            room_count: roomCount || 0,
            design_count: designCount || 0,
            scan_count: l.scan_count || 0,
          };
        }));

        setListings(enriched);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateQRCodes(listingId: string) {
    setGeneratingQR(listingId);
    try {
      const res = await fetch('/api/listings/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      if (!res.ok) throw new Error('QR generation failed');
      await loadDashboard();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingQR(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-stone-400" style={{ fontFamily: 'Nunito, sans-serif' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <GlobalTypeset />

      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {agent?.portrait_url && (
              <div className="lens-circle overflow-hidden flex-shrink-0" style={{ width: 40, height: 40 }}>
                <img src={agent.portrait_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-stone-100" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {agent?.name || 'Agent Dashboard'}
              </h1>
              {agent?.brokerage && (
                <p className="text-xs text-stone-500" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {agent.brokerage}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/listing/new"
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-stone-900 font-bold text-sm hover:bg-amber-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Listing
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 flex gap-0">
          {[
            { id: 'listings' as const, label: 'Listings', icon: Home },
            { id: 'qrcodes' as const, label: 'QR Codes', icon: QrCode },
            { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
            { id: 'branding' as const, label: 'Branding', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Listings Tab ── */}
        {activeTab === 'listings' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Listings', value: listings.length },
                { label: 'Live', value: listings.filter(l => l.status === 'live').length },
                { label: 'In Review', value: listings.filter(l => l.status === 'review').length },
                { label: 'Total Designs', value: listings.reduce((s, l) => s + (l.design_count || 0), 0) },
              ].map(stat => (
                <div key={stat.label} className="border border-stone-800 bg-stone-900 p-4">
                  <div className="text-2xl font-bold text-stone-100" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-stone-500 uppercase tracking-wide mt-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Listing Cards */}
            {listings.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-stone-700">
                <Home className="w-12 h-12 mx-auto text-stone-600 mb-4" />
                <h3 className="text-lg font-semibold text-stone-300 mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  No listings yet
                </h3>
                <p className="text-stone-500 text-sm mb-6" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Paste a listing URL to create your first ZenSpace experience.
                </p>
                <Link
                  to="/listing/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-stone-900 font-bold hover:bg-amber-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Listing
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map(listing => (
                  <div
                    key={listing.id}
                    className="border border-stone-800 bg-stone-900 hover:border-stone-700 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Hero image */}
                      <div className="w-full md:w-48 h-32 md:h-auto flex-shrink-0 bg-stone-800 overflow-hidden">
                        {listing.hero_image ? (
                          <img
                            src={listing.hero_image}
                            alt={listing.address}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-8 h-8 text-stone-600" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-stone-100" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                              {listing.address}
                            </h3>
                            <p className="text-sm text-stone-500 flex items-center gap-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                              <MapPin className="w-3 h-3" />
                              {listing.city}, {listing.state}
                            </p>
                          </div>
                          {statusBadge(listing.status)}
                        </div>

                        <div className="flex gap-6 text-sm text-stone-400 mt-3 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
                          {listing.price > 0 && <span>{formatPrice(listing.price)}</span>}
                          {listing.beds > 0 && <span>{listing.beds} bed</span>}
                          {listing.baths > 0 && <span>{listing.baths} bath</span>}
                          {listing.sqft > 0 && <span>{listing.sqft.toLocaleString()} sqft</span>}
                        </div>

                        <div className="flex gap-4 text-xs text-stone-500" style={{ fontFamily: 'Nunito, sans-serif' }}>
                          <span>{listing.room_count} rooms</span>
                          <span>{listing.design_count} designs</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(listing.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Link
                            to={`/listing/${listing.id}/manage`}
                            className="px-3 py-1.5 text-xs bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors flex items-center gap-1"
                          >
                            <Settings className="w-3 h-3" />
                            Manage
                          </Link>
                          <Link
                            to={`/listing/${listing.id}`}
                            className="px-3 py-1.5 text-xs bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </Link>
                          <button
                            onClick={() => generateQRCodes(listing.id)}
                            disabled={generatingQR === listing.id}
                            className="px-3 py-1.5 text-xs bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {generatingQR === listing.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <QrCode className="w-3 h-3" />
                            )}
                            QR Codes
                          </button>
                          <a
                            href={`/listing/${listing.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Live
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── QR Codes Tab ── */}
        {activeTab === 'qrcodes' && (
          <div>
            <h2 className="text-2xl font-bold text-stone-100 mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              QR Code Center
            </h2>
            <p className="text-stone-400 text-sm mb-8" style={{ fontFamily: 'Nunito, sans-serif' }} data-no-smooth>
              Download QR codes for open house signage and Moo postcards. House QR goes on the front door and postcards. Room QRs go by each light switch.
            </p>

            {listings.filter(l => l.status === 'live' || l.status === 'review').length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-700">
                <QrCode className="w-10 h-10 mx-auto text-stone-600 mb-3" />
                <p className="text-stone-500 text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  No active listings. Create a listing first to generate QR codes.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {listings.filter(l => l.status === 'live' || l.status === 'review').map(listing => (
                  <div key={listing.id} className="border border-stone-800 bg-stone-900 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-stone-100" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                          {listing.address}
                        </h3>
                        <p className="text-xs text-stone-500">{listing.city}, {listing.state}</p>
                      </div>
                      <button
                        onClick={() => generateQRCodes(listing.id)}
                        disabled={generatingQR === listing.id}
                        className="px-4 py-2 text-sm bg-amber-600 text-stone-900 font-bold hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {generatingQR === listing.id ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                        ) : (
                          <><RefreshCw className="w-4 h-4" /> Generate QR Codes</>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-stone-600" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      QR codes will be generated as SVG files stored in Supabase. Download them for print-ready signage.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-2xl font-bold text-stone-100 mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="text-3xl font-bold text-amber-600" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {listings.reduce((s, l) => s + (l.scan_count || 0), 0)}
                </div>
                <div className="text-xs text-stone-500 uppercase tracking-wide mt-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Total QR Scans
                </div>
              </div>
              <div className="border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="text-3xl font-bold text-amber-600" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {listings.reduce((s, l) => s + (l.design_count || 0), 0)}
                </div>
                <div className="text-xs text-stone-500 uppercase tracking-wide mt-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Designs Generated
                </div>
              </div>
              <div className="border border-stone-800 bg-stone-900 p-6 text-center">
                <div className="text-3xl font-bold text-amber-600" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {listings.filter(l => l.status === 'live').length}
                </div>
                <div className="text-xs text-stone-500 uppercase tracking-wide mt-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Live Listings
                </div>
              </div>
            </div>
            <div className="border border-dashed border-stone-700 p-12 text-center">
              <BarChart3 className="w-10 h-10 mx-auto text-stone-600 mb-3" />
              <p className="text-stone-500 text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Detailed analytics coming soon. Per-listing scan tracking, room popularity, and buyer engagement data.
              </p>
            </div>
          </div>
        )}

        {/* ── Branding Tab ── */}
        {activeTab === 'branding' && (
          <div>
            <h2 className="text-2xl font-bold text-stone-100 mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Agent Branding
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profile Preview */}
              <div className="border border-stone-800 bg-stone-900 p-6">
                <h3 className="text-sm text-stone-500 uppercase tracking-wide mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Profile Preview
                </h3>
                <div className="flex items-center gap-4 mb-6">
                  {agent?.portrait_url ? (
                    <div className="lens-circle overflow-hidden flex-shrink-0" style={{ width: 64, height: 64 }}>
                      <img src={agent.portrait_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="lens-circle flex-shrink-0 bg-stone-800 flex items-center justify-center" style={{ width: 64, height: 64 }}>
                      <User className="w-6 h-6 text-stone-600" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-stone-100" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      {agent?.name || 'Your Name'}
                    </div>
                    <div className="text-sm text-stone-500" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      {agent?.brokerage || 'Your Brokerage'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-stone-600" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  This is how your branding appears on listing pages.
                </div>
              </div>

              {/* Design Partner */}
              <div className="border border-stone-800 bg-stone-900 p-6">
                <h3 className="text-sm text-stone-500 uppercase tracking-wide mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Design Partner
                </h3>
                <div className="mb-4">
                  <div className="font-bold text-stone-100" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    {agent?.design_partner_name || 'MODTAGE Design'}
                  </div>
                  <div className="text-sm text-stone-400 mt-1" style={{ fontFamily: 'Nunito, sans-serif' }}>
                    Premium interior design partner displayed on your listing pages.
                  </div>
                </div>
                <p className="text-xs text-stone-600" style={{ fontFamily: 'Nunito, sans-serif' }} data-no-smooth>
                  Buyers who scan QR codes and explore designs see a prompt to connect with your design partner for professional implementation.
                </p>
              </div>

              {/* Edit Profile */}
              <div className="border border-stone-800 bg-stone-900 p-6 md:col-span-2">
                <h3 className="text-sm text-stone-500 uppercase tracking-wide mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Update Profile
                </h3>
                <div className="flex gap-3">
                  <Link
                    to="/agent/onboard"
                    className="px-4 py-2 bg-stone-800 text-stone-300 text-sm hover:bg-stone-700 transition-colors flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Edit Profile / Generate New Portrait
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
