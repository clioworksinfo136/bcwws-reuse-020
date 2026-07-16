import type { ChangeEvent, SyntheticEvent } from "react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import { checkLoginAndGetName } from "./utils/AuthUtils";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import type { SelectionSet } from "aws-amplify/data";
import "@aws-amplify/ui-react/styles.css";
import { uploadData, remove, getUrl } from "aws-amplify/storage";

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
import { TRACK_DATA } from './trackData';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const client = generateClient<Schema>();

const locationSelectionSet = [
  'id', 'date', 'time', 'track', 'type', 'diameter',
  'width', 'length', 'lat', 'lng', 'username', 'description',
  'photos', 'joint', 'station', 'createdAt', 'updatedAt',
] as const;
type LocationItem = SelectionSet<Schema['Location']['type'], typeof locationSelectionSet>;

const dateSelectionSet = [
  'id', 'date', 'weather', 'hight', 'lowt', 'supervisor',
  'labor', 'observation', 'remark', 'comment', 'equipment',
  'station', 'feet', 'createdAt', 'updatedAt',
] as const;
type DateItem = SelectionSet<Schema['Date']['type'], typeof dateSelectionSet>;

const trackInfoSelectionSet = [
  'id', 'track', 'geometry', 'width', 'ft2', 'yd2', 'unitprice', 'totalprice',
  'quan', 'value', 'numpoint', 'trip', 'cost', 'unit', 'lastdate', 'color', 'type', 'typeid1', 'typeid', 'createdAt', 'updatedAt',
] as const;
type TrackInfoItem = SelectionSet<Schema['Track']['type'], typeof trackInfoSelectionSet>;

