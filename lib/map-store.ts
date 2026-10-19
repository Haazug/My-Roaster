import { create } from 'zustand';
export type Point={iata:string;icao?:string;city:string;lat:number;lon:number};
export type MapView={mode:'idle'}|{mode:'airline';routes:{from:Point;to:Point}[]}|{mode:'route';from:Point;to:Point}|{mode:'airports';airports:Point[];selected?:string}|{mode:'point';point:Point;nearby:Point[]};
export const useMapStore=create<{view:MapView;setView:(view:MapView)=>void}>((set)=>({view:{mode:'idle'},setView:(view)=>set({view})}));
