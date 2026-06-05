'use client';

import dynamic from 'next/dynamic';
import { Map as MapIcon } from 'lucide-react';

const DynamicMap = dynamic(
  () => import('./FullHistoricalMapInner'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-500">
        <MapIcon className="w-12 h-12 mb-4 opacity-50 animate-pulse" />
        <span className="text-lg font-medium">Loading Interactive Map...</span>
      </div>
    )
  }
);

export default function FullHistoricalMap() {
  return (
    <div className="w-full h-full relative flex">
      <DynamicMap />
    </div>
  );
}