const TYPE_COLOR_MAP: Record<string, string> = Object.fromEntries(
  TRACK_DATA.filter(r => r.type && r.color).map(r => [r.type, r.color] as [string, string])
);



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
          station:     loc.station ?? null,
        },
      })),
  }), [location]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  //const [report, setReport] = useState("");
  const [track, setTrack] = useState<number>(0);
  const [type, setType] = useState<string>(TRACK_DATA[0]?.type ?? "");
  const [diameter, setDiameter] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [length, setLength] = useState<number>(0);
  const [userName, setUserName] = useState<string>();
  const [description, setDescription] = useState<string>("");
  const joint = "joint";
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [placePhotos, setPlacePhotos] = useState<File[]>([]);

  const [tab, setTab] = useState("1");
  const [basemap, setBasemap] = useState("mapbox://styles/mapbox/streets-v12");
  const [pdfMode] = useState(false);
  const [calResult, setCalResult] = useState<number | null>(null);
  const [, setComputeStatus] = useState<string[]>([]);
  // Progress window for long-running batch jobs (e.g. Station assignment).
  const [stationStatus, setStationStatus] = useState<string[]>([]);
  const [showStationStatus, setShowStationStatus] = useState(false);
  const stationLogRef = useRef<HTMLDivElement | null>(null);
  const [showAdminTabs, setShowAdminTabs] = useState<boolean>(false);

  //const [clickInfo, setClickInfo] = useState<DataT>();
  //const [showPopup, setShowPopup] = useState<boolean>(true);


  //const { data } = useGeoJSON();
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ longitude: number; latitude: number; track: string; date: string; type: string } | null>(null);
  const [cursor, setCursor] = useState<string>('grab');
  const [editTrack, setEditTrack] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editDiameter, setEditDiameter] = useState<string>('');
  const [editWidth, setEditWidth] = useState<string>('');
  const [editType, setEditType] = useState<string>('reuse');
  const [editJoint, setEditJoint] = useState<string>("joint");
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [popupPhotos, setPopupPhotos] = useState<{ path: string; url: string }[]>([]);
  const [fullPhotoIndex, setFullPhotoIndex] = useState<number | null>(null);
  const [stationLineUrl, setStationLineUrl] = useState<string>();

  const [dateInfoList, setDateInfoList] = useState<DateItem[]>([]);
  const dateInfoListRef = useRef<DateItem[]>([]);
  const [diWeather, setDiWeather] = useState("");
  const [diHight, setDiHight] = useState<number | "">("");
  const [diLowt, setDiLowt] = useState<number | "">("");
  const [diSupervisor, setDiSupervisor] = useState("");
  const [diLabor, setDiLabor] = useState<number | "">("");
  const [diObservation, setDiObservation] = useState("");
  const [diRemark, setDiRemark] = useState("");
  const [diComment, setDiComment] = useState("");
  const [diEquipment, setDiEquipment] = useState("");

  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateFields, setEditDateFields] = useState({
    date: "", weather: "", hight: "" as number | "", lowt: "" as number | "",
    supervisor: "", labor: "" as number | "", observation: "",
    remark: "", comment: "", equipment: "",
  });

  const [trackInfoList, setTrackInfoList] = useState<TrackInfoItem[]>([]);

  const trackGeometryMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const t of trackInfoList) {
      if (t.track != null && t.geometry) map[t.track] = t.geometry;
    }
    return map;
  }, [trackInfoList]);

  const coloredLocationGeoJSON = useMemo(() => ({
    ...locationGeoJSON,
    features: locationGeoJSON.features.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        color: TYPE_COLOR_MAP[f.properties.type] ?? '#2b6cb0',
        trackGeometry: f.properties.track != null ? (trackGeometryMap[f.properties.track] ?? '') : '',
      },
    })),
  }), [locationGeoJSON, trackGeometryMap]);
  const [historySort, setHistorySort] = useState<{ key: 'date' | 'track' | 'type' | 'images'; dir: 1 | -1 } | null>(null);

  // Highest track number across all Location records — recomputes whenever location changes.
  const maxTrack = useMemo(() => {
    const tracks = location.map(l => l.track).filter((t): t is number => t != null);
    return tracks.length > 0 ? Math.max(...tracks) : null;
  }, [location]);

  const [showTrackTypes, setShowTrackTypes] = useState(false);

  // Distinct (track, type) pairs from Location, no duplicates, sorted by track.
  const trackTypePairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: { track: number; type: string }[] = [];
    for (const l of location) {
      if (l.track == null) continue;
      const type = l.type ?? '';
      const key = `${l.track}|${type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ track: l.track, type });
    }
    return pairs.sort((a, b) => a.track - b.track || a.type.localeCompare(b.type));
  }, [location]);

  const sortedHistory = useMemo(() => {
    const rows = [...location];
    if (!historySort) {
      // Default: track ascending, then date+time descending
      return rows.sort((a, b) => {
        const trackDiff = (a.track ?? 0) - (b.track ?? 0);
        if (trackDiff !== 0) return trackDiff;
        return `${b.date ?? ''}T${b.time ?? ''}`.localeCompare(`${a.date ?? ''}T${a.time ?? ''}`);
      });
    }
    const { key, dir } = historySort;
    return rows.sort((a, b) => {
      let cmp = 0;
      if (key === 'date')   cmp = `${a.date ?? ''}T${a.time ?? ''}`.localeCompare(`${b.date ?? ''}T${b.time ?? ''}`);
      if (key === 'track')  cmp = (a.track ?? 0) - (b.track ?? 0);
      if (key === 'type')   cmp = (a.type ?? '').localeCompare(b.type ?? '');
      if (key === 'images') cmp = (a.photos?.length ?? 0) - (b.photos?.length ?? 0);
      return cmp * dir;
    });
  }, [location, historySort]);

  const toggleHistorySort = (key: 'date' | 'track' | 'type' | 'images') =>
    setHistorySort(prev => prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 });

  const historySortArrow = (key: string) =>
    historySort?.key === key ? (historySort.dir === 1 ? ' ▲' : ' ▼') : '';

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackFields, setEditTrackFields] = useState({
    track: "" as number | "", geometry: "line",
    width: "" as number | "",
    ft2: "" as number | "", yd2: "" as number | "",
    unitprice: "" as number | "", quan: "" as number | "",
    value: "" as number | "", numpoint: "" as number | "",
    trip: false, cost: false,
    unit: "", lastdate: "",
  });
  const [newTrack, setNewTrack] = useState({
    track: "" as number | "", geometry: "line",
    width: "" as number | "",
    ft2: "" as number | "", yd2: "" as number | "",
    unitprice: "" as number | "", quan: "" as number | "",
    value: "" as number | "", numpoint: "" as number | "",
    trip: false, cost: true,
  });



  const options = [...TRACK_DATA]
    .sort((a, b) => (a.id == null ? Infinity : Number(a.id)) - (b.id == null ? Infinity : Number(b.id)))
    .map(r => ({ value: r.type, label: `${r.typeid} ${r.type}`, geometry: r.geometry }));

  //console.log(AIR_PORTS);


  const handleDate = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.value;
    setDate(selected);
    if (selected && !dateInfoListRef.current.some(item => item.date === selected)) {
      client.models.Date.create({ date: selected });
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
  };

  const handleTime = (e: ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

  const handleTrack = async (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setTrack(val);
    if (!isNaN(val)) {
      const { data: matchingTracks } = await client.models.Track.list({ filter: { track: { eq: val } } });
      if (!matchingTracks || matchingTracks.length === 0) {
        await client.models.Track.create({ track: val, cost: true });
        setNewTrack({ track: "", geometry: "line", width: "", ft2: "", yd2: "", unitprice: "", quan: "", value: "", numpoint: "", trip: false, cost: true });
      }
    }
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setType(value);
    if (date && !dateInfoListRef.current.some(item => item.date === date)) {
      client.models.Date.create({ date });
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
      next: (data) => { const items = [...data.items]; dateInfoListRef.current = items; setDateInfoList(items); },
      error: (err) => console.error('Date observeQuery error:', err),
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = client.models.Track.observeQuery({
      selectionSet: [...trackInfoSelectionSet],
    }).subscribe({
      next: (data) => setTrackInfoList([...data.items]),
      error: (err) => console.error('Track observeQuery error:', err),
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    handleUserName();
  }, []);

  // Resolve the station polyline GeoJSON uploaded to Amplify storage (geojson/station-line.json).
  useEffect(() => {
    getUrl({ path: 'geojson/station-line.json' })
      .then(result => setStationLineUrl(result.url.toString()))
      .catch(err => console.error('Failed to resolve station-line URL:', err));
  }, []);

  // Auto-scroll the Station progress log to the latest line.
  useEffect(() => {
    const el = stationLogRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stationStatus]);



  async function createLocation() {
    if (!date) {
      alert("Please select a date before adding a new record.");
      return;
    }

    handleUserName();
    const name = userName;
    await client.models.Location.create({
      date: date,
      time: time,
      track: track,
      type: type,
      diameter: diameter,
      width: width,
      length: calResult !== null ? calResult : length,
      username: name,
      description: description,
      lat: lat,
      lng: lng,
      joint: joint,
    });

    const { data: matchingTracks } = await client.models.Track.list({ filter: { track: { eq: track } } });
    if (!matchingTracks || matchingTracks.length === 0) {
      await client.models.Track.create({ track, cost: true });
    }
    console.log('[createLocation] date value:', date);
    const { data: existingDates, errors: listErrors } = await client.models.Date.list({ filter: { date: { eq: date } } });
    console.log('[createLocation] existingDates:', existingDates, 'listErrors:', listErrors);
    if (!existingDates || existingDates.length === 0) {
      console.log('[createLocation] creating Date record for:', date);
      const { data: created, errors } = await client.models.Date.create({ date });
      console.log('[createLocation] Date.create result:', created, 'errors:', errors);
      if (errors) console.error('Date.create errors:', JSON.stringify(errors, null, 2));
    } else {
      console.log('[createLocation] Date already exists, skipping create');
    }
    setDate("");
    setTime("");
    setTrack(track);
    setType(type);
    setDiameter(diameter);
    setWidth(width);
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

  async function deletePopupPhoto(locId: string, path: string) {
    if (!window.confirm('Delete this picture?')) return;
    try {
      await remove({ path });
    } catch (err) {
      console.error('Failed to delete photo from storage:', err);
    }
    try {
      const { data: currentLoc } = await client.models.Location.get({ id: locId });
      const remaining = (currentLoc?.photos ?? []).filter((p): p is string => !!p && p !== path);
      await client.models.Location.update({ id: locId, photos: remaining });
      const { data: fresh } = await client.models.Location.get({ id: locId });
      if (fresh) {
        setLocation(prev => prev.map(loc => loc.id === locId ? fresh : loc));
      }
    } catch (err) {
      console.error('Failed to update photo list:', err);
      alert('Delete failed: ' + String(err));
      return;
    }
    setPopupPhotos(prev => {
      const next = prev.filter(p => p.path !== path);
      setFullPhotoIndex(i => {
        if (i == null) return i;
        if (next.length === 0) return null;
        return Math.min(i, next.length - 1);
      });
      return next;
    });
  }

  async function handleUpdatePopup(id: string) {
    // Use raw GraphQL to bypass the Amplify Gen 2 client-side field-validation
    // bug triggered by the `comments: a.ref('Comment').array()` custom type.
    const mutation = /* GraphQL */ `
      mutation UpdateLocation($input: UpdateLocationInput!) {
        updateLocation(input: $input) {
          id
          date
          time
          track
          type
          diameter
          width
          description
          joint
        }
      }
    `;
    try {
      const input: Record<string, unknown> = { id };
      input.date        = editDate;
      // AWSTime expects HH:MM:SS — pad the HH:MM value from the time control
      if (editTime) input.time = editTime.length === 5 ? `${editTime}:00` : editTime;
      input.type        = editType;
      input.description = editDescription;
      input.joint       = editJoint;
      const parsedTrack    = parseInt(editTrack);
      const parsedDiameter = parseFloat(editDiameter);
      const parsedWidth    = parseFloat(editWidth);
      if (editTrack    !== '' && !isNaN(parsedTrack))    input.track    = parsedTrack;
      if (editDiameter !== '' && !isNaN(parsedDiameter)) input.diameter = parsedDiameter;
      input.width = editWidth !== '' && !isNaN(parsedWidth) ? parsedWidth : null;

      console.log('Updating via GraphQL:', input);
      const result = await (client as any).graphql({ query: mutation, variables: { input } });
      console.log('Update result:', result);

      if (editDate && !dateInfoListRef.current.some(item => item.date === editDate)) {
        client.models.Date.create({ date: editDate });
      }

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
    if (dateInfoList.some(item => item.date === date)) {
      alert(`A record for ${date} already exists.`);
      return;
    }
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

  function saveDateInfo(id: string) {
    client.models.Date.update({
      id,
      date: editDateFields.date || undefined,
      weather: editDateFields.weather || undefined,
      hight: editDateFields.hight !== "" ? Number(editDateFields.hight) : undefined,
      lowt: editDateFields.lowt !== "" ? Number(editDateFields.lowt) : undefined,
      supervisor: editDateFields.supervisor || undefined,
      labor: editDateFields.labor !== "" ? Number(editDateFields.labor) : undefined,
      observation: editDateFields.observation || undefined,
      remark: editDateFields.remark || undefined,
      comment: editDateFields.comment || undefined,
      equipment: editDateFields.equipment || null,
    });
    setEditingDateId(null);
  }


  function createTrackInfo() {
    if (newTrack.track === "") { alert("Track number is required."); return; }
    client.models.Track.create({
      track: Number(newTrack.track),
      geometry: newTrack.geometry || "line",
      width: newTrack.width !== "" ? Number(newTrack.width) : undefined,
      ft2: newTrack.ft2 !== "" ? Number(newTrack.ft2) : undefined,
      yd2: newTrack.yd2 !== "" ? Number(newTrack.yd2) : undefined,
      unitprice: newTrack.unitprice !== "" ? Number(newTrack.unitprice) : undefined,
      quan: newTrack.quan !== "" ? Number(newTrack.quan) : undefined,
      value: newTrack.value !== "" ? Number(newTrack.value) : undefined,
      numpoint: newTrack.numpoint !== "" ? Number(newTrack.numpoint) : undefined,
      trip: newTrack.trip,
      cost: true,
    });
    setNewTrack({ track: "", geometry: "line", width: "", ft2: "", yd2: "", unitprice: "", quan: "", value: "", numpoint: "", trip: false, cost: true });
  }

  function saveTrackInfo(id: string) {
    client.models.Track.update({
      id,
      track: editTrackFields.track !== "" ? Number(editTrackFields.track) : undefined,
      geometry: editTrackFields.geometry || undefined,
      width: editTrackFields.width !== "" ? Number(editTrackFields.width) : null,
      ft2: editTrackFields.ft2 !== "" ? Number(editTrackFields.ft2) : undefined,
      yd2: editTrackFields.yd2 !== "" ? Number(editTrackFields.yd2) : undefined,
      unitprice: editTrackFields.unitprice !== "" ? Number(editTrackFields.unitprice) : undefined,
      quan: editTrackFields.quan !== "" ? Number(editTrackFields.quan) : undefined,
      value: editTrackFields.value !== "" ? Number(editTrackFields.value) : undefined,
      numpoint: editTrackFields.numpoint !== "" ? Number(editTrackFields.numpoint) : undefined,
      trip: editTrackFields.trip,
      cost: editTrackFields.cost,
      unit: editTrackFields.unit || null,
      lastdate: editTrackFields.lastdate || null,
    });
    setEditingTrackId(null);
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


  async function handleCompletePolygon() {
    try {
      const LAT_FT = 364000;
      const features: {
        type: 'Feature';
        geometry: { type: 'Polygon'; coordinates: number[][][] };
        properties: Record<string, unknown>;
      }[] = [];

      const polygonTracks = trackInfoList.filter(t => t.geometry === 'polygon');

      for (const trackRec of polygonTracks) {
        const pts = location
          .filter(l => l.track === trackRec.track)
          .sort((a, b) => {
            const da = `${a.date ?? ''}T${a.time ?? ''}`;
            const db = `${b.date ?? ''}T${b.time ?? ''}`;
            return da.localeCompare(db);
          });

        if (pts.length < 3) {
          console.log(`Track ${trackRec.track}: skipped (only ${pts.length} point(s))`);
          continue;
        }

        // Calculate area using Shoelace formula
        const n = pts.length;
        const midLat = pts.reduce((s, p) => s + (p.lat ?? 0), 0) / n;
        const LNG_FT = LAT_FT * Math.cos((midLat * Math.PI) / 180);
        let area = 0;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          area += (pts[i].lng ?? 0) * LNG_FT * (pts[j].lat ?? 0) * LAT_FT
                - (pts[j].lng ?? 0) * LNG_FT * (pts[i].lat ?? 0) * LAT_FT;
        }
        const sqFt = Math.round(Math.abs(area) / 2 * 100) / 100;
        const sqYd = Math.round(sqFt / 9 * 100) / 100;

        const coords = pts.map(p => [p.lng ?? 0, p.lat ?? 0]);
        coords.push(coords[0]);

        features.push({
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [coords] },
          properties: {
            id:        trackRec.id,
            track:     trackRec.track,
            geometry:  trackRec.geometry,
            ft2:       sqFt,
            yd2:       sqYd,
            unitprice: trackRec.unitprice,
            quan:      trackRec.quan,
            value:     trackRec.value,
            numpoint:  n,
            unit:      trackRec.unit,
            lastdate:  trackRec.lastdate,
            color:     trackRec.color,
            cost:      trackRec.cost,
          },
        });
      }

      if (features.length === 0) {
        alert("Complete Area: no polygon tracks to process.");
        return;
      }

      // Add a polygon covering the White House (Washington, DC)
      features.push({
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [-77.0387, 38.8946],
            [-77.0387, 38.8987],
            [-77.0344, 38.8987],
            [-77.0344, 38.8946],
            [-77.0387, 38.8946],
          ]],
        },
        properties: {
          id:        'white-house',
          track:     null,
          geometry:  'polygon',
          ft2:       null,
          yd2:       null,
          unitprice: null,
          quan:      null,
          value:     null,
          numpoint:  4,
          unit:      null,
          lastdate:  null,
          color:     'white',
          cost:      false,
        },
      });

      const geojson = { type: 'FeatureCollection' as const, features };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      await uploadData({
        path: 'geojson/polygon.geojson',
        data: blob,
        options: { contentType: 'application/json' },
      }).result;

      // Export locations on line-geometry tracks as line.geojson (one LineString per track)
      const lineTracks = trackInfoList.filter(t => t.geometry === 'line');
      const lineFeatures = [];
      for (const trackRec of lineTracks) {
        const pts = location
          .filter(l => l.track === trackRec.track && l.lat != null && l.lng != null)
          .sort((a, b) => `${a.date ?? ''}T${a.time ?? ''}`.localeCompare(`${b.date ?? ''}T${b.time ?? ''}`));
        if (pts.length < 2) continue;
        lineFeatures.push({
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: pts.map(l => [l.lng!, l.lat!]),
          },
          properties: {
            track:     trackRec.track,
            geometry:  trackRec.geometry,
            type:      trackRec.type,
            unitprice: trackRec.unitprice,
            quan:      trackRec.quan,
            value:     trackRec.value,
            numpoint:  trackRec.numpoint,
            unit:      trackRec.unit,
            lastdate:  trackRec.lastdate,
            color:     trackRec.color,
            cost:      trackRec.cost,
          },
        });
      }
      const lineGeojson = { type: 'FeatureCollection' as const, features: lineFeatures };
      await uploadData({
        path: 'geojson/line.geojson',
        data: new Blob([JSON.stringify(lineGeojson, null, 2)], { type: 'application/json' }),
        options: { contentType: 'application/json' },
      }).result;

      // Last pass: export point-geometry track locations to point.geojson
      await exportPointGeojson();
      alert("Complete Area computation complete.");
    } catch (err) {
      console.error('handleCompletePolygon error:', err);
      alert("Complete Area failed: " + String(err));
    }
  }

  // Assign the nearest station ("STA") to every Location record.
  //
  // Iterates each Location point, calls the public nearest-station Lambda
  // (StationIdApi) with the point's lat/lng, takes the returned "STA", and
  // writes it into the Location's "station" field. Progress is streamed into
  // the Station progress window so the user can watch it go point by point.
  async function handleStation() {
    const apiUrl = (outputs as { custom?: { stationApiUrl?: string } }).custom?.stationApiUrl;
    if (!apiUrl) {
      alert("Station API URL is not configured. Run 'npx ampx sandbox' to deploy the backend, then redeploy.");
      return;
    }

    const points = location.filter(
      l => l.lat != null && l.lng != null
    );
    if (points.length === 0) {
      alert("No Location points with coordinates to process.");
      return;
    }

    setShowStationStatus(true);
    setStationStatus([
      `Assigning nearest station to ${points.length} of ${location.length} Location point(s)...`,
    ]);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const lat = p.lat as number;
      const lng = p.lng as number;
      try {
        const url = `${apiUrl}?lat=${lat}&lng=${lng}&k=1`;
        const resp = await fetch(url);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const body = await resp.json() as { sta?: string; distance_m?: number };
        const sta = body.sta;
        if (!sta) {
          skipped++;
          flushSync(() => setStationStatus(prev => [...prev,
            `  • [${i + 1}/${points.length}] id=${p.id}: no STA returned, skipped`]));
          continue;
        }
        await client.models.Location.update({ id: p.id, station: sta });
        updated++;
        flushSync(() => setStationStatus(prev => [...prev,
          `  • [${i + 1}/${points.length}] id=${p.id} → STA ${sta} (${body.distance_m ?? '?'} m)`]));
      } catch (err) {
        failed++;
        flushSync(() => setStationStatus(prev => [...prev,
          `  • [${i + 1}/${points.length}] id=${p.id}: failed — ${String(err)}`]));
      }
    }

    setStationStatus(prev => [...prev,
      `✓ Station assignment complete — updated: ${updated}, skipped: ${skipped}, failed: ${failed}.`]);
  }

  // For each Date entry, find the latest Location record whose date+time is at
  // or before that Date, take its nearest-station STA (the Location's "station"
  // field, populated by the Station button), and write:
  //   - the STA into the Date's "station" field;
  //   - the STA's FKLH (footage/chainage) from station-id.json into "feet".
  //
  // STA -> FKLH is one-to-many in station-id.json, so we keep the maximum FKLH
  // per STA (monotonic with stationing), matching the Lambda's behavior.
  async function handleDateBatch() {
    if (dateInfoList.length === 0) {
      alert("No Date entries to process.");
      return;
    }
    if (location.length === 0) {
      alert("No Location records to derive stations from.");
      return;
    }

    // Build the STA -> max FKLH map once from the bundled station-id.json so we
    // don't have to call the Lambda per Date entry.
    setShowStationStatus(true);
    setStationStatus(["Loading station FKLH lookup..."]);
    let staFklh: Record<string, number>;
    try {
      const resp = await fetch('/station-id.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const geo = await resp.json() as { features?: { properties?: { STA?: string; FKLH?: number } }[] };
      staFklh = {};
      for (const f of geo.features ?? []) {
        const sta = f.properties?.STA;
        const fklh = f.properties?.FKLH;
        if (sta != null && fklh != null && (staFklh[sta] == null || fklh > staFklh[sta])) {
          staFklh[sta] = fklh;
        }
      }
      flushSync(() => setStationStatus(prev => [...prev,
        `Loaded ${Object.keys(staFklh).length} STA → FKLH mapping(s).`]));
    } catch (err) {
      setStationStatus(prev => [...prev, `✗ Failed to load station-id.json — ${String(err)}`]);
      return;
    }

    // Pre-sort Locations by date+time so each Date lookup is a cheap scan.
    const sortedLocs = [...location]
      .filter(l => l.date != null)
      .sort((a, b) => `${a.date ?? ''}T${a.time ?? ''}`.localeCompare(`${b.date ?? ''}T${b.time ?? ''}`));

    flushSync(() => setStationStatus(prev => [...prev,
      `Processing ${dateInfoList.length} Date entr(ies) against ${sortedLocs.length} Location record(s)...`]));

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const sortedDates = [...dateInfoList].sort((a, b) =>
      (a.date ?? '').localeCompare(b.date ?? ''));

    for (let i = 0; i < sortedDates.length; i++) {
      const d = sortedDates[i];
      const cutoff = d.date ?? '';
      // Latest Location with date+time <= this Date's date (inclusive of the day).
      const eligible = sortedLocs.filter(l => (l.date ?? '') <= cutoff);
      const latest = eligible[eligible.length - 1];
      if (!latest) {
        skipped++;
        flushSync(() => setStationStatus(prev => [...prev,
          `  • [${i + 1}/${sortedDates.length}] date=${cutoff}: no earlier Location, skipped`]));
        continue;
      }
      const sta = latest.station ?? null;
      const fklh = sta != null ? (staFklh[sta] ?? null) : null;
      try {
        await client.models.Date.update({
          id: d.id,
          station: sta ?? undefined,
          feet: fklh ?? undefined,
        });
        updated++;
        flushSync(() => setStationStatus(prev => [...prev,
          `  • [${i + 1}/${sortedDates.length}] date=${cutoff}: latest loc id=${latest.id} → STA ${sta ?? '—'}, feet ${fklh ?? '—'}`]));
      } catch (err) {
        failed++;
        flushSync(() => setStationStatus(prev => [...prev,
          `  • [${i + 1}/${sortedDates.length}] date=${cutoff}: update failed — ${String(err)}`]));
      }
    }

    setStationStatus(prev => [...prev,
      `✓ Date processing complete — updated: ${updated}, skipped: ${skipped}, failed: ${failed}.`]);
  }

  // Export point-geometry track locations to geojson/point.geojson.
  // For each Location, look up the linked Track by track number; keep only point-geometry
  // tracks. Every Location sharing a track number is exported as its own feature.
  async function exportPointGeojson(): Promise<number> {
    const trackByNumber: Record<number, typeof trackInfoList[number]> = {};
    for (const t of trackInfoList) {
      if (t.track != null) trackByNumber[t.track] = t;
    }
    const pointFeatures = location
      .filter(l => l.lat != null && l.lng != null && l.track != null)
      .map(l => ({ l, track: trackByNumber[l.track!] }))
      .filter(({ track }) => track?.geometry === 'point')
      .map(({ l, track }) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [l.lng!, l.lat!] },
        properties: {
          track:     track!.track,
          typeid:    track!.typeid,
          type:      track!.type,
          unit:      track!.unit,
          unitprice: track!.unitprice,
          color:     track!.color,
        },
      }));
    const pointGeojson = { type: 'FeatureCollection' as const, features: pointFeatures };
    await uploadData({
      path: 'geojson/point.geojson',
      data: new Blob([JSON.stringify(pointGeojson, null, 2)], { type: 'application/json' }),
      options: { contentType: 'application/json' },
    }).result;
    return pointFeatures.length;
  }

  async function handleCompute() {
    const LAT_FT = 364000;
    const sorted = [...trackInfoList].sort((a, b) => (a.track ?? 0) - (b.track ?? 0));

    // Pavement line types whose Track.width is averaged from their Location points' width.
    const AVG_WIDTH_TYPES = [
      'Stabilized Subgrade-L',
      'Limerock Base-L',
      'Asphalt Pavement Restoration-L',
      'Mill and Resurface Asphalt Pavement-L',
    ];

    // Validation: every Location point of these types must have a width filled in.
    // If any has width 0 or null, warn and stop so the user can fill them first.
    const missingWidth = location.filter(
      l => l.type != null && AVG_WIDTH_TYPES.includes(l.type) && (l.width == null || l.width === 0)
    );
    if (missingWidth.length > 0) {
      const lines = missingWidth
        .map(l => `  - Track ${l.track ?? '?'}, ${l.date ?? ''} ${l.time ?? ''} (${l.type})`)
        .join('\n');
      alert(
        `Compute stopped: ${missingWidth.length} point(s) of width-based pavement types have no width.\n\n` +
        `Please go back to the History Data tab and fill in the width for these points before running Compute:\n\n` +
        lines
      );
      return;
    }

    // Pass 0: populate unitprice and geometry from trackData.ts by matching Location type → TRACK_DATA.
    // Drive off the track numbers actually present in Location and upsert the Track row, so newly
    // added tracks (whose Track record may not be in trackInfoList yet) are also populated.
    flushSync(() => setComputeStatus(["Pass 0: Populating unit price, total price, geometry, unit from trackData..."]));
    const { data: existingTracks } = await client.models.Track.list();
    const trackIdByNumber: Record<number, string> = {};
    const trackRecByNumber: Record<number, typeof existingTracks[number]> = {};
    for (const t of existingTracks ?? []) {
      if (t.track != null) { trackIdByNumber[t.track] = t.id; trackRecByNumber[t.track] = t; }
    }
    const locationTrackNumbers = [...new Set(location.map(l => l.track).filter((t): t is number => t != null))]
      .sort((a, b) => a - b);
    for (const trackNo of locationTrackNumbers) {
      const pts = location.filter(l => l.track === trackNo);
      const firstType = pts.find(p => p.type)?.type;
      const match = firstType ? TRACK_DATA.find(r => r.type === firstType) : undefined;
      let trackId = trackIdByNumber[trackNo];
      const created = !trackId;
      if (!trackId) {
        const { data: createdRec } = await client.models.Track.create({ track: trackNo, cost: true });
        if (!createdRec) {
          flushSync(() => setComputeStatus(prev => [...prev, `  • Track ${trackNo}: create failed, skipped`]));
          continue;
        }
        trackId = createdRec.id;
        trackIdByNumber[trackNo] = trackId;
      }
      const widthSet = (trackRecByNumber[trackNo]?.width ?? 0) === 0;
      await client.models.Track.update({
        id: trackId,
        trip: true,
        ...(widthSet && { width: 1 }),
        ...(match?.id != null && { trackid: match.id }),
        ...(match?.unitprice != null && { unitprice: match.unitprice }),
        ...(match?.totalprice != null && { totalprice: match.totalprice }),
        ...(match?.geometry  != null && { geometry:  match.geometry  }),
        ...(match?.unit      != null && { unit:      match.unit      }),
        ...(match?.color     != null && { color:     match.color     }),
        ...(match?.type      != null && { type:      match.type      }),
        ...(match?.typeid1   != null && { typeid1:   match.typeid1   }),
        ...(match?.typeid    != null && { typeid:    match.typeid    }),
      });
      const detail = match
        ? `type "${firstType}" → trackid=${match.id ?? '—'}, geometry=${match.geometry}, unitprice=${match.unitprice ?? '—'}, unit=${match.unit ?? '—'}`
        : firstType
          ? `type "${firstType}" (no trackData match — values unchanged)`
          : `no point type found — values unchanged`;
      flushSync(() => setComputeStatus(prev => [...prev,
        `  • Track ${trackNo} (${pts.length} pt${pts.length === 1 ? '' : 's'}, ${created ? 'created' : 'existing'}): ${detail}${widthSet ? ', width set to 1' : ''}`]));
    }

    // Pass 0b: for the specific pavement line types, set Track.width to the average
    // of the width of all Location points sharing that track number.
    flushSync(() => setComputeStatus(prev => [...prev, "Pass 0: Averaging Location width for pavement line tracks..."]));
    const { data: tracksForAvg } = await client.models.Track.list();
    for (const trackRec of tracksForAvg ?? []) {
      if (trackRec.type == null || !AVG_WIDTH_TYPES.includes(trackRec.type)) continue;
      const widths = location
        .filter(l => l.track === trackRec.track && l.width != null)
        .map(l => l.width as number);
      if (widths.length === 0) {
        flushSync(() => setComputeStatus(prev => [...prev, `  • Track ${trackRec.track} ("${trackRec.type}"): no point widths — unchanged`]));
        continue;
      }
      const avgWidth = Math.round((widths.reduce((s, w) => s + w, 0) / widths.length) * 100) / 100;
      await client.models.Track.update({ id: trackRec.id, width: avgWidth });
      flushSync(() => setComputeStatus(prev => [...prev, `  • Track ${trackRec.track} ("${trackRec.type}"): avg width = ${avgWidth} (from ${widths.length} pt${widths.length === 1 ? '' : 's'})`]));
    }

    flushSync(() => setComputeStatus(prev => [...prev, `Pass 0 done — processed ${locationTrackNumbers.length} track(s).`]));

    // Remove Track records whose track number no longer exists in Location
    flushSync(() => setComputeStatus(prev => [...prev, "Removing Track rows with no matching Location..."]));
    const usedTracks = new Set(location.map(l => l.track));
    await Promise.all(
      sorted
        .filter(t => t.track == null || !usedTracks.has(t.track))
        .map(t => client.models.Track.delete({ id: t.id }))
    );

    // Remove Date records whose date no longer exists in Location
    flushSync(() => setComputeStatus(prev => [...prev, "Removing Date rows with no matching Location..."]));
    const usedDates = new Set(location.map(l => l.date));
    const { data: allDates } = await client.models.Date.list();
    await Promise.all(
      (allDates ?? [])
        .filter(d => d.date == null || !usedDates.has(d.date))
        .map(d => client.models.Date.delete({ id: d.id }))
    );

    // Re-fetch fresh track data after Pass 0 so geometry/unitprice updates are reflected
    const { data: freshTracks } = await client.models.Track.list();
    const freshSorted = [...(freshTracks ?? [])].sort((a, b) => (a.track ?? 0) - (b.track ?? 0));

    // Pass 1: compute quantity (and ft2/yd2 for polygons) using fresh geometry
    flushSync(() => setComputeStatus(prev => [...prev, "Pass 1: Computing quantity, area, last date..."]));
    for (const trackRec of freshSorted) {
      if (!trackRec.cost) continue;
      const pts = location.filter(l => l.track === trackRec.track);

      // Find the last date among all locations in this track
      const lastdate = pts
        .map(p => p.date ?? '')
        .filter(d => d !== '')
        .sort()
        .at(-1) ?? null;
      if (lastdate) {
        await client.models.Track.update({ id: trackRec.id, lastdate });
      }

      if (trackRec.geometry === 'line') {
        const sumLength = pts.reduce((s, p) => s + (p.length ?? 0), 0);
        const w = trackRec.width ?? 1;
        const isAvgType = trackRec.type != null && AVG_WIDTH_TYPES.includes(trackRec.type);
        const total = isAvgType
          ? Math.round(sumLength * w / 9 * 100) / 100
          : Math.round(sumLength * w * 100) / 100;
        await client.models.Track.update({ id: trackRec.id, quan: total });
        flushSync(() => setComputeStatus(prev => [...prev,
          `  • Track ${trackRec.track} (line): quan = Σlength × width${isAvgType ? ' / 9' : ''} = ${Math.round(sumLength * 100) / 100} × ${w}${isAvgType ? ' / 9' : ''} = ${total}`]));

      } else if (trackRec.geometry === 'point') {
        const n = pts.length;
        await client.models.Track.update({ id: trackRec.id, quan: n, numpoint: n });
        flushSync(() => setComputeStatus(prev => [...prev,
          `  • Track ${trackRec.track} (point): quan = point count = ${n}`]));

      } else if (trackRec.geometry === 'polygon') {
        // Sort by date+time so points are in field-collection order (required for Shoelace)
        const orderedPts = [...pts].sort((a, b) => {
          const da = `${a.date ?? ''}T${a.time ?? ''}`;
          const db = `${b.date ?? ''}T${b.time ?? ''}`;
          return da.localeCompare(db);
        });
        const n = orderedPts.length;
        if (n < 3) {
          await client.models.Track.update({ id: trackRec.id, numpoint: n, ft2: 0, yd2: 0, quan: 0 });
          flushSync(() => setComputeStatus(prev => [...prev,
            `  • Track ${trackRec.track} (polygon): only ${n} pt(s) — need ≥3, quan = 0`]));
          continue;
        }
        const midLat = orderedPts.reduce((s, p) => s + (p.lat ?? 0), 0) / n;
        const LNG_FT = LAT_FT * Math.cos((midLat * Math.PI) / 180);
        let area = 0;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          area += (orderedPts[i].lng ?? 0) * LNG_FT * (orderedPts[j].lat ?? 0) * LAT_FT
                - (orderedPts[j].lng ?? 0) * LNG_FT * (orderedPts[i].lat ?? 0) * LAT_FT;
        }
        const sqFt = Math.round(Math.abs(area) / 2 * 100) / 100;
        const sqYd = Math.round(sqFt / 9 * 100) / 100;
        const unit = trackRec.unit ?? '';
        const quan = unit === 'SF' ? sqFt : sqYd;
        await client.models.Track.update({ id: trackRec.id, numpoint: n, ft2: sqFt, yd2: sqYd, quan });
        flushSync(() => setComputeStatus(prev => [...prev,
          `  • Track ${trackRec.track} (polygon): area = ${sqFt} SF / ${sqYd} SY (${n} pts), quan = ${quan} (${unit || 'SY'})`]));
      }
    }

    // Pass 2: compute value = unitprice * quantity
    flushSync(() => setComputeStatus(prev => [...prev, "Pass 2: Computing Track value = unit price × quantity..."]));
    for (const trackRec of freshSorted) {
      if (!trackRec.cost) continue;
      const { data: fresh } = await client.models.Track.get({ id: trackRec.id });
      if (fresh && fresh.unitprice != null && fresh.quan != null) {
        const value = Math.round(fresh.unitprice * fresh.quan * 100) / 100;
        await client.models.Track.update({ id: trackRec.id, value });
      }
    }

    // Pass 3: compute Valve value = number * unitprice * ton
    flushSync(() => setComputeStatus(prev => [...prev, "Pass 3: Computing Valve value = number × unit price × ton..."]));
    const { data: freshValves } = await client.models.Valve.list();
    let valveCount = 0;
    for (const v of freshValves ?? []) {
      if (v.number != null && v.unitprice != null && v.ton != null) {
        const value = Math.round(v.number * v.unitprice * v.ton * 100) / 100;
        await client.models.Valve.update({ id: v.id, value });
        valveCount++;
        flushSync(() => setComputeStatus(prev => [...prev,
          `  • Valve ${v.valve ?? v.id}: value = number × unitprice × ton = ${v.number} × ${v.unitprice} × ${v.ton} = ${value}`]));
      } else {
        flushSync(() => setComputeStatus(prev => [...prev,
          `  • Valve ${v.valve ?? v.id}: skipped (missing number/unitprice/ton)`]));
      }
    }
    flushSync(() => setComputeStatus(prev => [...prev, `Pass 3 done — valued ${valveCount} valve(s) of ${(freshValves ?? []).length} total.`]));

    setComputeStatus(prev => [...prev, "✓ Compute complete."]);
    setTab("1");
    alert("Computation complete.");
  }

  const onClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];

    //console.log("clicked feature =", feature);
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
        properties: { ...props, joint: match?.joint ?? null, station: match?.station ?? props.station ?? null },
      });
      setEditTrack(props.track != null ? String(props.track) : '');
      setEditDescription(props.description ?? '');
      setEditDiameter(props.diameter != null ? String(props.diameter) : '');
      setEditWidth(match?.width != null ? String(match.width) : '');
      setEditType(props.type ?? 'reuse');
      setEditJoint(typeof match?.joint === 'string' ? match.joint : 'joint');
      setEditDate(match?.date ?? props.date ?? '');
      setEditTime((match?.time ?? props.time ?? '').slice(0, 5));
      setFullPhotoIndex(null);
      setPopupPhotos([]);
      const photoPaths = (match?.photos ?? []).filter((p): p is string => !!p);
      if (photoPaths.length > 0) {
        Promise.all(photoPaths.map(p => getUrl({ path: p }).then(r => ({ path: p, url: r.url.toString() }))))
          .then(photos => setPopupPhotos(photos))
          .catch(err => console.error('Failed to resolve photo URLs:', err));
      }
    };
  }, [location, pdfMode]);

  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => { setCursor('grab'); setHoverInfo(null); }, []);

  const onMouseMove = useCallback((event: MapMouseEvent) => {
    const feature = event.features && event.features[0];
    if (feature && (feature.layer?.id === 'water-points' || feature.layer?.id === 'water-points-square')) {
      const props = feature.properties as WaterFeatureProperties;
      setHoverInfo({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        track: props.track != null ? String(props.track) : '',
        date: props.date ?? '',
        type: props.type ?? '',
      });
    } else {
      setHoverInfo(null);
    }
  }, []);

  const change_basemap = (value: string) => {
    if (value === "light") {
      setBasemap("mapbox://styles/mapbox/light-v11")
    } else if (value === "street") {
      setBasemap("mapbox://styles/mapbox/streets-v12")
    } else if (value === "satellite") {
      setBasemap("mapbox://styles/mapbox/satellite-streets-v12")
    }
  };

  return (
    <main>
      <h1>BCWWS REGIONAL EFFLUENT AND REUSE SOLUTIONS - EFFLUENT WATER TRANSMISSION MAIN</h1>
      <Divider orientation="horizontal" />
      <br />
      <Flex alignItems="flex-start">
        <Button onClick={handleCal} backgroundColor={"lightyellow"} color={"darkblue"}>
          QC
        </Button>
        <Button onClick={createLocation} backgroundColor={"azure"} color={"red"}>
          + New
        </Button>
        <Button onClick={handleStation} backgroundColor={"#6b4f9e"} color={"white"}>
          Station
        </Button>
        <Button onClick={handleDateBatch} backgroundColor={"#7a5230"} color={"white"}>
          Date
        </Button>
        <Button onClick={handleCompute} backgroundColor={"lightgreen"} color={"darkgreen"}>
          Compute
        </Button>
        <Button onClick={handleCompletePolygon} backgroundColor={"steelblue"} color={"white"}>
          Complete Area
        </Button>
        {calResult !== null && (
          <span style={{ alignSelf: "center", fontWeight: "bold" }}>
            Distance: {calResult.toFixed(1)} ft
          </span>
        )}
        <Button onClick={signOut} width={120} marginLeft="auto">
          Sign out
        </Button>
        <Button onClick={() => setShowAdminTabs(v => !v)} backgroundColor={showAdminTabs ? "#555" : "#888"} color={"white"}>
          {showAdminTabs ? "▲ Tab" : "▼ Tab"}
        </Button>
      </Flex>
      {showStationStatus && (
        <Flex
          direction="column"
          style={{
            margin: "8px 0",
            padding: "8px",
            border: "1px solid #6b4f9e",
            borderRadius: "6px",
            backgroundColor: "#faf8ff",
            width: "100%",
            maxWidth: "900px",
          }}
        >
          <Flex justifyContent="space-between" alignItems="center">
            <strong style={{ color: "#6b4f9e" }}>Batch Job Progress</strong>
            <Button size="small" onClick={() => setShowStationStatus(false)}>Close</Button>
          </Flex>
          <ScrollView
            ref={stationLogRef}
            height="220px"
            width="100%"
            style={{ backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "4px" }}
          >
            <pre style={{
              margin: 0, padding: "8px",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "12px", lineHeight: "1.4", whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {stationStatus.join("\n")}
            </pre>
          </ScrollView>
        </Flex>
      )}
      <br />
      <Flex direction="row" alignItems="flex-end" className="toolbar-inputs">

        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Date</span>
          <input
            type="date"
            value={date}
            placeholder="date"
            onChange={handleDate}
            style={{ width: '80px', height: '42px', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Time</span>
          <input
            type="time"
            value={time}
            placeholder="time"
            onChange={handleTime}
            style={{ width: '80px', height: '42px', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Track</span>
          <input
            type="number"
            value={track}
            placeholder="track"
            onChange={handleTrack}
            style={{ width: '50px', height: '42px', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Width</span>
          <input
            type="number"
            value={width}
            placeholder="width"
            onChange={e => setWidth(e.target.value === "" ? 0 : Number(e.target.value))}
            style={{ width: '50px', height: '42px', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Type</span>
          <SelectField
            label="Select an option"
            labelHidden={true}
            value={type}
            onChange={handleSelectChange}
          //width="100%"
          >
            {options.map((option) => {
              const color = option.geometry === 'line' ? 'darkgreen'
                : option.geometry === 'polygon' ? 'darkblue' : 'dimgrey';
              return (
                <option key={option.value} value={option.value}
                  style={{ color, fontWeight: 'bold' }}>
                  {option.label}
                </option>
              );
            })}
          </SelectField>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: '10px', color: '#666' }}>Description</span>
          <Input
            type="text"
            value={description}
            placeholder="description"
            onChange={handleDescription}
            style={{ width: '600px' }}
          />
        </label>
        <button
          onClick={() => setShowTrackTypes(true)}
          title="Show all track / type values"
          style={{ alignSelf: 'center', marginLeft: 'auto', fontSize: '18px', fontWeight: 'bold', color: '#1a365d', whiteSpace: 'nowrap', background: '#ebf4ff', border: '1px solid #1a365d', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}
        >
          Max Track: {maxTrack ?? '—'}
        </button>
        {/* <Input type="number" value={Number(lat.toFixed(10))} />
        <Input type="number" value={Number(lng.toFixed(10))} /> */}
      </Flex>
      <Divider orientation="horizontal" />
      <Tabs
        value={tab}
        onValueChange={(tab) => setTab(tab)}
        items={[
          ...[{
            label: "Progress Map",
            value: "1",
            content: (<>
              <Map
                initialViewState={{
                  longitude: -80.13289123074017,
                  latitude: 26.260443058928075,
                  zoom: 16,
                }}
                mapboxAccessToken={MAPBOX_TOKEN}
                maxZoom={23}
                //mapLib={maplibregl}
                mapStyle={basemap} // Use any MapLibre-compatible style

                style={{
                  width: "100%",
                  height: "1000px",
                  borderColor: "#000000",
                }}
                interactiveLayerIds={['water-points', 'water-points-square']}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onMouseMove={onMouseMove}
                cursor={cursor}
              >
                <Source id="water-data" type="geojson" data={coloredLocationGeoJSON}>

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
                        'case',
                        ['==', ['get', 'trackGeometry'], 'point'],
                        'rgba(0,0,0,0)',
                        ['coalesce', ['get', 'color'], '#2b6cb0'],
                      ],
                      'circle-stroke-color': [
                        'case',
                        ['==', ['get', 'trackGeometry'], 'point'],
                        ['coalesce', ['get', 'color'], '#2b6cb0'],
                        '#ffffff',
                      ],
                      'circle-stroke-width': 2,
                      'circle-opacity': 0.9,
                    }}
                    filter={['!=', ['get', 'trackGeometry'], 'polygon']}
                  />
                  {/* Points on polygon tracks render as squares (text glyph — circle layers can't draw squares) */}
                  <Layer
                    id='water-points-square'
                    type='symbol'
                    source='water-data'
                    filter={['==', ['get', 'trackGeometry'], 'polygon']}
                    layout={{
                      'text-field': '■',
                      'text-size': 14,
                      'text-allow-overlap': true,
                      'text-ignore-placement': true,
                    }}
                    paint={{
                      'text-color': ['coalesce', ['get', 'color'], '#2b6cb0'],
                      'text-halo-color': '#ffffff',
                      'text-halo-width': 1,
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
                </Source>

                {stationLineUrl && (
                  <Source id="station-line" type="geojson" data={stationLineUrl}>
                    <Layer
                      id="station-line"
                      type="line"
                      source="station-line"
                      paint={{
                        'line-width': 1,
                        'line-color': '#ff8aff',
                        'line-dasharray': [8, 6]
                      }}
                    />
                  </Source>
                )}

                <Source id="station-labels" type="vector" url="mapbox://qiaoxin136.fa1iqa">
                  <Layer
                    id="station-labels"
                    type="symbol"
                    source="station-labels"
                    source-layer="text.zip-kwe786"
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
                {hoverInfo && !popupInfo && (
                  <Popup
                    longitude={hoverInfo.longitude}
                    latitude={hoverInfo.latitude}
                    anchor="bottom"
                    offset={12}
                    closeButton={false}
                    closeOnClick={false}
                  >
                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                      <div><b>Track:</b> {hoverInfo.track}</div>
                      <div><b>Date:</b> {hoverInfo.date}</div>
                      <div><b>Type:</b> {hoverInfo.type}</div>
                    </div>
                  </Popup>
                )}
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
                              <td>Time</td>
                              <td>
                                <input
                                  aria-label="Time"
                                  type="time"
                                  value={editTime}
                                  onChange={e => setEditTime(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px', width: '100%' }}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Type</td>
                              <td>
                                {/* Native selects can't wrap their selected value, so show it in a
                                    wrapped 3-line box with a transparent select overlaid on top. */}
                                <div style={{ position: 'relative' }}>
                                  <div style={{
                                    fontSize: '11px', padding: '2px 18px 2px 4px', width: '100%',
                                    minHeight: '3.6em', lineHeight: '1.2em',
                                    border: '1px solid #ccc', borderRadius: '3px',
                                    background: '#fff', whiteSpace: 'normal', wordBreak: 'break-word',
                                    boxSizing: 'border-box',
                                  }}>
                                    {editType}
                                    <span style={{ position: 'absolute', right: '4px', top: '2px', color: '#666' }}>▾</span>
                                  </div>
                                  <select
                                    aria-label="Type"
                                    value={editType}
                                    onChange={e => setEditType(e.target.value)}
                                    style={{
                                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                                      opacity: 0, cursor: 'pointer',
                                    }}
                                  >
                                    {options.map((option) => {
                                      const color = option.geometry === 'line' ? 'darkgreen'
                                        : option.geometry === 'polygon' ? 'darkblue' : 'dimgrey';
                                      return (
                                        <option key={option.value} value={option.value}
                                          style={{ color, whiteSpace: 'normal' }}>
                                          {option.label}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
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
                              <td>Width</td>
                              <td>
                                <input
                                  aria-label="Width"
                                  type="number"
                                  value={editWidth}
                                  onChange={e => setEditWidth(e.target.value)}
                                  style={{ fontSize: '11px', padding: '2px 4px', width: '100%' }}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Description</td>
                              <td>
                                <textarea
                                  aria-label="Description"
                                  value={editDescription}
                                  onChange={e => setEditDescription(e.target.value)}
                                  rows={3}
                                  style={{
                                    fontSize: '11px', padding: '2px 4px', width: '100%',
                                    boxSizing: 'border-box', resize: 'vertical',
                                    fontFamily: 'inherit',
                                  }}
                                />
                              </td>
                            </tr>
                            <tr>
                              <td>Station</td>
                              <td style={{ fontSize: '11px', padding: '2px 4px' }}>
                                {popupInfo.properties.station ?? '—'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <br />
                        {popupPhotos.length > 0 && (
                          <>
                            <label style={{ fontSize: '11px' }}>Photos:</label><br />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                              {popupPhotos.map((photo, i) => (
                                <img
                                  key={photo.path}
                                  src={photo.url}
                                  alt={`photo ${i + 1}`}
                                  style={{
                                    width: '48px', height: '48px', objectFit: 'cover',
                                    borderRadius: '3px', border: '1px solid #ccc', cursor: 'pointer',
                                  }}
                                  onClick={(e) => { e.stopPropagation(); setFullPhotoIndex(i); }}
                                />
                              ))}
                            </div>
                          </>
                        )}
                        <label style={{ fontSize: '11px' }}>Add photos:</label><br />
                        <input type="file" multiple accept="image/*"
                          onChange={(e) => previewPhotos(e)}
                          placeholder="new picture"
                          className="popup-file-input"
                        /><br /><br />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="popup-btn"
                            onClick={(e) => {
                              console.log(popupInfo.properties);
                              handleSubmit(e, popupInfo.properties.id);
                              setPopupInfo(null);
                            }}
                          >
                            Upload
                          </button>
                          <button
                            className="popup-btn popup-btn-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLocation(popupInfo.properties.id);
                              setPopupInfo(null);
                            }}
                          >
                            Delete
                          </button>
                          <button
                            className="popup-btn popup-btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleUpdatePopup(popupInfo.properties.id); }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </Popup>
                    {fullPhotoIndex != null && popupPhotos[fullPhotoIndex] && (
                      <div
                        onClick={() => setFullPhotoIndex(null)}
                        style={{
                          position: 'fixed', inset: 0, zIndex: 1000,
                          background: 'rgba(0,0,0,0.75)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'zoom-out',
                        }}
                      >
                        {popupPhotos.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullPhotoIndex((fullPhotoIndex - 1 + popupPhotos.length) % popupPhotos.length);
                            }}
                            style={{
                              position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                              fontSize: '28px', padding: '8px 14px', cursor: 'pointer',
                              border: 'none', borderRadius: '50%',
                              background: 'rgba(255,255,255,0.85)', color: '#333',
                            }}
                            aria-label="Previous picture"
                          >
                            ‹
                          </button>
                        )}
                        <img
                          src={popupPhotos[fullPhotoIndex].url}
                          alt={`full size ${fullPhotoIndex + 1} of ${popupPhotos.length}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px', cursor: 'default' }}
                        />
                        {popupPhotos.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullPhotoIndex((fullPhotoIndex + 1) % popupPhotos.length);
                            }}
                            style={{
                              position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                              fontSize: '28px', padding: '8px 14px', cursor: 'pointer',
                              border: 'none', borderRadius: '50%',
                              background: 'rgba(255,255,255,0.85)', color: '#333',
                            }}
                            aria-label="Next picture"
                          >
                            ›
                          </button>
                        )}
                        <div
                          style={{
                            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', alignItems: 'center', gap: '12px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                            {fullPhotoIndex + 1} / {popupPhotos.length}
                          </span>
                          <button
                            className="popup-btn popup-btn-danger"
                            style={{ flex: 'none' }}
                            onClick={() => deletePopupPhoto(popupInfo.properties.id, popupPhotos[fullPhotoIndex].path)}
                          >
                            Delete picture
                          </button>
                        </div>
                      </div>
                    )}

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
          }],
          ...(showAdminTabs ? [{
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
                maxHeight="calc(100vh - 120px)"
                style={{ overflowY: 'auto' }}
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
                        <TableCell as="th" onClick={() => toggleHistorySort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>Date{historySortArrow('date')}</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Time</TableCell>
                        <TableCell as="th" onClick={() => toggleHistorySort('track')} style={{ cursor: 'pointer', userSelect: 'none' }}>Track{historySortArrow('track')}</TableCell>
                        <TableCell as="th">Width</TableCell>
                        <TableCell as="th" onClick={() => toggleHistorySort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>Type{historySortArrow('type')}</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>User</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Length</TableCell>
                        <TableCell as="th" onClick={() => toggleHistorySort('images')} style={{ cursor: 'pointer', userSelect: 'none' }}>Images{historySortArrow('images')}</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Latitude</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Longitude</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedHistory.map((location) => (
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
                          <TableCell /* width="10%" */>{location.width != null ? location.width : ''}</TableCell>
                          <TableCell /* width="15%" */>{location.type}</TableCell>
                          <TableCell /* width="15%" */>{location.username}</TableCell>
                          <TableCell /* width="15%" */>{location.length != null ? Math.round(Number(location.length)) : ''}</TableCell>
                          <TableCell /* width="15%" */>{location.photos ? location.photos.length : 0}</TableCell>
                          <TableCell /* width="15%" */>{location.lat != null ? Number(location.lat).toFixed(6) : ''}</TableCell>
                          <TableCell /* width="15%" */>{location.lng != null ? Number(location.lng).toFixed(6) : ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>

                  </Table>
                </ThemeProvider>
              </ScrollView>
            </>)
          }] : []),
          {
            label: "Report Input",
            value: "3",
            content: (<>
              <ScrollView
                as="div"
                ariaLabel="Report Input"
                backgroundColor="var(--amplify-colors-white)"
                borderRadius="6px"
                color="var(--amplify-colors-blue-60)"
                padding="1rem"
                height="75vh"
                style={{ overflowY: 'auto' }}
              >
                <ThemeProvider theme={theme} colorMode="light">
                  <Table caption="" highlightOnHover={false} variation="striped"
                    style={{ width: '100%', fontFamily: 'Arial, sans-serif' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell as="th">Date</TableCell>
                        <TableCell as="th">Station</TableCell>
                        <TableCell as="th">Feet</TableCell>
                        <TableCell as="th">Weather</TableCell>
                        <TableCell as="th">High Temp</TableCell>
                        <TableCell as="th">Low Temp</TableCell>
                        <TableCell as="th">Supervisor</TableCell>
                        <TableCell as="th">Labor</TableCell>
                        <TableCell as="th">Observation</TableCell>
                        <TableCell as="th">Remark</TableCell>
                        <TableCell as="th">Comment</TableCell>
                        <TableCell as="th">Equipment</TableCell>
                        <TableCell as="th">
                          <select onChange={e => { if (e.target.value) { setDiEquipment(prev => prev ? prev + ', ' + e.target.value : e.target.value); e.target.value = ''; } }} style={{ fontSize: '11px', padding: '2px' }}>
                            <option value="">+List</option>
                            <option>Loader</option>
                            <option>Excavator</option>
                            <option>Bobcat</option>
                            <option>Broom Tractor</option>
                            <option>Combination</option>
                            <option>Vibratory Roller</option>
                            <option>Pneumatic Roller</option>
                            <option>Grader</option>
                            <option>Mini Grader</option>
                            <option>Asphalt / Dump Truck</option>
                            <option>Milling Machine</option>
                            <option>Asphalt Paver</option>
                            <option>HDD Machine</option>
                            <option>Trencher</option>
                            <option>Crane</option>
                            <option>Sled Tamp</option>
                            <option>Dozer</option>
                          </select>
                          <button onClick={() => setDiEquipment("")} style={{ fontSize: '11px', padding: '2px 6px', marginLeft: '4px', backgroundColor: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}>Clear</button>
                        </TableCell>
                        <TableCell as="th"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <input type="date" value={date} readOnly style={{ width: '100%' }} />
                        </TableCell>
                        <TableCell style={{ fontSize: '11px' }}>—</TableCell>
                        <TableCell style={{ fontSize: '11px' }}>—</TableCell>
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
                          <button onClick={createDateInfo} disabled={!date} style={{ backgroundColor: 'green', color: 'white', border: 'none', padding: '4px 10px', cursor: 'pointer' }}>Add</button>
                        </TableCell>
                      </TableRow>
                      {[...dateInfoList].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).map(item => {
                        const isEditing = editingDateId === item.id;
                        const ef = editDateFields;
                        const setEf = (field: keyof typeof editDateFields, val: string | number | "") =>
                          setEditDateFields(prev => ({ ...prev, [field]: val }));
                        return isEditing ? (
                          <TableRow key={item.id}>
                            <TableCell>
                              <input type="date" value={ef.date}
                                onChange={e => setEf('date', e.target.value)} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell style={{ fontSize: '11px' }}>{item.station ?? '—'}</TableCell>
                            <TableCell style={{ fontSize: '11px' }}>{item.feet ?? '—'}</TableCell>
                            <TableCell>
                              <input type="text" value={ef.weather}
                                onChange={e => setEf('weather', e.target.value)} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="number" value={ef.hight}
                                onChange={e => setEf('hight', e.target.value === "" ? "" : Number(e.target.value))} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="number" value={ef.lowt}
                                onChange={e => setEf('lowt', e.target.value === "" ? "" : Number(e.target.value))} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="text" value={ef.supervisor}
                                onChange={e => setEf('supervisor', e.target.value)} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="number" value={ef.labor}
                                onChange={e => setEf('labor', e.target.value === "" ? "" : Number(e.target.value))} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="text" value={ef.observation}
                                onChange={e => setEf('observation', e.target.value)} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="text" value={ef.remark}
                                onChange={e => setEf('remark', e.target.value)} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="text" value={ef.comment}
                                onChange={e => setEf('comment', e.target.value)} style={{ width: '100%' }} />
                            </TableCell>
                            <TableCell>
                              <input type="text" value={ef.equipment}
                                onChange={e => setEf('equipment', e.target.value)} style={{ width: '100%' }} />
                              <select onChange={e => { if (e.target.value) { setEf('equipment', (ef.equipment ? ef.equipment + ', ' : '') + e.target.value); e.target.value = ''; } }} style={{ fontSize: '11px', padding: '2px', marginTop: '2px' }}>
                                <option value="">+List</option>
                                <option>Loader</option>
                                <option>Excavator</option>
                                <option>Bobcat</option>
                                <option>Broom Tractor</option>
                                <option>Combination</option>
                                <option>Vibratory Roller</option>
                                <option>Pneumatic Roller</option>
                                <option>Grader</option>
                                <option>Mini Grader</option>
                                <option>Asphalt / Dump Truck</option>
                                <option>Milling Machine</option>
                                <option>Asphalt Paver</option>
                                <option>HDD Machine</option>
                                <option>Trencher</option>
                                <option>Crane</option>
                                <option>Sled Tamp</option>
                                <option>Dozer</option>
                              </select>
                              <button onClick={() => setEf('equipment', '')} style={{ fontSize: '11px', padding: '2px 6px', marginLeft: '4px', backgroundColor: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}>Clear</button>
                            </TableCell>
                            <TableCell>
                              <button onClick={() => saveDateInfo(item.id)} style={{ marginRight: 4, backgroundColor: 'green', color: 'white', border: 'none', padding: '4px 10px', cursor: 'pointer' }}>Save</button>
                              <button onClick={() => setEditingDateId(null)} style={{ backgroundColor: 'red', color: 'white', border: 'none', padding: '4px 10px', cursor: 'pointer' }}>Cancel</button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={item.id}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.station ?? '—'}</TableCell>
                            <TableCell>{item.feet ?? '—'}</TableCell>
                            <TableCell>{item.weather}</TableCell>
                            <TableCell>{item.hight}</TableCell>
                            <TableCell>{item.lowt}</TableCell>
                            <TableCell>{item.supervisor}</TableCell>
                            <TableCell>{item.labor}</TableCell>
                            <TableCell>{item.observation}</TableCell>
                            <TableCell>{item.remark}</TableCell>
                            <TableCell>{item.comment}</TableCell>
                            <TableCell>{item.equipment}</TableCell>
                            <TableCell>
                              <button onClick={() => {
                                setEditingDateId(item.id);
                                setEditDateFields({
                                  date: item.date ?? "",
                                  weather: item.weather ?? "",
                                  hight: item.hight ?? "",
                                  lowt: item.lowt ?? "",
                                  supervisor: item.supervisor ?? "",
                                  labor: item.labor ?? "",
                                  observation: item.observation ?? "",
                                  remark: item.remark ?? "",
                                  comment: item.comment ?? "",
                                  equipment: item.equipment ?? "",
                                });
                              }} style={{ backgroundColor: 'green', color: 'white', border: 'none', padding: '4px 10px', cursor: 'pointer', marginRight: 4 }}>Modify</button>
                              <button onClick={() => { if (window.confirm(`Delete record for ${item.date}?`)) client.models.Date.delete({ id: item.id }); }} style={{ backgroundColor: 'red', color: 'white', border: 'none', padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ThemeProvider>
              </ScrollView>
            </>)
          },
          ...(showAdminTabs ? [{
            label: "Track Info",
            value: "4",
            content: (<>
              <ScrollView
                as="div"
                ariaLabel="Track Info"
                backgroundColor="var(--amplify-colors-white)"
                borderRadius="6px"
                color="var(--amplify-colors-blue-60)"
                padding="1rem"
                height="calc(100vh - 320px)"
                style={{ overflowY: 'auto' }}
              >
                <ThemeProvider theme={theme} colorMode="light">
                  <Table caption="" highlightOnHover={false} variation="striped"
                    style={{ width: '100%', fontFamily: 'Arial, sans-serif' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell as="th">Auto/Manual</TableCell>
                        <TableCell as="th">Track</TableCell>
                        <TableCell as="th">Type</TableCell>
                        <TableCell as="th">Geometry</TableCell>
                        <TableCell as="th">Width</TableCell>
                        <TableCell as="th">ft²</TableCell>
                        <TableCell as="th">yd²</TableCell>
                        <TableCell as="th">Unit Price ($/unit)</TableCell>
                        <TableCell as="th">Unit</TableCell>
                        <TableCell as="th">Last Date</TableCell>
                        <TableCell as="th">Quantity</TableCell>
                        <TableCell as="th">Cost</TableCell>
                        <TableCell as="th">Num Points</TableCell>
                        <TableCell as="th"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* New record input row */}
                      <TableRow>
                        <TableCell>
                          <input type="checkbox" checked={newTrack.cost} onChange={e => setNewTrack(p => ({ ...p, cost: e.target.checked }))} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="Track #" value={newTrack.track === "" ? "" : String(newTrack.track)}
                            onChange={e => setNewTrack(p => ({ ...p, track: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '60px' }} />
                        </TableCell>
                        <TableCell>
                          <Input type="text" placeholder="Type" value={(newTrack as any).type ?? ""}
                            onChange={e => setNewTrack(p => ({ ...p, type: e.target.value }))} style={{ width: '120px' }} />
                        </TableCell>
                        <TableCell>
                          <select value={newTrack.geometry} onChange={e => setNewTrack(p => ({ ...p, geometry: e.target.value }))} style={{ padding: '4px' }}>
                            <option value="line">line</option>
                            <option value="point">point</option>
                            <option value="polygon">polygon</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="Width" value={newTrack.width === "" ? "" : String(newTrack.width)}
                            onChange={e => setNewTrack(p => ({ ...p, width: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="ft²" value={newTrack.ft2 === "" ? "" : String(newTrack.ft2)}
                            onChange={e => setNewTrack(p => ({ ...p, ft2: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="yd²" value={newTrack.yd2 === "" ? "" : String(newTrack.yd2)}
                            onChange={e => setNewTrack(p => ({ ...p, yd2: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="Unit Price" value={newTrack.unitprice === "" ? "" : String(newTrack.unitprice)}
                            onChange={e => setNewTrack(p => ({ ...p, unitprice: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '80px' }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="Qty" value={newTrack.quan === "" ? "" : String(newTrack.quan)}
                            onChange={e => setNewTrack(p => ({ ...p, quan: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="Value" value={newTrack.value === "" ? "" : String(newTrack.value)}
                            onChange={e => setNewTrack(p => ({ ...p, value: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" placeholder="# Points" value={newTrack.numpoint === "" ? "" : String(newTrack.numpoint)}
                            onChange={e => setNewTrack(p => ({ ...p, numpoint: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                        </TableCell>
                        <TableCell>
                        </TableCell>
                        <TableCell>
                          <button onClick={createTrackInfo} style={{ backgroundColor: '#2b6cb0', color: 'white', border: 'none', padding: '4px 10px', cursor: 'pointer' }}>Add</button>
                        </TableCell>
                      </TableRow>
                      {[...trackInfoList].sort((a, b) => (a.track ?? 0) - (b.track ?? 0)).map((item) => {
                        const isEditing = editingTrackId === item.id;
                        return isEditing ? (
                          <TableRow key={item.id}>
                            <TableCell>
                              <input type="checkbox" checked={editTrackFields.cost} onChange={e => setEditTrackFields(p => ({ ...p, cost: e.target.checked }))} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.track === "" ? "" : String(editTrackFields.track)}
                                onChange={e => setEditTrackFields(p => ({ ...p, track: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '60px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="text" value={(editTrackFields as any).type ?? ""}
                                onChange={e => setEditTrackFields(p => ({ ...p, type: e.target.value }))} style={{ width: '120px' }} />
                            </TableCell>
                            <TableCell>
                              <select value={editTrackFields.geometry} onChange={e => setEditTrackFields(p => ({ ...p, geometry: e.target.value }))} style={{ padding: '4px' }}>
                                <option value="line">line</option>
                                <option value="point">point</option>
                                <option value="polygon">polygon</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.width === "" ? "" : String(editTrackFields.width)}
                                onChange={e => setEditTrackFields(p => ({ ...p, width: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.ft2 === "" ? "" : String(editTrackFields.ft2)}
                                onChange={e => setEditTrackFields(p => ({ ...p, ft2: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.yd2 === "" ? "" : String(editTrackFields.yd2)}
                                onChange={e => setEditTrackFields(p => ({ ...p, yd2: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.unitprice === "" ? "" : String(editTrackFields.unitprice)}
                                onChange={e => setEditTrackFields(p => ({ ...p, unitprice: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '80px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="text" value={editTrackFields.unit}
                                onChange={e => setEditTrackFields(p => ({ ...p, unit: e.target.value }))} style={{ width: '100px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="text" value={editTrackFields.lastdate}
                                onChange={e => setEditTrackFields(p => ({ ...p, lastdate: e.target.value }))} style={{ width: '100px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.quan === "" ? "" : String(editTrackFields.quan)}
                                onChange={e => setEditTrackFields(p => ({ ...p, quan: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.value === "" ? "" : String(editTrackFields.value)}
                                onChange={e => setEditTrackFields(p => ({ ...p, value: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={editTrackFields.numpoint === "" ? "" : String(editTrackFields.numpoint)}
                                onChange={e => setEditTrackFields(p => ({ ...p, numpoint: e.target.value === "" ? "" : Number(e.target.value) }))} style={{ width: '70px' }} />
                            </TableCell>
                            <TableCell>
                              <button onClick={() => saveTrackInfo(item.id!)} style={{ backgroundColor: 'green', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', marginRight: '4px' }}>Save</button>
                              <button onClick={() => setEditingTrackId(null)} style={{ border: 'none', padding: '4px 8px', cursor: 'pointer' }}>Cancel</button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={item.id}>
                            <TableCell>{item.cost ? '✓' : ''}</TableCell>
                            <TableCell>{item.track}</TableCell>
                            <TableCell>{(item as any).type ?? ''}</TableCell>
                            <TableCell>{item.geometry}</TableCell>
                            <TableCell>{item.width ?? ''}</TableCell>
                            <TableCell>{item.ft2 != null ? Math.round(item.ft2).toLocaleString('en-US') : ''}</TableCell>
                            <TableCell>{item.yd2 != null ? Math.round(item.yd2).toLocaleString('en-US') : ''}</TableCell>
                            <TableCell>{item.unitprice != null ? '$' + Math.round(item.unitprice).toLocaleString('en-US') : ''}</TableCell>
                            <TableCell>{item.unit ?? ''}</TableCell>
                            <TableCell>{item.lastdate ?? ''}</TableCell>
                            <TableCell>{item.quan != null ? Math.round(item.quan).toLocaleString('en-US') : ''}</TableCell>
                            <TableCell>{item.value != null ? '$' + Math.round(item.value).toLocaleString('en-US') : ''}</TableCell>
                            <TableCell>{item.numpoint ?? ''}</TableCell>
                            <TableCell>
                              <button onClick={() => {
                                setEditingTrackId(item.id);
                                setEditTrackFields({
                                  track: item.track ?? "",
                                  geometry: item.geometry ?? "line",
                                  width: item.width ?? "",
                                  ft2: item.ft2 ?? "",
                                  yd2: item.yd2 ?? "",
                                  unitprice: item.unitprice ?? "",
                                  quan: item.quan ?? "",
                                  value: item.value ?? "",
                                  numpoint: item.numpoint ?? "",
                                  trip: item.trip ?? false,
                                  cost: item.cost ?? false,
                                  unit: item.unit ?? "",
                                  lastdate: item.lastdate ?? "",
                                });
                              }} style={{ backgroundColor: '#2b6cb0', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', marginRight: '4px' }}>Edit</button>
                              <button onClick={() => { if (window.confirm(`Delete track ${item.track} record?`)) client.models.Track.delete({ id: item.id }); }} style={{ backgroundColor: 'red', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>Delete</button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ThemeProvider>
              </ScrollView>
            </>)
          }] : []),
        ]}
      />

      {showTrackTypes && (
        <div
          onClick={() => setShowTrackTypes(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '8px', padding: '16px', width: '440px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.35)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#1a365d' }}>Track / Type ({trackTypePairs.length})</h3>
              <button
                onClick={() => setShowTrackTypes(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #1a365d', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px', width: '80px' }}>Track</th>
                  <th style={{ padding: '4px 8px' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {trackTypePairs.map((p, i) => (
                  <tr key={`${p.track}|${p.type}`} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 ? '#f7fafc' : '#fff' }}>
                    <td style={{ padding: '4px 8px' }}>{p.track}</td>
                    <td style={{ padding: '4px 8px' }}>{p.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </main>
  );
}

export default App;
