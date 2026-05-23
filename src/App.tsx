import type { ChangeEvent, SyntheticEvent } from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import type { Schema } from "../amplify/data/resource";
import { checkLoginAndGetName } from "./utils/AuthUtils";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import type { SelectionSet } from "aws-amplify/data";
import "@aws-amplify/ui-react/styles.css";
import { uploadData, remove } from "aws-amplify/storage";

import type { MapMouseEvent } from "mapbox-gl";


import 'mapbox-gl/dist/mapbox-gl.css';
//import { useGeoJSON } from './useGeoJSON';

import type { WaterFeatureProperties } from './types';
import './MapView.css';

//import { MapboxOverlay, MapboxOverlayProps } from "@deck.gl/mapbox/typed";
//import { PickingInfo } from "@deck.gl/core/typed";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  Map,
  Source,
  Layer,
  //useControl,
  //Popup,
  Marker,
  NavigationControl,
  GeolocateControl,
  ScaleControl,
  Popup
} from "react-map-gl";



import "mapbox-gl/dist/mapbox-gl.css";


import {
  Input,
  Flex,
  Button,
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
  ThemeProvider,
  Theme,
  Divider,
  Tabs,
  SelectField,
  ScrollView,
  Radio,
  RadioGroupField,
  //CheckboxField,
  // TextField,
} from "@aws-amplify/ui-react";


//import { IconLayer } from "@deck.gl/layers/typed";


//import type { WaterFeatureProperties } from './types';
import './FeaturePopup.css';
const MAPBOX_TOKEN ="pk.eyJ1IjoicWlhb3hpbjEzNiIsImEiOiJjbGU1eXcyYTMwaHRyM29tc2dncjR6ZTBhIn0.8Wa3AEGbUSnau7PCEV3Stg" ;

const client = generateClient<Schema>();

const locationSelectionSet = [
  'id', 'date', 'time', 'track', 'type', 'diameter',
  'length', 'lat', 'lng', 'username', 'description',
  'photos', 'joint', 'createdAt', 'updatedAt',
] as const;
type LocationItem = SelectionSet<Schema['Location']['type'], typeof locationSelectionSet>;

const dateSelectionSet = [
  'id', 'date', 'weather', 'hight', 'lowt', 'supervisor',
  'labor', 'observation', 'remark', 'comment', 'equipment',
  'locationId', 'createdAt', 'updatedAt',
] as const;
type DateItem = SelectionSet<Schema['Date']['type'], typeof dateSelectionSet>;


const theme: Theme = {
  name: "table-theme",
  tokens: {
    components: {
      table: {
        row: {
          hover: {
            backgroundColor: { value: "{colors.blue.20}" },
          },

          striped: {
            backgroundColor: { value: "{colors.orange.10}" },
          },
        },

        header: {
          color: { value: "{colors.blue.80}" },
          fontSize: { value: "{fontSizes.x3}" },
          borderColor: { value: "{colors.blue.20}" },
        },

        data: {
          fontWeight: { value: "{fontWeights.semibold}" },
        },
      },
    },
  },
};

// type DataT = {
//   type: "Feature";
//   id: number;
//   geometry: {
//     type: "Point";
//     coordinates: [number, number, number];
//   };
//   properties: {
//     track: number;
//     type: string;
//     status: string;
//     date: string;
//     time: string;
//     id: string;
//   };
// };

type SelectOption = {
  value: string;
  label: string;
};



// Hong's addition
export type CustomEvent = {
  target: HTMLInputElement
}
// Hong's addition end

//const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
// "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";



interface PopupInfo {
  longitude: number;
  latitude: number;
  properties: WaterFeatureProperties;
}


