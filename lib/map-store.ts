import { create } from 'zustand';
export type Point={iata:string;icao?:string;city:string;lat:number;lon:number};
export type Wp={id?:string;lat:number;lon:number};
export type MapView={mode:'idle'}|{mode:'airline';hubs?:Point[];routes:{from:Point;to:Point}[]}|{mode:'route';from:Point;to:Point;waypoints?:Wp[];lock?:boolean;progress?:number}|{mode:'airports';airports:Point[];selected?:string}|{mode:'point';point:Point;nearby:Point[]};
export const useMapStore=create<{view:MapView;exploring:boolean;setExploring:(exploring:boolean)=>void;setView:(view:MapView)=>void;setProgress:(progress:number)=>void}>((set)=>({view:{mode:'idle'},exploring:false,setExploring:(exploring)=>set({exploring}),setView:(view)=>set({view}),setProgress:(progress)=>set(s=>({view:s.view.mode==='route'?{...s.view,progress}:s.view}))}));
