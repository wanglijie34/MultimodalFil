'use client';

import dynamic from 'next/dynamic';
import { Map as MapIcon } from 'lucide-react';

const DynamicMap = dynamic(
  () => import('./HistoricalMapInner'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-500 rounded-md border border-neutral-800">
        <MapIcon className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-sm font-medium">Loading Map...</span>
      </div>
    )
  }
);

export default function HistoricalMap() {
  return (
    <div className="w-full h-full relative group">
      <DynamicMap />
      
      {/* Absolute overlay for a nice fade effect or controls */}
      <div className="absolute top-2 right-2 z-[400] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/60 backdrop-blur-sm text-white/80 text-xs px-2 py-1 rounded border border-white/10">
          Scroll to zoom, drag to pan
        </div>
      </div>
    </div>
  );
}