function App() {

  const { signOut } = useAuthenticator();
  //const client = generateClient<Schema>();
  const [location, setLocation] = useState<LocationItem[]>([]);

  // Build a GeoJSON FeatureCollection directly from Amplify location state.
  // This replaces the external API URL (AIR_PORTS) which was returning
  // malformed JSON with invalid control characters, causing no points to render.
  const locationGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: location
      .filter(loc => loc.lat != null && loc.lng != null)
      .map(loc => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [loc.lng!, loc.lat!] },
        properties: {
          id:          loc.id,
          date:        loc.date ?? '',
          time:        loc.time ?? '',
          track:       loc.track ?? null,
          type:        loc.type ?? '',
          diameter:    loc.diameter ?? null,
          length:      loc.length ?? null,
          description: loc.description ?? '',
          joint:       loc.joint ?? null,
        },
      })),
  }), [location]);

  const [jointMap, setJointMap] = useState<Record<string, string | null>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  //const [report, setReport] = useState("");
  const [track, setTrack] = useState<number>(0);
  const [type, setType] = useState<string>("reuse");
  const [diameter, setDiameter] = useState<number>(0);
  const [length, setLength] = useState<number>(0);
  const [userName, setUserName] = useState<string>();
  const [description, setDescription] = useState<string>("");
  const [joint, setJoint] = useState<string>("joint");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [placePhotos, setPlacePhotos] = useState<File[]>([]);

  const [tab, setTab] = useState("1");
  const [basemap, setBasemap] = useState("mapbox://styles/mapbox/streets-v12");
  const [pdfMode, setPdfMode] = useState(false);
  const [calResult, setCalResult] = useState<number | null>(null);

  //const [clickInfo, setClickInfo] = useState<DataT>();
  //const [showPopup, setShowPopup] = useState<boolean>(true);


  //const { data } = useGeoJSON();
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [cursor, setCursor] = useState<string>('grab');
  const [editTrack, setEditTrack] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editDiameter, setEditDiameter] = useState<string>('');
  const [editType, setEditType] = useState<string>('reuse');
  const [editJoint, setEditJoint] = useState<string>("joint");
  const [editDate, setEditDate] = useState<string>('');

  const [dateInfoList, setDateInfoList] = useState<DateItem[]>([]);
  const [diWeather, setDiWeather] = useState("");
  const [diHight, setDiHight] = useState<number | "">("");
  const [diLowt, setDiLowt] = useState<number | "">("");
  const [diSupervisor, setDiSupervisor] = useState("");
  const [diLabor, setDiLabor] = useState<number | "">("");
  const [diObservation, setDiObservation] = useState("");
  const [diRemark, setDiRemark] = useState("");
  const [diComment, setDiComment] = useState("");
  const [diEquipment, setDiEquipment] = useState("");



  const options: SelectOption[] = [
    { value: 'reuse', label: 'Reuse' },
    { value: 'water', label: 'Water' },
    { value: 'wastewater', label: 'Wastewater' },
    { value: 'stormwater', label: 'Stormwater' },
    { value: 'pavement', label: 'Pavement' }
  ];

  //console.log(AIR_PORTS);


  const handleDate = (e: ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  const handleTime = (e: ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

  const handleTrack = (e: ChangeEvent<HTMLInputElement>) => {
    setTrack(parseInt(e.target.value));
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    //console.log(value);
    setType(value);
  }

  const handleDiameter = (e: ChangeEvent<HTMLInputElement>) => {
    setDiameter(parseInt(e.target.value));
  }



  const handleUserName = async () => {
    const name = await checkLoginAndGetName();
    //console.log((name));
    if (name) {
      setUserName(name)
    }
  }

  const handleDescription = (e: ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  }

  useEffect(() => {
    // Exclude 'comments' (a.ref custom type) from the selection set.
    // When comments is included, observeQuery's internal findIndexByFields
    // crashes with "Cannot read properties of null (reading 'id')" whenever
    // a record is updated and comments is null.
    const sub = client.models.Location.observeQuery({
      selectionSet: [...locationSelectionSet],
    }).subscribe({
      next: (data) => setLocation([...data.items]),
      error: (err) => console.error('observeQuery error:', err),
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = client.models.Date.observeQuery({
      selectionSet: [...dateSelectionSet],
    }).subscribe({
      next: (data) => setDateInfoList([...data.items]),
      error: (err) => console.error('Date observeQuery error:', err),
    });
    return () => sub.unsubscribe();
  }, []);

  // Build jointMap directly from Amplify location state (no external fetch needed).
  useEffect(() => {
    const map: Record<string, string | null> = {};
    location.forEach(loc => { map[loc.id] = loc.joint ?? null; });
    setJointMap(map);
  }, [location]);

  useEffect(() => {
    handleUserName();
  }, []);



  function createLocation() {
    handleUserName();
    //console.log(typeof userName);
    //console.log("Username:", userName);
    const name = userName
    //console.log(name);
    client.models.Location.create({
      date: date,
      time: time,
      track: track,
      type: type,
      diameter: diameter,
      length: calResult !== null ? calResult : length,
      username: name,
      description: description,


      lat: lat,
      lng: lng,
      joint: joint,

    });
    setDate("");
    setTime("");
    setTrack(track);
    setType(type);
    setDiameter(diameter);
    setUserName("");
    setDescription("");
    setLat(0);
    setLng(0);
  }

  async function deleteLocation2(id: string, photourls: (string | null)[]):
    Promise<{
      response: number
      info: string
    }> {
    console.log('called delete location ')
    console.log("id=", id)
    console.log("photourl=", photourls)

    photourls.forEach(
      async (aPath) => {
        if (aPath)
          try {
            await remove({ path: aPath })
          } catch (error) {
            console.error('Error deleting photoes:', error);
            return { response: 299, info: 'failed' }
          }
      }
    )


    client.models.Location.delete({ id })

    return { response: 200, info: 'success' };
    /*
    const result = await deleteLocationPhotos(id)
    if (result.response == 200 ) {
      client.models.Location.delete({ id })
    }else {
      console.log(" error to delete photos ")
    }*/
  }

  async function deleteLocation(id: string) {
    const result = await deleteLocationPhotos(id)
    console.log("result =", result.response)
    if (result.response == 200) {
      client.models.Location.delete({ id })
    } else {
      console.log(" error to delete photos ")
    }
  }





  async function handleSubmit(event: SyntheticEvent, id: string) {
    event.preventDefault();

    let placePhotosUrls: string[] = [];
    console.log("before submit, photoes size ", placePhotos.length);
    const uploadResult = await uploadPhotos(placePhotos, id);
    placePhotosUrls = uploadResult.urls;

    const currentLoc = await client.models.Location.get({ id });

    let revised: string[] = [];
    if (currentLoc.data?.photos) {
      currentLoc.data.photos.forEach(d => { if (d) revised.push(d); });
    }

    await client.models.Location.update({
      id: id,
      photos: [...placePhotosUrls, ...revised]
    });

    clearFields();
  }

  function clearFields() {
    //setuserName('');
    setPlacePhotos([]);
  }

  async function uploadPhotos(files: File[], id: string): Promise<{
    urls: string[]

  }> {
    const urls: string[] = [];
    console.log('start to upload photos')
    console.log('# of files', files.length)

    for (const file of files) {
      console.log(`uploading file ${file.name}`)
      const result = await uploadData({
        data: file,
        path: `originals/${id}/${file.name}`
      }).result
      urls.push(result.path);
      console.log('url is ', urls);

    }
    return {
      urls,

    };
  }

  //Hong's addition
  function previewPhotos(event: CustomEvent) {

    if (event.target.files) {
      const eventPhotos = Array.from(event.target.files);
      //const newFiles: File[] = [...new Set([...eventPhotos, ...placePhotos])]
      //console.log("newFiles =", newFiles)
      //setPlacePhotos(newFiles);
      setPlacePhotos(eventPhotos)
    }
  }

  async function deleteLocationPhotos(locId: string): Promise<{
    response: number
    info: string
  }> {
    console.log("Loc Id = " + locId)
    if (location) {
      try {

        await remove({ path: `originals/${locId}` })
      } catch (error) {
        console.error('Error deleting photoes:', error);
        return { response: 299, info: 'failed' }
      }
    }
    return { response: 200, info: 'success' };
  }

  //end Hong's addition

  async function handleUpdatePopup(id: string) {
    // Use raw GraphQL to bypass the Amplify Gen 2 client-side field-validation
    // bug triggered by the `comments: a.ref('Comment').array()` custom type.
    const mutation = /* GraphQL */ `
      mutation UpdateLocation($input: UpdateLocationInput!) {
        updateLocation(input: $input) {
          id
          date
          track
          type
          diameter
          description
          joint
        }
      }
    `;
    try {
      const input: Record<string, unknown> = { id };
      input.date        = editDate;
      input.type        = editType;
      input.description = editDescription;
      input.joint       = editJoint;
      const parsedTrack    = parseInt(editTrack);
      const parsedDiameter = parseFloat(editDiameter);
      if (editTrack    !== '' && !isNaN(parsedTrack))    input.track    = parsedTrack;
      if (editDiameter !== '' && !isNaN(parsedDiameter)) input.diameter = parsedDiameter;

      console.log('Updating via GraphQL:', input);
      const result = await (client as any).graphql({ query: mutation, variables: { input } });
      console.log('Update result:', result);

      // Manually patch local state so the UI reflects the change immediately,
      // independent of the observeQuery subscription which can crash on custom types.
      const { data: fresh } = await client.models.Location.get({ id });
      if (fresh) {
        setLocation(prev => prev.map(loc => loc.id === id ? fresh : loc));
      }
      setPopupInfo(null);
    } catch (err) {
      console.error('Update exception:', err);
      alert('Save failed: ' + String(err));
    }
  }

  function haversineDistanceFt(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 20902464; // Earth radius in feet
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function createDateInfo() {
    if (!date) return;
    client.models.Date.create({
      date,
      weather: diWeather || undefined,
      hight: diHight !== "" ? Number(diHight) : undefined,
      lowt: diLowt !== "" ? Number(diLowt) : undefined,
      supervisor: diSupervisor || undefined,
      labor: diLabor !== "" ? Number(diLabor) : undefined,
      observation: diObservation || undefined,
      remark: diRemark || undefined,
      comment: diComment || undefined,
      equipment: diEquipment || undefined,
    });
    setDiWeather("");
    setDiHight("");
    setDiLowt("");
    setDiSupervisor("");
    setDiLabor("");
    setDiObservation("");
    setDiRemark("");
    setDiComment("");
    setDiEquipment("");
  }

  function handleCal() {
    const sameTrack = location.filter(loc => loc.track === track);
    if (sameTrack.length === 0) {
      setCalResult(0);
      return;
    }

    // Find the point with the latest combined date+time on the same track
    let latest: LocationItem | null = null;
    let latestDT = "";
    for (const loc of sameTrack) {
      const dt = (loc.date ?? "") + "T" + (loc.time ?? "");
      if (dt > latestDT) {
        latestDT = dt;
        latest = loc;
      }
    }

    if (!latest || latest.lat == null || latest.lng == null) {
      setLength(0);
      setCalResult(0);
      return;
    }

    setCalResult(haversineDistanceFt(lat, lng, latest.lat, latest.lng));
  }

  const onClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];

    //console.log("clicked feature =", feature);
    if (feature?.layer?.id === 'lines' && pdfMode) {
      const dn = feature.properties?.DN;
      if (dn != null) {
        window.open(`https://bcwws-reuse.s3.us-east-1.amazonaws.com/FM${dn}.pdf`, '_blank');
      }
      return;
    }

    if (!feature || feature.geometry.type !== 'Point') {
      //console.log(e);
      setLat(e.lngLat.lat);
      setLng(e.lngLat.lng);
      setPopupInfo(null);
    }
    else {

      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties as WaterFeatureProperties;
      const match = location.find(loc => loc.id === props.id);
      setPopupInfo({
        longitude: lng,
        latitude: lat,
        properties: { ...props, joint: match?.joint ?? null },
      });
      setEditTrack(props.track != null ? String(props.track) : '');
      setEditDescription(props.description ?? '');
      setEditDiameter(props.diameter != null ? String(props.diameter) : '');
      setEditType(props.type ?? 'reuse');
      setEditJoint(typeof match?.joint === 'string' ? match.joint : 'joint');
      setEditDate(match?.date ?? props.date ?? '');
    };
  }, [location, pdfMode]);

  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => setCursor('grab'), []);

  const change_basemap = (value: string) => {
    if (value === "light") {
      setBasemap("mapbox://styles/mapbox/light-v11")
    } else if (value === "street") {
      setBasemap("mapbox://styles/mapbox/streets-v12")
    } else if (value === "satellite") {
      setBasemap("mapbox://styles/hazensawyer/clf4dasal001301qvxatwv8md")
    }
  };

  return (
    <main>
      <h1>BCWWS REGIONAL EFFLUENT AND REUSE SOLUTIONS - EFFLUENT WATER TRANSMISSION MAIN</h1>
      <Divider orientation="horizontal" />
      <br />
      <Flex>
        <Button onClick={signOut} width={120}>
          Sign out
        </Button>
        <Button onClick={createLocation} backgroundColor={"azure"} color={"red"}>
          + new
        </Button>
        <Button onClick={handleCal} backgroundColor={"lightyellow"} color={"darkblue"}>
          Cal
        </Button>
        {calResult !== null && (
          <span style={{ alignSelf: "center", fontWeight: "bold" }}>
            Distance: {calResult.toFixed(1)} ft
          </span>
        )}
      </Flex>
      <br />
      <Flex direction="row">

        <input
          type="date"
          value={date}
          placeholder="date"
          onChange={handleDate}
        //width="150%"
        />
        <input
          type="time"
          value={time}
          placeholder="time"
          onChange={handleTime}
        //width="150%"
        />
        <input
          type="number"
          value={track}
          placeholder="track"
          onChange={handleTrack}
        //width="150%"
        />
        <SelectField
          label="Select an option"
          labelHidden={true}
          value={type}
          onChange={handleSelectChange}
        //width="100%"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>


        <input
          type="number"
          value={diameter}
          placeholder="diameter (in)"
          onChange={handleDiameter}
        //width="150%"
        />
  
        <Input
          type="text"
          value={description}
          placeholder="description"
          onChange={handleDescription}
          width="800px"
        />
        <select
          value={joint}
          onChange={e => setJoint(e.target.value)}
        >
          <option value="joint">Joint</option>
          <option value="bend">Bend</option>
          <option value="valve">Valve</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={pdfMode}
            onChange={e => setPdfMode(e.target.checked)}
          />
          {pdfMode ? 'PDF Mode' : 'Marker Mode'}
        </label>
        {/* <Input type="number" value={Number(lat.toFixed(10))} />
        <Input type="number" value={Number(lng.toFixed(10))} /> */}
      </Flex>
      <Divider orientation="horizontal" />
      <br />
      <Tabs
        value={tab}
        onValueChange={(tab) => setTab(tab)}
        items={[
          {
            label: "History Map",
            value: "1",
            content: (<>
              <Map
                initialViewState={{
                  longitude: -80.13289123074017,
                  latitude: 26.260443058928075,
                  zoom: 16,
                }}
                mapboxAccessToken={MAPBOX_TOKEN}
                //mapLib={maplibregl}
                mapStyle={basemap} // Use any MapLibre-compatible style

                style={{
                  width: "100%",
                  height: "1000px",
                  borderColor: "#000000",
                }}
                interactiveLayerIds={['water-points', 'lines']}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                cursor={cursor}
              >
                <Source id="water-data" type="geojson" data={locationGeoJSON}>

                  <Layer
                    id='water-points'
                    type='circle'
                    source='water-data'
                    paint={{
                      'circle-radius': [
                        'case',
                        ['all', ['any', ['==', ['get', 'type'], 'wastewater'], ['==', ['get', 'type'], 'stormwater']], ['==', ['get', 'joint'], false]],
                        5,
                        ['all', ['any', ['==', ['get', 'type'], 'wastewater'], ['==', ['get', 'type'], 'stormwater']], ['==', ['get', 'joint'], true]],
                        3.5,
                        3.5
                      ],
                      'circle-color': [
                        'match',
                        ['get', 'type'],
                        'reuse', '#b12bbd',
                        'water', '#2b6cb0',
                        "wastewater", '#2ea160',
                        "stormwater", '#eca4a4',
                        "pavement", '#a0a0a0',  '#2b6cb0'
                      ]/* '#2b6cb0' */,
                      'circle-stroke-color': '#ffffff',
                      'circle-stroke-width': 2,
                      'circle-opacity': 0.9,
                    }}
                  />
                </Source>

                <Source id="lines" type="vector" url="mapbox://qiaoxin136.6712mnvq">
                  <Layer
                    id='lines'
                    type='line'
                    source='lines'
                    source-layer="line-34gbbu"
                    paint={{
                      'line-width': 1,
                      // Use a get expression (https://docs.mapbox.comhttps://docs.mapbox.com/style-spec/reference/expressions/#get)
                      // to set the line-color to a feature property value.
                      'line-color': "#c7a0ca",
                      'line-dasharray': [4, 2]
                    }}
                  />
                </Source>
                <Source id="tick" type="vector" url="mapbox://qiaoxin136.3axmzn09">
                  <Layer
                    id='tick'
                    type='line'
                    source='tick'
                    source-layer="tick-d0etve"
                    paint={{
                      'line-width': 1,
                      // Use a get expression (https://docs.mapbox.comhttps://docs.mapbox.com/style-spec/reference/expressions/#get)
                      // to set the line-color to a feature property value.
                      'line-color': "#959796",
                      'line-dasharray': [4, 2]
                    }}
                  />
                </Source>

                <Source id="station" type="geojson" data="/station.geojson">
                  <Layer
                    id="station-points"
                    type="circle"
                    source="station"
                    paint={{
                      'circle-radius': 1,
                      'circle-color': '#e85d04',
                    }}
                  />
                  <Layer
                    id="station-labels"
                    type="symbol"
                    source="station"
                    layout={{
                      'text-field': ['get', 'Text'],
                      'text-size': 10,
                      'text-offset': [0, 1],
                      'text-anchor': 'top',
                    }}
                    paint={{
                      'text-color': '#000000',
                      'text-halo-color': '#ffffff',
                      'text-halo-width': 1,
                    }}
                  />
                </Source>

                <Marker latitude={Number(lat)} longitude={Number(lng)} />
                {popupInfo && (
                  <>
                    <Popup
                      longitude={popupInfo.longitude}
                      latitude={popupInfo.latitude}
                      anchor="bottom"
                      offset={12}
                      onClose={() => setPopupInfo(null)}
                      closeOnClick={false}
                    >
                      <div className="popup">
                        <h3 className="popup-title">
                          <span className="popup-type-badge">{popupInfo.properties.type}</span>
                          Water Infrastructure
                        </h3>
                        <table className="popup-table">
                          <tbody>
                            <tr>
                              <td>Date</td>
                              <td>
                                <input
                                  aria-label="Date"
                                  type="date"
                                  value={editDate}
                                  onChange={e => setEditDate(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px', width: '100%' }}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Type</td>
                              <td>
                                <select
                                  aria-label="Type"
                                  value={editType}
                                  onChange={e => setEditType(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px', width: '100%' }}
                                >
                                  <option value="reuse">reuse</option>
                                  <option value="water">water</option>
                                  <option value="wastewater">wastewater</option>
                                  <option value="stormwater">stormwater</option>
                                  <option value="pavement">pavement</option>
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <td>Track</td>
                              <td>
                                <input
                                  aria-label="Track"
                                  type="number"
                                  value={editTrack}
                                  onChange={e => setEditTrack(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px', width: '100%' }}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Diameter</td>
                              <td>
                                <input
                                  aria-label="Diameter"
                                  type="number"
                                  value={editDiameter}
                                  onChange={e => setEditDiameter(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px', width: '100%' }}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Description</td>
                              <td>
                                <input
                                  aria-label="Description"
                                  type="text"
                                  value={editDescription}
                                  onChange={e => setEditDescription(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px', width: '100%' }}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Joint</td>
                              <td>
                                <select
                                  value={editJoint}
                                  onChange={e => setEditJoint(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px' }}
                                >
                                  <option value="joint">Joint</option>
                                  <option value="bend">Bend</option>
                                  <option value="valve">Valve</option>
                                </select>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdatePopup(popupInfo.properties.id); }}
                          style={{
                            fontSize: '11px', padding: '2px 8px', cursor: 'pointer',
                            border: '1px solid #2b6cb0', borderRadius: '3px',
                            background: '#fff', color: '#2b6cb0',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            deleteLocation(popupInfo.properties.id);
                            setPopupInfo(null);
                          }}
                          style={{
                            fontSize: '11px', padding: '2px 8px', cursor: 'pointer',
                            border: '1px solid #c00', borderRadius: '3px',
                            background: '#fff', color: '#c00',
                          }}
                        >
                          Delete
                        </button>
                        </div>
                        <br /><br />
                        <label style={{ fontSize: '11px' }}>Place photos:</label><br />
                        <input type="file" multiple
                          onChange={(e) => previewPhotos(e)}
                          placeholder="new picture"
                          style={{ fontSize: '11px' }}
                        /><br /><br />
                        <button
                          onClick={(e) => {
                            console.log(popupInfo.properties);
                            handleSubmit(e, popupInfo.properties.id);
                            setPopupInfo(null);
                          }}
                          style={{
                            fontSize: '11px', padding: '2px 8px', cursor: 'pointer',
                            border: '1px solid #555', borderRadius: '3px',
                            background: '#fff', color: '#333',
                          }}
                        >
                          Upload
                        </button>
                        <br /><br />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdatePopup(popupInfo.properties.id); }}
                          style={{
                            fontSize: '12px', padding: '4px 16px', cursor: 'pointer',
                            border: '1px solid #2b6cb0', borderRadius: '4px',
                            background: '#2b6cb0', color: '#fff', fontWeight: 600,
                            width: '100%',
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </Popup>

                  </>

                )}
                <NavigationControl position="top-right" />
                <ScaleControl position="bottom-right" unit='imperial' maxWidth={500} />
                <GeolocateControl position="top-right" positionOptions={{ enableHighAccuracy: true }}
                  trackUserLocation={true}
                  // Draw an arrow next to the location dot to indicate which direction the device is heading.
                  showUserHeading={true} />
                <RadioGroupField legend="Row" name="row" direction="row" onChange={(e) => change_basemap(e.target.value)} defaultValue="street">
                  <Radio value="light" >Light</Radio>
                  <Radio value="street">Street</Radio>
                  <Radio value="satellite">Satellite</Radio>
                </RadioGroupField>
                <div style={{
                  position: 'absolute',
                  bottom: '40px',
                  left: '10px',
                  background: 'rgba(255,255,255,0.92)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.25)',
                  fontSize: '12px',
                  lineHeight: '1',
                  zIndex: 1,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '12px' }}>Legend</div>
                  {([
                    { label: 'Reuse',       color: '#b12bbd' },
                    { label: 'Water',       color: '#2b6cb0' },
                    { label: 'Wastewater',  color: '#2ea160' },
                    { label: 'Stormwater',  color: '#eca4a4' },
                    { label: 'Pavement',    color: '#a0a0a0' },
                  ] as { label: string; color: string }[]).map(({ label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: color, border: '2px solid #fff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                        flexShrink: 0,
                      }} />
                      {label}
                    </div>
                  ))}
                </div>
              </Map>
            </>)
          },
          {
            label: "History Data",
            value: "2",
            content: (<>
              <ScrollView
                as="div"
                ariaLabel="View example"
                backgroundColor="var(--amplify-colors-white)"
                borderRadius="6px"
                color="var(--amplify-colors-blue-60)"
                padding="1rem"
                height="700px"
              >
                <ThemeProvider theme={theme} colorMode="light">
                  <Table caption="" highlightOnHover={false} variation="striped"
                    style={{
                      //tableLayout: 'fixed',
                      width: '100%',
                      fontFamily: 'Arial, sans-serif',
                    }}>
                    <TableHead>
                      <TableRow>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Date</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Time</TableCell>
                        <TableCell as="th" /* style={{ width: '10%' }} */>Track</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Type</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>User</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Diameter</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Length</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Images</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Latitude</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Longitude</TableCell>
                        <TableCell as="th">Joint</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...location].sort((a, b) => {
                          const trackDiff = (a.track ?? 0) - (b.track ?? 0);
                          if (trackDiff !== 0) return trackDiff;
                          const dateA = `${a.date ?? ''}T${a.time ?? ''}`;
                          const dateB = `${b.date ?? ''}T${b.time ?? ''}`;
                          return dateB.localeCompare(dateA);
                        }).map((location) => (
                        <TableRow
                          onDoubleClick={(e) => {
                            console.log("location photos url =", location.photos)
                            console.log(e)
                            if (location.photos)
                              deleteLocation2(location.id, location.photos)
                            else
                              deleteLocation(location.id)
                          }


                          }
                          key={location.id}
                        >
                          <TableCell /* width="15%" */>{location.date}</TableCell>
                          <TableCell /* width="15%" */>{location.time}</TableCell>
                          <TableCell /* width="10%" */>{location.track}</TableCell>
                          <TableCell /* width="15%" */>{location.type}</TableCell>
                          <TableCell /* width="15%" */>{location.username}</TableCell>
                          <TableCell /* width="15%" */>{location.diameter}</TableCell>
                          <TableCell /* width="15%" */>{location.length != null ? Math.round(Number(location.length)) : ''}</TableCell>
                          <TableCell /* width="15%" */>{location.photos ? location.photos.length : 0}</TableCell>
                          <TableCell /* width="15%" */>{location.lat != null ? Number(location.lat).toFixed(6) : ''}</TableCell>
                          <TableCell /* width="15%" */>{location.lng != null ? Number(location.lng).toFixed(6) : ''}</TableCell>
                          <TableCell>{jointMap[location.id] ?? ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>

                  </Table>
                </ThemeProvider>
              </ScrollView>
            </>)
          },
          {
            label: "Date Info",
            value: "3",
            content: (<>
              <ScrollView
                as="div"
                ariaLabel="Date Info"
                backgroundColor="var(--amplify-colors-white)"
                borderRadius="6px"
                color="var(--amplify-colors-blue-60)"
                padding="1rem"
                height="700px"
              >
                <ThemeProvider theme={theme} colorMode="light">
                  <Table caption="" highlightOnHover={false} variation="striped"
                    style={{ width: '100%', fontFamily: 'Arial, sans-serif' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell as="th">Date</TableCell>
                        <TableCell as="th">Weather</TableCell>
                        <TableCell as="th">High Temp</TableCell>
                        <TableCell as="th">Low Temp</TableCell>
                        <TableCell as="th">Supervisor</TableCell>
                        <TableCell as="th">Labor</TableCell>
                        <TableCell as="th">Observation</TableCell>
                        <TableCell as="th">Remark</TableCell>
                        <TableCell as="th">Comment</TableCell>
                        <TableCell as="th">Equipment</TableCell>
                        <TableCell as="th"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <input type="date" value={date} readOnly style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="text" value={diWeather} placeholder="weather"
                            onChange={e => setDiWeather(e.target.value)} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="number" value={diHight} placeholder="high"
                            onChange={e => setDiHight(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="number" value={diLowt} placeholder="low"
                            onChange={e => setDiLowt(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="text" value={diSupervisor} placeholder="supervisor"
                            onChange={e => setDiSupervisor(e.target.value)} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="number" value={diLabor} placeholder="labor"
                            onChange={e => setDiLabor(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="text" value={diObservation} placeholder="observation"
                            onChange={e => setDiObservation(e.target.value)} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="text" value={diRemark} placeholder="remark"
                            onChange={e => setDiRemark(e.target.value)} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="text" value={diComment} placeholder="comment"
                            onChange={e => setDiComment(e.target.value)} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <input type="text" value={diEquipment} placeholder="equipment"
                            onChange={e => setDiEquipment(e.target.value)} style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell>
                          <button onClick={createDateInfo} disabled={!date}>Add</button>
                        </TableCell>
                      </TableRow>
                      {[...dateInfoList].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.weather}</TableCell>
                          <TableCell>{item.hight}</TableCell>
                          <TableCell>{item.lowt}</TableCell>
                          <TableCell>{item.supervisor}</TableCell>
                          <TableCell>{item.labor}</TableCell>
                          <TableCell>{item.observation}</TableCell>
                          <TableCell>{item.remark}</TableCell>
                          <TableCell>{item.comment}</TableCell>
                          <TableCell>{item.equipment}</TableCell>
                          <TableCell />
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ThemeProvider>
              </ScrollView>
            </>)
          },
        ]}
      />

    </main>
  );
}

export default App;
