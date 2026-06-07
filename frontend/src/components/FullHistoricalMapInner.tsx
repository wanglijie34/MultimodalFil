'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapLocations, mapRelations, MapLocation } from '@/lib/map-data';
import { factionBoundaries, factionLabels, mingProvinces } from '@/lib/faction-boundaries';
import { X, MapPin, Shield, Swords, Home, Mountain, Waves, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import GameOverlay from './game/GameOverlay';
import { GameState, getGameState } from '@/lib/gameApi';
import { GAME_ASSETS } from '@/lib/gameAssets';

export default function FullHistoricalMapInner() {
  const [activeLocation, setActiveLocation] = useState<MapLocation | null>(null);
  const [isMacroView, setIsMacroView] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeView, setActiveView] = useState<'standard' | 'famine' | 'stability' | 'tax' | 'military'>('standard');
  const [clickInfo, setClickInfo] = useState<{lng: number, lat: number, name: string, faction: string, type?: string} | null>(null);
  const [cursor, setCursor] = useState<string>('');
  const interactiveLayers = useMemo(() => ['location-circles', 'location-labels', 'faction-names', 'ming-provinces-labels', 'ming-prefectures-labels', 'extra-factions-labels'], []);

  useEffect(() => {
    const fetchState = () => {
      getGameState().then(res => {
        if (res.world_state) {
          setGameState({
            ...res.world_state,
            regions: res.regions
          });
        }
      }).catch(console.error);
    };
    fetchState();
    window.addEventListener('gameStateChanged', fetchState);
    return () => window.removeEventListener('gameStateChanged', fetchState);
  }, []);

  const dynamicFillColor: any = useMemo(() => {
    if (activeView === 'standard' || !gameState?.regions) {
      return [
        'match', ['get', 'province'],
        '陕西', '#c6a982',
        '山西', '#ceb28a',
        '北直隶', '#be9d73',
        '山东', '#c0a680',
        '河南', '#cca67a',
        '四川', '#ceb28a',
        '湖广', '#be9d73',
        '江西', '#c6a982',
        '南直隶', '#ceb28a',
        '浙江', '#cca67a',
        '福建', '#c0a680',
        '广东', '#c6a982',
        '广西', '#be9d73',
        '贵州', '#c0a680',
        '云南', '#cca67a',
        '辽东', '#c0a680',
        '#c6a982'
      ];
    }

    const getFamineColor = (val: number) => {
      if (val >= 80) return '#6b0000'; // Extreme famine (Dark Red)
      if (val >= 60) return '#cc3300'; // Severe famine (Red/Orange)
      if (val >= 40) return '#ff9900'; // Moderate (Orange)
      if (val >= 20) return '#ffcc66'; // Mild (Light Orange)
      return '#fcf5d2'; // Normal (Light Yellow)
    };

    const getStabilityColor = (val: number) => { 
      if (val < 0) return '#7f8c8d'; // Neutral / Unknown (Grey)
      if (val >= 80) return '#2980b9'; // Very stable
      if (val >= 60) return '#3498db'; // Stable
      if (val >= 40) return '#c6a982'; // Average
      if (val >= 20) return '#e74c3c'; // Danger
      return '#c0392b'; // Revolt
    };

    const getTaxColor = (val: number) => {
      if (val >= 80) return '#8b0000'; // Crushing tax (Glaring Red)
      if (val >= 60) return '#cc0000'; // Heavy tax (Red)
      if (val >= 40) return '#d49a6a'; // Moderate
      if (val >= 20) return '#e6ccb3'; // Light
      return '#f5f5dc'; // Normal (Light Beige)
    };

    const getMilitaryColor = (val: number) => {
      if (val >= 80) return '#1b5e20'; // Heavy military presence
      if (val >= 60) return '#388e3c'; // Defended
      if (val >= 40) return '#81c784'; // Average
      if (val >= 20) return '#f57f17'; // Weak
      return '#bf360c'; // Critical danger
    };

    const geoToRegionMap: Record<string, string> = {
      '北直隶': '直隶',
      '南直隶': '江南',
      '浙江': '江南',
      '江西': '江南',
      '福建': '江南',
      '广东': '湖广', 
      '广西': '湖广',
      '云南': '云贵',
      '贵州': '云贵',
      '山东': '山东',
      '山西': '山西',
      '河南': '河南',
      '陕西': '陕西',
      '四川': '四川',
      '湖广': '湖广'
    };

    const regionMap = new globalThis.Map();
    gameState.regions.forEach(r => regionMap.set(r.name, r));

    const matchExpr: any[] = ['match', ['get', 'province']];

    Object.entries(geoToRegionMap).forEach(([geoProv, gameRegName]) => {
      const region = regionMap.get(gameRegName);
      if (region) {
        let color = '#c6a982';
        if (activeView === 'famine') color = getFamineColor(region.famine_level || region.disaster_level || 0);
        else if (activeView === 'stability') color = getStabilityColor(region.public_support || 0);
        else if (activeView === 'tax') color = getTaxColor(region.tax_burden || 0);
        else if (activeView === 'military') {
          let dl = region.defense_level || 0;
          // Make interior Shaanxi and Shanxi visually lighter green to contrast with Nine Borders
          if (geoProv === '陕西' || geoProv === '山西' || geoProv === '北直隶') {
            dl = 40; 
          }
          color = getMilitaryColor(dl);
        }
        matchExpr.push(geoProv, color);
      }
    });

    matchExpr.push('#c6a982'); // Default fallback

    if (activeView === 'military') {
      return [
        'case',
        ['in', ['get', 'name'], ['literal', [
          '永平府', '顺天府', '万全都司', '大同府', 
          '延安府', '榆林卫', '宁夏卫', '宁夏中卫', '宁夏后卫', 
          '庆阳府', '平凉府', '临洮府', '靖虏卫', 
          '甘州卫', '肃州卫', '凉州卫', '庄浪卫', '镇夷所', '高台所', '山丹卫', '永昌卫', '镇番卫', '西宁卫'
        ]]],
        '#1b5e20', // Deep green for Nine Borders
        matchExpr
      ];
    }

    return matchExpr;

  }, [activeView, gameState]);

  const dynamicFactionColor: any = useMemo(() => {
    const defaultMatch: any[] = ['match', ['get', 'faction'],
      '后金', '#6a2a2a', 
      '北元 / 鞑靼', '#4a3b2c', 
      '瓦剌', '#3b2f4c', 
      '东察合台汗国', '#2d4c3f', 
      '吐蕃诸部', '#7a5230'
    ];
    if (activeView === 'standard' || !gameState?.regions) {
      return [...defaultMatch, '#c6a982'];
    }

    const matchExpr = [...defaultMatch];

    const getFamineColor = (val: number) => {
      if (val >= 80) return '#6b0000'; if (val >= 60) return '#cc3300'; if (val >= 40) return '#ff9900'; if (val >= 20) return '#ffcc66'; return '#fcf5d2';
    };
    const getStabilityColor = (val: number) => { 
      if (val < 0) return '#7f8c8d'; if (val >= 80) return '#2980b9'; if (val >= 60) return '#3498db'; if (val >= 40) return '#c6a982'; if (val >= 20) return '#e74c3c'; return '#c0392b';
    };
    const getTaxColor = (val: number) => {
      if (val >= 80) return '#8b0000'; if (val >= 60) return '#cc0000'; if (val >= 40) return '#d49a6a'; if (val >= 20) return '#e6ccb3'; return '#f5f5dc';
    };
    const getMilitaryColor = (val: number) => {
      if (val >= 80) return '#1b5e20'; if (val >= 60) return '#388e3c'; if (val >= 40) return '#81c784'; if (val >= 20) return '#f57f17'; return '#bf360c';
    };

    const liaodong = gameState.regions.find(r => r.name === '辽东');
    if (liaodong) {
      let color = '#c6a982';
      if (activeView === 'famine') color = getFamineColor(liaodong.famine_level || liaodong.disaster_level || 0);
      else if (activeView === 'stability') color = getStabilityColor(liaodong.public_support || 0);
      else if (activeView === 'tax') color = getTaxColor(liaodong.tax_burden || 0);
      else if (activeView === 'military') color = getMilitaryColor(liaodong.defense_level || 0);
      matchExpr.push('辽东都司', color);
    }

    matchExpr.push(
      activeView === 'famine' ? '#cc3300' :
      activeView === 'stability' ? '#3366cc' :
      activeView === 'military' ? '#ff9900' :
      activeView === 'tax' ? '#996633' : '#c6a982'
    );
    
    return matchExpr;
  }, [activeView, gameState]);
  
  const mapStyle = useMemo(() => ({
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#1a2228' // Deep ink/teal water
        }
      }
    ]
  }), []);

  // Convert relations to GeoJSON for rendering route lines
  const locationsGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: mapLocations
        .filter(loc => !['capital', 'fortress', 'garrison'].includes(loc.type))
        .map(loc => {
        let color = '#d49a6a';
        let radius = 5;
        let strokeWidth = 1.5;
        if (loc.type === 'city') { color = '#293d3d'; radius = 6; strokeWidth = 1.5; }
        else if (loc.type === 'event') { color = '#d94a18'; radius = 7; strokeWidth = 1.5; }
        else if (loc.type === 'mountain') { color = 'transparent'; radius = 0; strokeWidth = 0; }
        else if (loc.type === 'river') { color = 'transparent'; radius = 0; strokeWidth = 0; }
        let text_color = '#3b2f24'; // Ink black/brown
        if (loc.type === 'mountain') text_color = '#5c4b3a';
        if (loc.type === 'river') text_color = '#2d4b5a';
        
        return {
          type: 'Feature',
          properties: { ...loc, color, radius, strokeWidth, text_color },
          geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] }
        };
      })
    };
  }, []);

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'capital': return <Home className="w-5 h-5 text-white" />;
      case 'city': return <Building2 className="w-4 h-4 text-white" />;
      case 'fortress': return <Shield className="w-5 h-5 text-white" />;
      case 'event': return <Swords className="w-5 h-5 text-white" />;
      case 'mountain': return <Mountain className="w-5 h-5 text-[#d4c7b8]" />;
      case 'river': return <Waves className="w-5 h-5 text-[#99ccff]" />;
      default: return <MapPin className="w-5 h-5 text-white" />;
    }
  };

  const getMarkerColor = (type: string) => {
    if (type === 'capital') return 'bg-[#a32727] border-[#ffb366]'; // deep red, golden border
    if (type === 'city') return 'bg-[#293d3d] border-[#669999]'; // dark teal, muted border
    if (type === 'fortress') return 'bg-[#4d3c2b] border-[#d49a6a]'; // dark earth
    if (type === 'event') return 'bg-[#d94a18] border-[#ffb366]'; // fiery orange
    if (type === 'mountain') return 'bg-transparent border-transparent shadow-none'; 
    if (type === 'river') return 'bg-transparent border-transparent shadow-none';
    return 'bg-[#4d3c2b] border-[#d49a6a]';
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#11171a]">
      <div className="absolute inset-0 [&_.maplibregl-canvas]:contrast-[1.1] [&_.maplibregl-canvas]:brightness-[0.95]">
        <Map
          initialViewState={{
            longitude: 112,
            latitude: 38,
            zoom: 4.5,
            pitch: 0, // Reset to a flat 2D view
            bearing: 0
          }}
          maxBounds={[[70, 0], [150, 55]]} // Restrict to China, Mongolia, SE Asia, Japan
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mapStyle={mapStyle as any}
          maxPitch={85}
          onZoom={(e) => {
            const newIsMacro = e.viewState.zoom < 4.5;
            if (newIsMacro !== isMacroView) {
              setIsMacroView(newIsMacro);
            }
          }}
          interactiveLayerIds={interactiveLayers}
          cursor={cursor}
          onMouseEnter={(e) => {
            if (e.features && e.features.length > 0) {
              setCursor('pointer');
            }
          }}
          onMouseLeave={() => {
            setCursor('');
          }}
          onClick={(e) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              if (feature.layer.id === 'location-circles' || feature.layer.id === 'location-labels') {
                const loc = mapLocations.find(l => l.id === feature.properties.id);
                if (loc) {
                  setActiveLocation(loc);
                  setClickInfo(null);
                }
              } else if (['faction-names', 'ming-provinces-labels', 'ming-prefectures-labels', 'extra-factions-labels'].includes(feature.layer.id)) {
                setActiveLocation(null);
                
                let type = 'prefecture';
                let faction = feature.properties?.faction || feature.properties?.province || '大明';
                
                if (feature.layer.id === 'faction-names') {
                  type = 'faction';
                  faction = feature.properties?.name;
                } else if (feature.layer.id === 'ming-provinces-labels') {
                  type = 'province';
                  faction = '大明帝国';
                } else if (feature.layer.id === 'extra-factions-labels') {
                  type = 'tribe';
                }

                setClickInfo({
                  lng: e.lngLat.lng,
                  lat: e.lngLat.lat,
                  name: feature.properties?.name || '未知区域',
                  faction,
                  type
                });
              }
            } else {
              setActiveLocation(null);
              setClickInfo(null);
            }
          }}
        >
          <FullscreenControl position="top-right" />
          <NavigationControl position="bottom-right" />

          {/* Render Extra Factions Subdivisions */}
          <Source 
            id="extra-factions" 
            type="geojson" 
            data="/data/extra_factions.geojson"
            tolerance={0}
            maxzoom={9}
          >
            <Layer
              id="extra-factions-fill"
              type="fill"
              paint={{
                'fill-color': dynamicFactionColor,
                'fill-antialias': false,
                'fill-opacity': ['match', ['get', 'faction'],
                  ['辽东都司'], // Only Liaodong gets parchment look now
                  isMacroView 
                    ? (activeView !== 'standard' ? 0.5 : 1) 
                    : (activeView !== 'standard' ? 0.3 : 1),
                  // Default opacity for foreign factions
                  isMacroView 
                    ? (activeView !== 'standard' ? 0.3 : 1) 
                    : (activeView !== 'standard' ? 0.2 : 1)
                ]
              }}
            />
            <Layer
              id="extra-factions-line"
              type="line"
              paint={{
                'line-color': '#5c4531',
                'line-width': isMacroView ? 0.5 : 1,
                'line-opacity': isMacroView ? 0.2 : 0.4,
                'line-dasharray': [2, 2]
              }}
            />
            {!isMacroView && (
              <Layer
                id="extra-factions-labels"
                type="symbol"
                layout={{
                  'text-field': ['concat', '⛺ ', ['get', 'name']],
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                  'text-size': 10,
                  'text-letter-spacing': 0.1,
                  'text-anchor': 'center'
                }}
                paint={{
                  'text-color': '#4a3b2c',
                  'text-halo-color': 'rgba(215, 196, 161, 0.6)',
                  'text-halo-width': 1.5,
                  'text-opacity': 0.6
                }}
              />
            )}
          </Source>

          {/* Render Ming Prefectures (Always visible to form the solid Ming shape) */}
          <Source 
            id="ming-prefectures" 
            type="geojson" 
            data="/data/ming_prefectures_1628.geojson" 
            generateId={true}
            tolerance={0}
            maxzoom={9}
          >
            <Layer
              id="ming-prefectures-fill"
              type="fill"
              paint={{
                'fill-color': dynamicFillColor,
                'fill-antialias': false,
                'fill-opacity': isMacroView 
                  ? (activeView !== 'standard' ? 0.7 : 1) 
                  : (activeView !== 'standard' ? 0.5 : 1)
              }}
            />
            <Layer
              id="ming-prefectures-line"
              type="line"
              paint={{
                'line-color': '#5c4531',
                'line-width': isMacroView ? 1 : 2,
                'line-opacity': isMacroView ? 0.3 : 0.6,
                'line-dasharray': [3, 2]
              }}
            />
          </Source>
          <Source id="ming-prefectures-labels-source" type="geojson" data="/data/ming_prefectures_labels_points.geojson">
            {!isMacroView && (
              <Layer
                id="ming-zhou-labels"
                type="symbol"
                filter={['!', ['any', 
                  ['==', ['get', 'type'], '府'], 
                  ['==', ['get', 'type'], '军民府'], 
                  ['==', ['get', 'type'], '都司'], 
                  ['==', ['get', 'type'], '直隶州'],
                  ['==', ['get', 'type'], '宣慰司'],
                  ['==', ['get', 'type'], '宣抚司']
                ]]}
                layout={{
                  'text-field': ['get', 'name'],
                  'text-size': 10,
                  'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                  'text-letter-spacing': 0.05,
                  'text-anchor': 'center'
                }}
                paint={{
                  'text-color': '#4a3b2c',
                  'text-halo-color': 'rgba(215, 196, 161, 0.6)',
                  'text-halo-width': 1.5,
                  'text-opacity': 0.6
                }}
              />
            )}
            {!isMacroView && (
              <Layer
                id="ming-prefectures-labels"
                type="symbol"
                filter={['any', 
                  ['==', ['get', 'type'], '府'], 
                  ['==', ['get', 'type'], '军民府'], 
                  ['==', ['get', 'type'], '都司'], 
                  ['==', ['get', 'type'], '直隶州'],
                  ['==', ['get', 'type'], '宣慰司'],
                  ['==', ['get', 'type'], '宣抚司']
                ]}
                layout={{
                  'text-field': ['get', 'name'],
                  'text-size': 13,
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                  'text-letter-spacing': 0.1,
                  'text-anchor': 'center'
                }}
                paint={{
                  'text-color': '#3b2f24',
                  'text-halo-color': 'rgba(215, 196, 161, 0.85)',
                  'text-halo-width': 2,
                  'text-opacity': 0.85
                }}
              />
            )}
          </Source>




          {/* Render Macro Faction Names (Only in macro view) */}
          {isMacroView && (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Source id="faction-labels" type="geojson" data={factionLabels as any}>
                <Layer
                  id="faction-names"
                  type="symbol"
                  layout={{
                    'text-field': ['get', 'name'],
                    'text-size': 32,
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-letter-spacing': 0.3,
                    'text-anchor': 'center'
                  }}
                  paint={{
                    'text-color': ['get', 'color'],
                    'text-halo-color': 'rgba(26, 34, 40, 0.9)',
                    'text-halo-width': 3,
                    'text-opacity': 0.9
                  }}
                />
              </Source>
            </>
          )}

          {/* Render Route Lines and Ming Provinces (Only in micro view) */}
          {!isMacroView && (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Source id="ming-provinces" type="geojson" data={mingProvinces as any}>
                <Layer
                  id="ming-provinces-labels"
                  type="symbol"
                  layout={{
                    'text-field': ['get', 'name'],
                    'text-size': 20,
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-letter-spacing': 0.2,
                    'text-anchor': 'center'
                  }}
                  paint={{
                    'text-color': '#8b2323',
                    'text-halo-color': 'rgba(215, 196, 161, 0.8)',
                    'text-halo-width': 3,
                    'text-opacity': 0.8
                  }}
                />
              </Source>


            </>
          )}

          {/* Render Locations natively to fix 3D terrain drift (Only in micro view) */}
          {!isMacroView && (
            <Source id="locations" type="geojson" data={locationsGeoJson as any}>
              <Layer
                id="location-circles"
                type="circle"
                paint={{
                  'circle-color': ['get', 'color'],
                  'circle-radius': ['get', 'radius'],
                  'circle-stroke-color': ['case', ['==', ['get', 'type'], 'capital'], '#ffd700', '#ffb366'],
                  'circle-stroke-width': ['get', 'strokeWidth'],
                  'circle-pitch-alignment': 'map'
                }}
              />
              <Layer
                id="location-labels"
                type="symbol"
                layout={{
                  'text-field': [
                    'concat',
                    ['match', ['get', 'type'],
                      'mountain', '⛰️ ',
                      'river', '🌊 ',
                      'event', '🔥 ',
                      'city', '🏛️ ',
                      ''
                    ],
                    ['get', 'name']
                  ],
                  'text-size': 13,
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                  'text-offset': [0, -1.2],
                  'text-anchor': 'bottom',
                  'text-letter-spacing': 0.1
                }}
                paint={{
                  'text-color': ['get', 'text_color'],
                  'text-halo-color': 'rgba(215, 196, 161, 0.85)',
                  'text-halo-width': 2
                }}
              />
            </Source>
          )}

          {/* HTML Markers for Capitals and Fortresses */}
          {!isMacroView && mapLocations.filter(loc => ['capital', 'fortress', 'garrison'].includes(loc.type)).map(loc => (
            <Marker
              key={loc.id}
              longitude={loc.lng!}
              latitude={loc.lat!}
              anchor="bottom"
              className="z-10"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setClickInfo({
                  lng: loc.lng!,
                  lat: loc.lat!,
                  name: loc.name,
                  faction: '大明',
                  type: loc.type
                });
              }}
            >
              <div className="relative flex flex-col items-center group cursor-pointer transform hover:scale-110 transition-transform">
                <img 
                  src={loc.type === 'capital' ? '/images/capital_icon.png' : '/images/fortress_icon.png'} 
                  className={loc.type === 'capital' ? "w-12 h-12 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]" : "w-8 h-8 drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)]"}
                  alt={loc.name}
                />
                <span className={`mt-0.5 whitespace-nowrap font-bold drop-shadow-md ${loc.type === 'capital' ? 'text-[14px] text-[#8b2323]' : 'text-[12px] text-[#3b2f24]'} [-webkit-text-stroke:1px_rgba(215,196,161,0.8)]`}>
                  {loc.name}
                </span>
                <span className={`absolute ${loc.type === 'capital' ? 'top-12' : 'top-8'} mt-1 whitespace-nowrap font-bold drop-shadow-md z-[-1] ${loc.type === 'capital' ? 'text-[14px] text-[#8b2323]' : 'text-[12px] text-[#3b2f24]'}`}>
                  {loc.name}
                </span>
              </div>
            </Marker>
          ))}

          {/* Click Popup using Marker for stability */}
          {clickInfo && !activeLocation && (
            <Marker
              longitude={clickInfo.lng}
              latitude={clickInfo.lat}
              anchor="bottom"
              className="z-50 pointer-events-none"
            >
              <div className="bg-[#1a120c]/95 border border-[#d49a6a]/40 p-3 shadow-2xl backdrop-blur-md rounded-md min-w-[160px]">
                <div className="text-[#ffcc99] font-bold text-lg mb-1 flex items-center gap-2 pr-4">
                  <span className="text-[#d49a6a]">📍</span> {clickInfo.name}
                </div>
                <div className="text-[#a88f78] text-sm mb-2">归属: {clickInfo.faction}</div>
                
                {/* Dynamic Rich Information Based on Type */}
                {clickInfo.type && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-[#d49a6a]/30 text-sm text-[#c6a982]">
                    {clickInfo.type === 'faction' && (
                      <>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>阵营领袖</span><span className="font-bold text-[#ffcc99]">{clickInfo.name === '大明帝国' ? '崇祯帝 (朱由检)' : clickInfo.name === '后金' ? '皇太极' : clickInfo.name === '鞑靼' ? '林丹汗' : '当地首领'}</span></div>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>国力评级</span><span className="text-yellow-500">{"★".repeat((clickInfo.name.length % 3) + 3)}</span></div>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>兵力预估</span><span>{10 + (clickInfo.name.length * 11 % 40)} 万</span></div>
                      </>
                    )}
                    {clickInfo.type === 'province' && (
                      <>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>布政使/巡抚</span><span>{['洪承畴', '卢象升', '孙传庭', '杨嗣昌'][clickInfo.name.length % 4]}</span></div>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>常备驻军</span><span>{3 + (clickInfo.name.length * 7 % 8)} 万</span></div>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>赋税重地</span><span className={clickInfo.name.length % 2 === 0 ? "text-green-400" : "text-yellow-400"}>{clickInfo.name.length % 2 === 0 ? "是" : "否"}</span></div>
                      </>
                    )}
                    {clickInfo.type === 'prefecture' && (() => {
                      const { getPrefectureData } = require('@/lib/ming-historical-data');
                      const data = getPrefectureData(clickInfo.name, clickInfo.lat, clickInfo.lng);
                      return (
                        <>
                          <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1">
                            <span>主官</span>
                            <span>{clickInfo.name.endsWith('司') ? '指挥使' : (clickInfo.name.endsWith('州') ? '知州' : '知府')}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1">
                            <span>在籍户口</span>
                            <span>{data.population.toLocaleString()} 户</span>
                          </div>
                          <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1">
                            <span>秋粮夏税</span>
                            <span>{data.tax.toLocaleString()} 石</span>
                          </div>
                          <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1">
                            <span>存粮状态</span>
                            <span className={data.grain === '颗粒无收' ? 'text-red-500 font-bold' : data.grain.includes('告急') ? 'text-orange-400' : 'text-green-400'}>{data.grain}</span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-[#d49a6a]/20 text-xs text-[#b3a392] italic leading-relaxed">
                            "{data.agriculture}"
                          </div>
                        </>
                      );
                    })()}
                    {clickInfo.type === 'tribe' && (
                      <>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>部落首领</span><span>{['莽古尔泰', '阿敏', '代善', '多尔衮', '豪格'][clickInfo.name.length % 5]}</span></div>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>骑兵战力</span><span className="text-orange-400 font-bold">极度危险</span></div>
                        <div className="flex justify-between border-b border-[#d49a6a]/10 pb-1"><span>对明态度</span><span className={clickInfo.name.length % 2 === 0 ? "text-red-500 font-bold" : "text-yellow-500"}>{clickInfo.name.length % 2 === 0 ? "敌对侵略" : "暗中袭扰"}</span></div>
                      </>
                    )}
                  </div>
                )}
                  {activeView === 'standard' && (
                    <div className="text-[#8a7a63] text-xs italic mt-1">
                      点击查看地缘详情
                    </div>
                  )}
              </div>
            </Marker>
          )}

          {/* Liaodong Military Debt Warning */}
          {activeView === 'military' && (gameState?.treasury?.debt > 0) && (
            <Marker longitude={123.1815} latitude={41.2694} anchor="bottom" style={{ zIndex: 100 }}>
              <div className="flex flex-col items-center animate-pulse pointer-events-none mt-[-20px]">
                <div className="bg-[#8b2323]/95 border border-[#ff3333] text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-[0_0_15px_rgba(255,51,51,0.6)] font-serif">
                  ⚠️ 银两赤字/欠饷警告
                </div>
                <div className="w-0.5 h-6 bg-gradient-to-t from-transparent to-[#ff3333]"></div>
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Dynamic Atmospheric Overlays */}
      <div className="absolute inset-0 pointer-events-none z-[20] transition-opacity duration-1000 mix-blend-multiply">
        {/* Famine: Reddish harsh heat */}
        <div className={cn("absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_rgba(204,51,0,0.4)_100%)] transition-opacity duration-1000", activeView === 'famine' ? "opacity-100" : "opacity-0")} />
        
        {/* Stability: Cold blue gloom */}
        <div className={cn("absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_rgba(51,102,204,0.4)_100%)] transition-opacity duration-1000", activeView === 'stability' ? "opacity-100" : "opacity-0")} />
        
        {/* Military: Orange/Yellow tension */}
        <div className={cn("absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_rgba(204,102,0,0.4)_100%)] transition-opacity duration-1000", activeView === 'military' ? "opacity-100" : "opacity-0")} />
        
        {/* Tax: Brownish decay */}
        <div className={cn("absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_10%,_rgba(153,102,51,0.4)_100%)] transition-opacity duration-1000", activeView === 'tax' ? "opacity-100" : "opacity-0")} />
      </div>

      {/* Slide-over Detail Panel */}
      <div 
        className={cn(
          "absolute top-0 bottom-0 right-0 w-80 bg-[#1a1614]/95 backdrop-blur-xl border-l border-[#d49a6a]/30 z-[400] transition-transform duration-300 ease-in-out shadow-2xl",
          activeLocation ? "translate-x-0" : "translate-x-full"
        )}
      >
        {activeLocation && (
          <div className="h-full flex flex-col">
            <div className="p-4 flex items-start justify-between border-b border-[#d49a6a]/20">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg border", getMarkerColor(activeLocation.type))}>
                  {getTypeIcon(activeLocation.type)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#ffcc99]">{activeLocation.name}</h3>
                  <span className="text-xs font-medium uppercase tracking-wider text-[#a88f78]">
                    {activeLocation.type}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setActiveLocation(null)}
                className="p-1.5 text-[#a88f78] hover:text-[#ffcc99] hover:bg-[#d49a6a]/20 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-[#d4c7b8] leading-relaxed text-sm font-serif">
                {activeLocation.description}
              </p>

              <div className="mt-8 pt-6 border-t border-[#d49a6a]/20">
                <h4 className="text-xs font-bold text-[#d49a6a] uppercase tracking-wider mb-4">Related Events & Routes</h4>
                <div className="space-y-4">
                  {mapRelations.filter(r => r.from === activeLocation.id || r.to === activeLocation.id).map(rel => {
                    const isFrom = rel.from === activeLocation.id;
                    const otherNodeId = isFrom ? rel.to : rel.from;
                    const otherNode = mapLocations.find(l => l.id === otherNodeId);
                    
                    return (
                      <div key={rel.id} className="bg-black/40 rounded-md p-3 border border-[#d49a6a]/20 hover:border-[#d49a6a]/50 transition-colors cursor-pointer"
                           onClick={() => {
                             if (otherNode) setActiveLocation(otherNode);
                           }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            rel.type === 'campaign' ? 'bg-[#ff4d4d]' : rel.type === 'route' ? 'bg-[#4da6ff]' : 'bg-[#d49a6a]'
                          )} />
                          <span className="text-sm font-bold text-[#ffcc99]">
                            {isFrom ? 'To' : 'From'}: {otherNode?.name}
                          </span>
                        </div>
                        <p className="text-xs text-[#a88f78] pl-4 font-serif">{rel.description}</p>
                      </div>
                    )
                  })}
                  {mapRelations.filter(r => r.from === activeLocation.id || r.to === activeLocation.id).length === 0 && (
                     <p className="text-xs text-[#8a7a63] italic">No relations recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Strategy Game Overlay */}
      <GameOverlay gameState={gameState as GameState} onStateChange={setGameState} onViewChange={setActiveView} />
    </div>
  );
}
