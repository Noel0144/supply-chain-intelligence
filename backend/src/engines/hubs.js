// Global logistics hubs with coordinates and capabilities
const HUBS = {
  // AIRPORTS
  'JFK': { name: 'New York JFK', lat: 40.6413, lng: -73.7781, type: 'airport', country: 'US', region: 'north_america' },
  'LAX': { name: 'Los Angeles LAX', lat: 33.9425, lng: -118.408, type: 'airport', country: 'US', region: 'north_america' },
  'ORD': { name: 'Chicago O\'Hare', lat: 41.9742, lng: -87.9073, type: 'airport', country: 'US', region: 'north_america' },
  'MXP': { name: 'Milan Malpensa', lat: 45.6306, lng: 8.7281, type: 'airport', country: 'IT', region: 'europe' },
  'LHR': { name: 'London Heathrow', lat: 51.4700, lng: -0.4543, type: 'airport', country: 'GB', region: 'europe' },
  'CDG': { name: 'Paris CDG', lat: 49.0097, lng: 2.5478, type: 'airport', country: 'FR', region: 'europe' },
  'FRA': { name: 'Frankfurt Airport', lat: 50.0379, lng: 8.5622, type: 'airport', country: 'DE', region: 'europe' },
  'AMS': { name: 'Amsterdam Schiphol', lat: 52.3105, lng: 4.7683, type: 'airport', country: 'NL', region: 'europe' },
  'DXB': { name: 'Dubai International', lat: 25.2532, lng: 55.3657, type: 'airport', country: 'AE', region: 'middle_east' },
  'DOH': { name: 'Doha Hamad', lat: 25.2609, lng: 51.6138, type: 'airport', country: 'QA', region: 'middle_east' },
  'BOM': { name: 'Mumbai Chhatrapati', lat: 19.0896, lng: 72.8656, type: 'airport', country: 'IN', region: 'south_asia' },
  'DEL': { name: 'Delhi Indira Gandhi', lat: 28.5562, lng: 77.1000, type: 'airport', country: 'IN', region: 'south_asia' },
  'SIN': { name: 'Singapore Changi', lat: 1.3644, lng: 103.9915, type: 'airport', country: 'SG', region: 'southeast_asia' },
  'PVG': { name: 'Shanghai Pudong', lat: 31.1443, lng: 121.8083, type: 'airport', country: 'CN', region: 'east_asia' },
  'PEK': { name: 'Beijing Capital', lat: 40.0799, lng: 116.6031, type: 'airport', country: 'CN', region: 'east_asia' },
  'HKG': { name: 'Hong Kong Intl', lat: 22.3080, lng: 113.9185, type: 'airport', country: 'HK', region: 'east_asia' },
  'NRT': { name: 'Tokyo Narita', lat: 35.7720, lng: 140.3929, type: 'airport', country: 'JP', region: 'east_asia' },
  'ICN': { name: 'Seoul Incheon', lat: 37.4691, lng: 126.4510, type: 'airport', country: 'KR', region: 'east_asia' },
  'SYD': { name: 'Sydney Kingsford', lat: -33.9399, lng: 151.1753, type: 'airport', country: 'AU', region: 'oceania' },
  'GRU': { name: 'São Paulo Guarulhos', lat: -23.4356, lng: -46.4731, type: 'airport', country: 'BR', region: 'south_america' },
  'MEX': { name: 'Mexico City Intl', lat: 19.4363, lng: -99.0721, type: 'airport', country: 'MX', region: 'north_america' },
  'JNB': { name: 'Johannesburg OR Tambo', lat: -26.1392, lng: 28.2460, type: 'airport', country: 'ZA', region: 'africa' },
  'NBO': { name: 'Nairobi JKIA', lat: -1.3192, lng: 36.9275, type: 'airport', country: 'KE', region: 'africa' },
  'CAI': { name: 'Cairo Intl', lat: 30.1219, lng: 31.4056, type: 'airport', country: 'EG', region: 'middle_east' },

  // SEAPORTS
  'PORT_SHANGHAI': { name: 'Port of Shanghai', lat: 31.3897, lng: 121.9183, type: 'seaport', country: 'CN', region: 'east_asia' },
  'PORT_SINGAPORE': { name: 'Port of Singapore', lat: 1.2655, lng: 103.8199, type: 'seaport', country: 'SG', region: 'southeast_asia' },
  'PORT_ROTTERDAM': { name: 'Port of Rotterdam', lat: 51.9225, lng: 4.4792, type: 'seaport', country: 'NL', region: 'europe' },
  'PORT_ANTWERP': { name: 'Port of Antwerp', lat: 51.2655, lng: 4.2900, type: 'seaport', country: 'BE', region: 'europe' },
  'PORT_LOS_ANGELES': { name: 'Port of Los Angeles', lat: 33.7361, lng: -118.2639, type: 'seaport', country: 'US', region: 'north_america' },
  'PORT_NEW_YORK': { name: 'Port of New York', lat: 40.6501, lng: -74.0799, type: 'seaport', country: 'US', region: 'north_america' },
  'PORT_DUBAI': { name: 'Jebel Ali Port', lat: 24.9990, lng: 55.0616, type: 'seaport', country: 'AE', region: 'middle_east' },
  'PORT_HAMBURG': { name: 'Port of Hamburg', lat: 53.5398, lng: 9.9837, type: 'seaport', country: 'DE', region: 'europe' },
  'PORT_HONG_KONG': { name: 'Port of Hong Kong', lat: 22.2855, lng: 114.1577, type: 'seaport', country: 'HK', region: 'east_asia' },
  'PORT_BUSAN': { name: 'Port of Busan', lat: 35.1014, lng: 129.0403, type: 'seaport', country: 'KR', region: 'east_asia' },
  'PORT_MUMBAI': { name: 'Nhava Sheva Port', lat: 18.9490, lng: 72.9420, type: 'seaport', country: 'IN', region: 'south_asia' },
  'PORT_SANTOS': { name: 'Port of Santos', lat: -23.9618, lng: -46.2990, type: 'seaport', country: 'BR', region: 'south_america' },
  'PORT_DURBAN': { name: 'Port of Durban', lat: -29.8685, lng: 31.0218, type: 'seaport', country: 'ZA', region: 'africa' },
  'PORT_TOKYO': { name: 'Port of Tokyo', lat: 35.6210, lng: 139.7745, type: 'seaport', country: 'JP', region: 'east_asia' },
  'PORT_SYDNEY': { name: 'Port of Sydney', lat: -33.8688, lng: 151.2093, type: 'seaport', country: 'AU', region: 'oceania' },
  'PORT_FELIXSTOWE': { name: 'Port of Felixstowe', lat: 51.9600, lng: 1.3500, type: 'seaport', country: 'GB', region: 'europe' },
  'PORT_TIANJIN': { name: 'Port of Tianjin', lat: 38.9800, lng: 117.7500, type: 'seaport', country: 'CN', region: 'east_asia' },
  'PORT_SUEZ': { name: 'Suez Canal', lat: 30.5852, lng: 32.2654, type: 'seaport', country: 'EG', region: 'middle_east', isChokepoint: true },
  'PORT_PANAMA': { name: 'Panama Canal', lat: 9.0800, lng: -79.6817, type: 'seaport', country: 'PA', region: 'central_america', isChokepoint: true },
  'PORT_HORMUZ': { name: 'Strait of Hormuz', lat: 26.5917, lng: 56.2519, type: 'seaport', country: 'OM', region: 'middle_east', isChokepoint: true },

  // RAIL/ROAD HUBS
  'RAIL_MOSCOW': { name: 'Moscow Rail Hub', lat: 55.7558, lng: 37.6176, type: 'rail', country: 'RU', region: 'eurasia' },
  'RAIL_ALMATY': { name: 'Almaty Rail Hub', lat: 43.2220, lng: 76.8512, type: 'rail', country: 'KZ', region: 'central_asia' },
  'RAIL_WARSAW': { name: 'Warsaw Rail Hub', lat: 52.2297, lng: 21.0122, type: 'rail', country: 'PL', region: 'europe' },
  'ROAD_ISTANBUL': { name: 'Istanbul Road Hub', lat: 41.0082, lng: 28.9784, type: 'road', country: 'TR', region: 'middle_east' },
};

