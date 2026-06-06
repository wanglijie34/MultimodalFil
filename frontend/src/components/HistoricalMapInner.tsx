'use client';

import { MapContainer, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface HistoricalMapProps {
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}

// Map bounds configuration using CRS.Simple
// We map [0,0] to bottom-left, [imageHeight, imageWidth] to top-right
export default function HistoricalMapInner({ 
  imageUrl = '/images/ming-1443.jpg', 
  imageWidth = 4961, // Original image width roughly 
  imageHeight = 3508 // Original image height roughly
}: HistoricalMapProps) {
  
  // Define coordinate bounds for the image
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [imageHeight, imageWidth]
  ];

  return (
    <div className="h-full w-full relative bg-neutral-900 overflow-hidden">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        minZoom={-2}
        maxZoom={2}
        zoom={-1}
        scrollWheelZoom={true}
        className="h-full w-full absolute inset-0 z-0 outline-none"
        style={{ background: '#171717' }} // Neutral-900
      >
        <ImageOverlay
          url={imageUrl}
          bounds={bounds}
        />
        {/* We can add interactive markers here in the future using L.latLng(y, x) */}
      </MapContainer>
    </div>
  );
}
