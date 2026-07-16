export interface WaterFeatureProperties {
  id: string;
  date: string;
  time: string;
  description: string;
  track: string;
  type: string;
  diameter: number;
  length: number;
  joint: string | null;
  station: string | null;
}

export interface WaterFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number, number];
  };
  properties: WaterFeatureProperties;
}

export interface WaterGeoJSON {
  type: 'FeatureCollection';
  features: WaterFeature[];
}