// City to nearest hub mapping for geocoding user inputs
const CITY_TO_HUB = {
  'new york': { airport: 'JFK', seaport: 'PORT_NEW_YORK' },
  'los angeles': { airport: 'LAX', seaport: 'PORT_LOS_ANGELES' },
  'chicago': { airport: 'ORD', seaport: 'PORT_NEW_YORK' },
  'london': { airport: 'LHR', seaport: 'PORT_FELIXSTOWE' },
  'paris': { airport: 'CDG', seaport: 'PORT_ANTWERP' },
  'frankfurt': { airport: 'FRA', seaport: 'PORT_HAMBURG' },
  'amsterdam': { airport: 'AMS', seaport: 'PORT_ROTTERDAM' },
  'rotterdam': { airport: 'AMS', seaport: 'PORT_ROTTERDAM' },
  'antwerp': { airport: 'AMS', seaport: 'PORT_ANTWERP' },
  'milan': { airport: 'MXP', seaport: 'PORT_ANTWERP' },
  'dubai': { airport: 'DXB', seaport: 'PORT_DUBAI' },
  'doha': { airport: 'DOH', seaport: 'PORT_DUBAI' },
  'mumbai': { airport: 'BOM', seaport: 'PORT_MUMBAI' },
  'delhi': { airport: 'DEL', seaport: 'PORT_MUMBAI' },
  'singapore': { airport: 'SIN', seaport: 'PORT_SINGAPORE' },
  'shanghai': { airport: 'PVG', seaport: 'PORT_SHANGHAI' },
  'beijing': { airport: 'PEK', seaport: 'PORT_TIANJIN' },
  'hong kong': { airport: 'HKG', seaport: 'PORT_HONG_KONG' },
  'tokyo': { airport: 'NRT', seaport: 'PORT_TOKYO' },
  'seoul': { airport: 'ICN', seaport: 'PORT_BUSAN' },
  'sydney': { airport: 'SYD', seaport: 'PORT_SYDNEY' },
  'sao paulo': { airport: 'GRU', seaport: 'PORT_SANTOS' },
  'mexico city': { airport: 'MEX', seaport: 'PORT_LOS_ANGELES' },
  'johannesburg': { airport: 'JNB', seaport: 'PORT_DURBAN' },
  'nairobi': { airport: 'NBO', seaport: 'PORT_DURBAN' },
  'cairo': { airport: 'CAI', seaport: 'PORT_SUEZ' },
  'hamburg': { airport: 'FRA', seaport: 'PORT_HAMBURG' },
  'busan': { airport: 'ICN', seaport: 'PORT_BUSAN' },
};

// Sea lane waypoints for realistic ocean routing
const SEA_LANES = {
  'pacific_north': [
    { lat: 35.0, lng: 140.0 }, { lat: 38.0, lng: 160.0 }, { lat: 45.0, lng: 180.0 },
    { lat: 48.0, lng: -160.0 }, { lat: 45.0, lng: -130.0 }, { lat: 38.0, lng: -122.0 }
  ],
  'pacific_south': [
    { lat: -20.0, lng: 140.0 }, { lat: -25.0, lng: 170.0 }, { lat: -30.0, lng: -150.0 },
    { lat: -20.0, lng: -100.0 }, { lat: -12.0, lng: -78.0 }
  ],
  'atlantic_north': [
    { lat: 40.0, lng: -73.0 }, { lat: 42.0, lng: -50.0 }, { lat: 48.0, lng: -30.0 },
    { lat: 51.0, lng: -10.0 }, { lat: 51.5, lng: 4.0 }
  ],
  'atlantic_south': [
    { lat: -23.0, lng: -46.0 }, { lat: -30.0, lng: -40.0 }, { lat: -35.0, lng: -15.0 },
    { lat: -30.0, lng: 0.0 }, { lat: -25.0, lng: 15.0 }, { lat: -29.0, lng: 31.0 }
  ],
  'indian_ocean': [
    { lat: 19.0, lng: 73.0 }, { lat: 10.0, lng: 70.0 }, { lat: 0.0, lng: 65.0 },
    { lat: -10.0, lng: 65.0 }, { lat: -20.0, lng: 68.0 }, { lat: -30.0, lng: 70.0 }
  ],
  'suez_route': [
    { lat: 30.0, lng: 32.5 }, { lat: 28.0, lng: 34.0 }, { lat: 22.0, lng: 38.0 },
    { lat: 12.0, lng: 43.0 }, { lat: 5.0, lng: 45.0 }, { lat: 1.0, lng: 45.0 }
  ],
  'cape_route': [
    { lat: 30.0, lng: 32.5 }, { lat: 20.0, lng: 37.0 }, { lat: 0.0, lng: 40.0 },
    { lat: -20.0, lng: 38.0 }, { lat: -35.0, lng: 25.0 }, { lat: -40.0, lng: 15.0 },
    { lat: -35.0, lng: 5.0 }, { lat: -20.0, lng: -10.0 }
  ],
};

