import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Moon, Sun, Share2, Volume2, VolumeX, RefreshCw, Filter, BarChart2 } from 'lucide-react';
import './App.css';

const EarthquakeApp = () => {
  const [earthquakes, setEarthquakes] = useState([]);
  const [filteredEarthquakes, setFilteredEarthquakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [minMagnitude, setMinMagnitude] = useState(2.5);
  const [timeRange, setTimeRange] = useState('day');
  const [activeView, setActiveView] = useState('cards');
  const [stats, setStats] = useState({ total: 0, max: 0, recent: 0 });
  const [selectedEarthquake, setSelectedEarthquake] = useState(null);
  const audioRef = useRef(null);
  const notifiedIds = useRef(new Set());

  // API endpoints
  const getApiUrl = () => {
    const endpoints = {
      hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
      day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
      month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson'
    };
    return endpoints[timeRange];
  };

  // Fetch earthquake data
  const fetchEarthquakes = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try with CORS proxy
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const response = await fetch(proxyUrl + encodeURIComponent(getApiUrl()));
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      
      if (data.features) {
        const quakes = data.features.map(eq => ({
          id: eq.id,
          magnitude: eq.properties.mag || 0,
          place: eq.properties.place || 'Unknown',
          time: new Date(eq.properties.time),
          lat: eq.geometry.coordinates[1],
          lng: eq.geometry.coordinates[0],
          depth: eq.geometry.coordinates[2],
          type: eq.properties.type,
          url: eq.properties.url
        })).filter(eq => eq.magnitude > 0);

        setEarthquakes(quakes);
        
        // Check for new significant earthquakes
        quakes.forEach(eq => {
          if (eq.magnitude >= 5.0 && !notifiedIds.current.has(eq.id)) {
            notifiedIds.current.add(eq.id);
            playAlert();
            showNotification(eq);
          }
        });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to fetch live data. Using demo data.');
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  // Load demo data if API fails
  const loadDemoData = () => {
    const locations = [
      { name: '15km NW of Los Angeles, CA', lat: 34.05, lng: -118.25 },
      { name: 'Off the coast of Japan', lat: 36.20, lng: 138.25 },
      { name: 'Indonesia region', lat: -2.55, lng: 118.01 },
      { name: 'Near Santiago, Chile', lat: -33.45, lng: -70.66 },
      { name: 'South of Alaska', lat: 60.71, lng: -151.35 },
      { name: 'Central Italy', lat: 42.83, lng: 13.10 },
      { name: 'New Zealand', lat: -41.28, lng: 174.77 },
      { name: 'Philippines', lat: 12.87, lng: 121.77 }
    ];

    const demoData = Array.from({ length: 30 }, (_, i) => {
      const location = locations[i % locations.length];
      return {
        id: `demo_${i}`,
        magnitude: parseFloat((Math.random() * 5 + 2).toFixed(1)),
        place: location.name,
        time: new Date(Date.now() - Math.random() * 86400000),
        lat: location.lat + (Math.random() - 0.5) * 2,
        lng: location.lng + (Math.random() - 0.5) * 2,
        depth: parseFloat((Math.random() * 100).toFixed(1)),
        type: 'earthquake',
        url: '#'
      };
    });
    setEarthquakes(demoData);
  };

  // Filter earthquakes
  useEffect(() => {
    const filtered = earthquakes.filter(eq => eq.magnitude >= minMagnitude);
    filtered.sort((a, b) => b.time - a.time);
    setFilteredEarthquakes(filtered);

    // Calculate stats
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    setStats({
      total: filtered.length,
      max: filtered.length > 0 ? Math.max(...filtered.map(e => e.magnitude)) : 0,
      recent: filtered.filter(e => e.time > tenMinsAgo).length
    });
  }, [earthquakes, minMagnitude]);

  // Auto refresh
  useEffect(() => {
    fetchEarthquakes();
    const interval = setInterval(fetchEarthquakes, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Play alert sound
  const playAlert = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  // Show browser notification
  const showNotification = (eq) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🚨 M${eq.magnitude} Earthquake`, {
        body: eq.place,
        icon: '🌍'
      });
    }
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Get magnitude color
  const getMagnitudeColor = (mag) => {
    if (mag >= 7) return darkMode ? '#dc2626' : '#991b1b';
    if (mag >= 6) return darkMode ? '#ea580c' : '#c2410c';
    if (mag >= 5) return darkMode ? '#f59e0b' : '#d97706';
    if (mag >= 4) return darkMode ? '#eab308' : '#ca8a04';
    return darkMode ? '#84cc16' : '#65a30d';
  };

  // Time ago helper
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Chart data
  const getChartData = () => {
    const hourly = {};
    filteredEarthquakes.forEach(eq => {
      const hour = eq.time.getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });
    return Object.keys(hourly).sort((a, b) => a - b).map(h => ({
      hour: `${h}:00`,
      count: hourly[h]
    }));
  };

  const getMagnitudeDistribution = () => {
    const ranges = { '2-3': 0, '3-4': 0, '4-5': 0, '5-6': 0, '6+': 0 };
    filteredEarthquakes.forEach(eq => {
      const mag = parseFloat(eq.magnitude);
      if (mag < 3) ranges['2-3']++;
      else if (mag < 4) ranges['3-4']++;
      else if (mag < 5) ranges['4-5']++;
      else if (mag < 6) ranges['5-6']++;
      else ranges['6+']++;
    });
    return Object.keys(ranges).map(r => ({ range: r, count: ranges[r] }));
  };

  // Share function
  const handleShare = () => {
    const text = `🌍 Earthquake Alert: ${stats.total} earthquakes detected. Highest magnitude: ${stats.max.toFixed(1)}`;
    if (navigator.share) {
      navigator.share({ title: 'Earthquake Alert', text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-500 to-indigo-600';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300 p-4`}>
      {/* Audio element */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizkHFmm98OScTQwOUKzn77RgGgU7k9r0yoQtBSF7zPLaizsIG2S57uihUBELTKXh8bllHAU2jdT0zoYvBSF7zPLaizsIG2S57uihUBELTKXh8bllHAU2jdT0zoYvBSF7zPLaizsIG2S57uihUBELTKXh8bllHAU2jdT0zoYvBQ==" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className={`${cardBg} rounded-2xl shadow-2xl p-6 mb-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl animate-pulse">🌍</span>
              <div>
                <h1 className={`text-3xl font-bold ${textColor}`}>Earthquake Monitor</h1>
                <p className={textSecondary}>Real-time global seismic activity</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition`}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={handleShare}
                className={`p-3 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition`}
              >
                <Share2 size={20} />
              </button>
              <button
                onClick={fetchEarthquakes}
                disabled={loading}
                className={`px-4 py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold hover:shadow-lg transition ${loading ? 'opacity-50' : ''}`}
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className={`${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-500 to-indigo-600'} rounded-xl p-4 text-white`}>
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-90">Total Earthquakes</div>
            </div>
            <div className={`${darkMode ? 'bg-gradient-to-r from-red-900 to-orange-900' : 'bg-gradient-to-r from-red-500 to-orange-600'} rounded-xl p-4 text-white`}>
              <div className="text-3xl font-bold">{stats.max.toFixed(1)}</div>
              <div className="text-sm opacity-90">Highest Magnitude</div>
            </div>
            <div className={`${darkMode ? 'bg-gradient-to-r from-green-900 to-teal-900' : 'bg-gradient-to-r from-green-500 to-teal-600'} rounded-xl p-4 text-white`}>
              <div className="text-3xl font-bold">{stats.recent}</div>
              <div className="text-sm opacity-90">Last 10 Minutes</div>
            </div>
          </div>
        </header>

        {/* Controls */}
        <div className={`${cardBg} rounded-2xl shadow-xl p-6 mb-6`}>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-sm font-semibold mb-2 ${textColor}`}>
                Min Magnitude: {minMagnitude}
              </label>
              <input
                type="range"
                min="1"
                max="7"
                step="0.1"
                value={minMagnitude}
                onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full"
                style={{
                  background: 'linear-gradient(to right, #84cc16, #eab308, #f59e0b, #ea580c, #dc2626)'
                }}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${textColor}`}>
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'} border-0`}
              >
                <option value="hour">Last Hour</option>
                <option value="day">Last Day</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('cards')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${activeView === 'cards' ? 'bg-purple-600 text-white' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                <Filter size={20} />
              </button>
              <button
                onClick={() => setActiveView('map')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${activeView === 'map' ? 'bg-purple-600 text-white' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                🗺️
              </button>
              <button
                onClick={() => setActiveView('charts')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${activeView === 'charts' ? 'bg-purple-600 text-white' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                <BarChart2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg mb-6">
            <p className="font-bold">Note</p>
            <p>{error}</p>
          </div>
        )}

        {/* Main Content */}
        {activeView === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEarthquakes.map((eq) => (
              <div
                key={eq.id}
                className={`${cardBg} rounded-xl shadow-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer`}
                onClick={() => setSelectedEarthquake(eq)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${textColor} mb-1`}>{eq.place}</h3>
                    <p className={`text-sm ${textSecondary}`}>{getTimeAgo(eq.time)}</p>
                  </div>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
                    style={{ backgroundColor: getMagnitudeColor(eq.magnitude) }}
                  >
                    {parseFloat(eq.magnitude).toFixed(1)}
                  </div>
                </div>
                
                <div className={`space-y-2 ${textSecondary}`}>
                  <div className="flex justify-between">
                    <span>Depth:</span>
                    <span className="font-semibold">{eq.depth.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span className="font-semibold">{eq.lat.toFixed(2)}, {eq.lng.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-semibold capitalize">{eq.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'map' && (
          <div className={`${cardBg} rounded-2xl shadow-xl p-6`}>
            <h3 className={`text-xl font-bold mb-4 ${textColor}`}>Interactive Map View</h3>
            <div className="relative h-[500px] bg-gray-200 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                <div className="text-white text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-xl font-semibold mb-2">Interactive Map</p>
                  <p className="text-sm opacity-75">Click on any earthquake card to view location details</p>
                </div>
              </div>
              
              {/* Earthquake markers */}
              {filteredEarthquakes.slice(0, 20).map((eq, idx) => (
                <div
                  key={eq.id}
                  className="absolute w-4 h-4 rounded-full cursor-pointer hover:scale-150 transition-transform"
                  style={{
                    backgroundColor: getMagnitudeColor(eq.magnitude),
                    left: `${((eq.lng + 180) / 360) * 100}%`,
                    top: `${((90 - eq.lat) / 180) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                  }}
                  title={`${eq.place} - M${eq.magnitude}`}
                  onClick={() => setSelectedEarthquake(eq)}
                />
              ))}
            </div>
            
            {selectedEarthquake && (
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className={`font-bold text-lg ${textColor}`}>{selectedEarthquake.place}</h4>
                <p className={textSecondary}>M{selectedEarthquake.magnitude} • {getTimeAgo(selectedEarthquake.time)}</p>
                <p className={textSecondary}>Depth: {selectedEarthquake.depth.toFixed(1)} km</p>
                <p className={textSecondary}>Coordinates: {selectedEarthquake.lat.toFixed(2)}, {selectedEarthquake.lng.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${cardBg} rounded-2xl shadow-xl p-6`}>
              <h3 className={`text-xl font-bold mb-4 ${textColor}`}>Hourly Activity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="hour" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={`${cardBg} rounded-2xl shadow-xl p-6`}>
              <h3 className={`text-xl font-bold mb-4 ${textColor}`}>Magnitude Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getMagnitudeDistribution()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis dataKey="range" stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`${cardBg} rounded-2xl shadow-xl p-6 lg:col-span-2`}>
              <h3 className={`text-xl font-bold mb-4 ${textColor}`}>Recent Earthquake Timeline</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredEarthquakes.slice(0, 10).map((eq) => (
                  <div key={eq.id} className={`flex items-center gap-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: getMagnitudeColor(eq.magnitude) }}
                    >
                      {parseFloat(eq.magnitude).toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${textColor}`}>{eq.place}</div>
                      <div className={`text-sm ${textSecondary}`}>
                        {eq.time.toLocaleString()} • Depth: {eq.depth.toFixed(1)} km
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && filteredEarthquakes.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-white mt-4">Loading earthquake data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarthquakeApp;