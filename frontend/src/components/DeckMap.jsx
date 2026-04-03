import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { FlyToInterpolator } from '@deck.gl/core';
import { Map } from 'react-map-gl/maplibre';
import { fetchStreets, fetchDangerZones } from '../services/api';

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const DANGER_COLOR = [255, 77, 109];
const SAFE_COLOR = [0, 229, 255];
const CAUTION_COLOR = [255, 204, 0];
const SHARE_COLOR = [167, 139, 250]; // violet for shared-trip marker

const INITIAL_VIEW_STATE = {
  longitude: 80.2707,
  latitude: 13.0827,
  zoom: 8,
  pitch: 0,
  bearing: 0
};

export default function DeckMap({ currentHour, routeData, onStreetSelect, tripPosition, cinematicMode, sharePosition }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [streetsData, setStreetsData] = useState([]);
  const [dangerZonesData, setDangerZonesData] = useState([]);
  const [time, setTime] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Cinematic mode refs — avoid storing animation scalars in React state
  const cinematicFrameRef = useRef(null);
  const cinematicBearingRef = useRef(-15);
  const cinematicZoomRef = useRef(12);
  const cinematicZoomDirRef = useRef(1);
  const lastCinematicTimeRef = useRef(null);

  // Initial cinematic fly-to animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewState((v) => ({
        ...v,
        zoom: 12,
        pitch: 45,
        bearing: -15,
        transitionDuration: 4000,
        transitionInterpolator: new FlyToInterpolator()
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Request Animation Frame for pulsing signals
  useEffect(() => {
    let animationFrame;
    const animate = (timestamp) => {
      setTime(timestamp);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Cinematic mode camera animation — uses refs to avoid per-frame re-renders of child tree
  useEffect(() => {
    // Cleanup any prior loop
    if (cinematicFrameRef.current) {
      cancelAnimationFrame(cinematicFrameRef.current);
      cinematicFrameRef.current = null;
    }

    if (!cinematicMode) {
      // Gracefully fly back to default view
      setViewState(v => ({
        longitude: v.longitude,
        latitude: v.latitude,
        zoom: 12,
        pitch: 45,
        bearing: -15,
        transitionDuration: 1800,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.5 }),
      }));
      return;
    }

    // Sync refs from current view so we don't jump
    setViewState(v => {
      cinematicBearingRef.current = v.bearing;
      cinematicZoomRef.current = v.zoom;
      return {
        longitude: v.longitude,
        latitude: v.latitude,
        zoom: v.zoom,
        pitch: 50,
        bearing: v.bearing,
        transitionDuration: 1200,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.2 }),
      };
    });

    lastCinematicTimeRef.current = null;

    const loop = (now) => {
      if (lastCinematicTimeRef.current === null) {
        lastCinematicTimeRef.current = now;
      }
      const delta = Math.min(now - lastCinematicTimeRef.current, 64); // cap at ~4 frames
      lastCinematicTimeRef.current = now;

      // Slowly rotate bearing
      cinematicBearingRef.current += 0.022 * (delta / 16);

      // Gently oscillate zoom between 11.5 ↔ 12.5
      cinematicZoomRef.current += 0.0015 * cinematicZoomDirRef.current * (delta / 16);
      if (cinematicZoomRef.current >= 12.5) {
        cinematicZoomRef.current = 12.5;
        cinematicZoomDirRef.current = -1;
      } else if (cinematicZoomRef.current <= 11.5) {
        cinematicZoomRef.current = 11.5;
        cinematicZoomDirRef.current = 1;
      }

      setViewState(v => ({
        longitude: v.longitude,
        latitude: v.latitude,
        pitch: 50,
        bearing: cinematicBearingRef.current,
        zoom: cinematicZoomRef.current,
      }));

      cinematicFrameRef.current = requestAnimationFrame(loop);
    };

    // Small delay so the pitch transition starts before rotation begins
    const startTimer = setTimeout(() => {
      cinematicFrameRef.current = requestAnimationFrame(loop);
    }, 1200);

    return () => {
      clearTimeout(startTimer);
      if (cinematicFrameRef.current) {
        cancelAnimationFrame(cinematicFrameRef.current);
        cinematicFrameRef.current = null;
      }
    };
  }, [cinematicMode]);

  // Fetch data cleanly on hour change
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [streetsReq, dangerReq] = await Promise.all([
          fetchStreets(),
          fetchDangerZones(currentHour)
        ]);
        if (active) {
          console.log('[DeckMap] Streets loaded:', streetsReq?.length, 'Sample:', streetsReq?.[0]);
          console.log('[DeckMap] Danger zones loaded:', dangerReq?.length);
          setStreetsData(streetsReq || []);
          setDangerZonesData(dangerReq || []);
        }
      } catch (err) {
        console.error('Failed to fetch map data:', err);
      }
    };
    loadData();
    return () => { active = false; };
  }, [currentHour]);

  // Transform route data to be path-layer compatible
  const safeRoutePath = useMemo(() => {
    let pathSegments = [];

    // Backend real API structure
    if (routeData && Array.isArray(routeData.route)) {
        const steps = routeData.route;
        for (let i = 0; i < steps.length - 1; i++) {
            const start = steps[i];
            const end = steps[i+1];
            
            const isDanger = end.zone === 'DANGER' || start.zone === 'DANGER';
            const isCaution = end.zone === 'CAUTION' || start.zone === 'CAUTION';
            let color = SAFE_COLOR;
            if (isDanger) color = DANGER_COLOR;
            else if (isCaution) color = CAUTION_COLOR;

            pathSegments.push({
                path: [[start.lng, start.lat], [end.lng, end.lat]],
                color,
                isDash: isDanger,
                name: start.street_name
            });
        }
        return pathSegments;
    } 

    if (!routeData || !routeData.segments || !routeData.waypoints) return [];

    const waypointMap = new Map(routeData.waypoints.map(wp => [wp.street_id, [wp.lng, wp.lat]]));
    
    return routeData.segments.map(seg => {
      const startCoord = waypointMap.get(seg.from);
      const endCoord = waypointMap.get(seg.to);
      if (!startCoord || !endCoord) return null;

      const isDanger = seg.zone === 'DANGER';
      const isCaution = seg.zone === 'CAUTION';
      let color = SAFE_COLOR;
      if (isDanger) color = DANGER_COLOR;
      else if (isCaution) color = CAUTION_COLOR;

      return {
        path: [startCoord, endCoord],
        color,
        isDash: isDanger,
        name: seg.from_name
      };
    }).filter(Boolean);
  }, [routeData]);

  // Memoize layers to avoid unnecessary recalculations
  const layers = useMemo(() => {
    let layersArr = [
      new ScatterplotLayer({
        id: 'safety-marks-layer',
        data: streetsData,
        getPosition: d => [Number(d.lng || d.longitude) || 0, Number(d.lat || d.latitude) || 0],
        getFillColor: d => {
          const score = Number(d.safety_score) || 100;
          if (score < 40) return [...DANGER_COLOR, 200];
          if (score < 70) return [...CAUTION_COLOR, 200];
          return [...SAFE_COLOR, 200];
        },
        getRadius: d => {
          const score = Number(d.safety_score) || 100;
          // Scale size inversely with safety to draw attention to risky areas
          return (100 - score) * 2 + 50; 
        },
        radiusMinPixels: 3,
        radiusMaxPixels: 25,
        pickable: true,
        stroked: true,
        getLineColor: [255, 255, 255, 120],
        lineWidthMinPixels: 1,
        onHover: info => setHoverInfo(info),
        onClick: info => {
          if (info && info.object && typeof onStreetSelect === 'function') {
            onStreetSelect(info.object);
          }
        },
        transitions: {
          getFillColor: 600,
          getRadius: 600
        }
      }),

      // Outer pulsing ring for danger zones (enhanced in cinematic mode)
      new ScatterplotLayer({
        id: 'danger-pulse-layer',
        data: dangerZonesData,
        getPosition: d => [d.lng || d.longitude, d.lat || d.latitude],
        getRadius: d => (cinematicMode ? 160 : 100) + Math.abs(Math.sin(time / 300)) * (cinematicMode ? 220 : 150),
        getFillColor: [...DANGER_COLOR, cinematicMode ? 110 : 80],
        stroked: true,
        getLineColor: [...DANGER_COLOR, cinematicMode ? 200 : 150],
        getLineWidth: cinematicMode ? 6 : 4,
        updateTriggers: {
          getRadius: time,
          getFillColor: cinematicMode,
          getLineColor: cinematicMode,
        },
        transitions: {
          getRadius: { duration: 0 }
        }
      }),

      // Inner solid dot for danger zones
      new ScatterplotLayer({
        id: 'danger-inner-layer',
        data: dangerZonesData,
        getPosition: d => [d.lng || d.longitude, d.lat || d.latitude],
        getRadius: 80,
        getFillColor: [...DANGER_COLOR, 255],
        stroked: false
      }),

      // Safe Route Layer
      new PathLayer({
        id: 'safe-route-layer',
        data: safeRoutePath,
        pickable: true,
        widthScale: 20,
        widthMinPixels: 4,
        widthMaxPixels: 12,
        getPath: d => d.path,
        getColor: d => d.color,
        getWidth: d => 1,
        getDashArray: d => d.isDash ? [4, 3] : [0, 0],
        dashJustified: true,
        rounded: true,
        extensions: [new PathStyleExtension({ dash: true })]
      })
    ];

    if (tripPosition && tripPosition.lng && tripPosition.lat) {
       layersArr.push(
         new ScatterplotLayer({
           id: 'trip-user-layer',
           data: [tripPosition],
           getPosition: d => [d.lng, d.lat],
           getFillColor: [0, 245, 212, 255], 
           getRadius: d => 120 + Math.abs(Math.sin(time / 200)) * 60, // Pulsing radius
           stroked: true,
           getLineColor: [255, 255, 255, 200],
           getLineWidth: 4,
           updateTriggers: {
              getRadius: time
           },
           transitions: {
              getPosition: { duration: 1500 } // smooth transition between steps
           }
         }),
         new ScatterplotLayer({
           id: 'trip-user-inner-layer',
           data: [tripPosition],
           getPosition: d => [d.lng, d.lat],
           getFillColor: [255, 255, 255, 255], 
           getRadius: 50,
           stroked: false,
           transitions: {
              getPosition: { duration: 1500 }
           }
         })
       );
    }

    // Shared-trip violet marker
    if (sharePosition && sharePosition.lng && sharePosition.lat) {
      layersArr.push(
        new ScatterplotLayer({
          id: 'share-position-pulse',
          data: [sharePosition],
          getPosition: d => [d.lng, d.lat],
          getFillColor: [...SHARE_COLOR, 80],
          getRadius: 160 + Math.abs(Math.sin(time / 250)) * 80,
          stroked: true,
          getLineColor: [...SHARE_COLOR, 180],
          getLineWidth: 3,
          updateTriggers: { getRadius: time },
          transitions: { getPosition: { duration: 2000 } },
        }),
        new ScatterplotLayer({
          id: 'share-position-dot',
          data: [sharePosition],
          getPosition: d => [d.lng, d.lat],
          getFillColor: [...SHARE_COLOR, 255],
          getRadius: 55,
          stroked: true,
          getLineColor: [255, 255, 255, 200],
          getLineWidth: 3,
          transitions: { getPosition: { duration: 2000 } },
        })
      );
    }
    
    return layersArr;
  }, [streetsData, dangerZonesData, safeRoutePath, time, tripPosition, cinematicMode, sharePosition]);

  const renderTooltip = useCallback(() => {
    if (!hoverInfo || !hoverInfo.object) return null;

    const { object, x, y } = hoverInfo;
    const displayData = object;
    const rawScore = displayData.safety_score ?? 100;
    const safetyScore = Number(rawScore) || 100;

    // Use absolute positioning with transform to avoid edge clipping
    const style = {
      position: 'absolute',
      left: x + 15,
      top: y + 15,
      pointerEvents: 'none',
      zIndex: 10,
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      padding: '14px 18px',
      color: '#fff',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
      minWidth: '220px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    };

    return (
      <div style={style}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: safetyScore >= 70 ? `rgb(${SAFE_COLOR.join(',')})` : 
                           safetyScore >= 40 ? `rgb(${CAUTION_COLOR.join(',')})` : 
                           `rgb(${DANGER_COLOR.join(',')})` 
          }} />
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', letterSpacing: '0.3px', flex: 1 }}>
            {displayData.street_name || displayData.name || 'Active Segment'}
          </h4>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'baseline' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 'bold', uppercase: 'true', tracking: '0.5px' }}>Safety Index</span>
          <span style={{ 
            fontSize: '18px',
            fontWeight: '900', 
            color: safetyScore >= 70 ? `rgb(${SAFE_COLOR.join(',')})` : 
                   safetyScore >= 40 ? `rgb(${CAUTION_COLOR.join(',')})` : 
                   `rgb(${DANGER_COLOR.join(',')})`
          }}>
            {safetyScore.toFixed(0)}%
          </span>
        </div>

        {displayData.explanation && typeof displayData.explanation === 'string' && (
          <div style={{ 
            fontSize: '12px', 
            lineHeight: '1.5',
            color: 'rgba(255,255,255,0.8)', 
            borderTop: '1px solid rgba(255,255,255,0.1)', 
            paddingTop: '10px', 
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
            “{displayData.explanation.split('.')[0]}.”
          </div>
        )}
      </div>
    );
  }, [hoverInfo]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
        getCursor={({ isDragging }) => (isDragging ? 'grabbing' : 'crosshair')}
      >
        <Map
          reuseMaps
          mapStyle={MAP_STYLE}
          preventStyleDiffing={true}
        />
      </DeckGL>
      {renderTooltip()}
    </div>
  );
}
