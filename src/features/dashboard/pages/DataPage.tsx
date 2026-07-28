import React, { useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

// Use local file instead of external CDN
// This eliminates the CSP connect-src issue
const GEO_URL = '/data/countries-110m.json';

interface DataPageProps {
  // Add props as needed
}

export const DataPage: React.FC<DataPageProps> = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verify the file loads correctly
    fetch(GEO_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load map data: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load world map data:', err);
        setError('Failed to load map data. Please refresh the page.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <ComposableMap
        projectionConfig={{
          scale: 147,
          center: [0, 20],
        }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#EAEAEC"
                  stroke="#D6D6DA"
                  style={{
                    default: {
                      fill: "#EAEAEC",
                      outline: "none",
                    },
                    hover: {
                      fill: "#F53",
                      outline: "none",
                    },
                    pressed: {
                      fill: "#E42",
                      outline: "none",
                    },
                  }}
                />
              ))
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export default DataPage;