// Bounding boxes for major land regions to detect land-clipping 
// Significantly tightened to "Interior Cores" to prevent offensive ocean clipping
const LAND_REGIONS = [
  // North America
  { name: 'US/Canada Core', minLat: 30, maxLat: 60, minLng: -115, maxLng: -75 },
  { name: 'Mexico Inland', minLat: 18, maxLat: 30, minLng: -105, maxLng: -90 },
  // South America
  { name: 'SA Inland North', minLat: -15, maxLat: 5, minLng: -70, maxLng: -50 },
  { name: 'SA Inland South', minLat: -35, maxLat: -15, minLng: -70, maxLng: -60 },
  // Europe & Asia
  { name: 'Europe Core', minLat: 45, maxLat: 65, minLng: 2, maxLng: 35 },
  { name: 'Russia/Central Asia', minLat: 40, maxLat: 70, minLng: 35, maxLng: 120 },
  { name: 'China Inland', minLat: 25, maxLat: 45, minLng: 100, maxLng: 120 },
  { name: 'India Inland', minLat: 15, maxLat: 25, minLng: 74, maxLng: 84 },
  { name: 'Middle East Inland', minLat: 15, maxLat: 30, minLng: 42, maxLng: 55 },
  // Africa
  { name: 'Sahara', minLat: 15, maxLat: 30, minLng: -10, maxLng: 30 },
  { name: 'Sub-Sahara Central', minLat: 5, maxLat: 15, minLng: -10, maxLng: 35 },
  { name: 'Africa South Inland', minLat: -30, maxLat: 5, minLng: 15, maxLng: 35 },
  // Australia
  { name: 'Australia Inland', minLat: -35, maxLat: -15, minLng: 115, maxLng: 150 }
];

// Defined canal zones for visual override (keep sea color)
const CANAL_ZONES = [
  { name: 'Suez Canal', lat: 30.5, lng: 32.2, radius: 100 },
  { name: 'Panama Canal', lat: 9.1, lng: -79.7, radius: 100 }
];

module.exports = { HUBS, CITY_TO_HUB, SEA_LANES, LAND_REGIONS, CANAL_ZONES };
