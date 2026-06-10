import type { ChangeEvent, SyntheticEvent } from "react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
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
import { TRACK_DATA } from './trackData';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

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
  'createdAt', 'updatedAt',
] as const;
type DateItem = SelectionSet<Schema['Date']['type'], typeof dateSelectionSet>;

const trackInfoSelectionSet = [
  'id', 'track', 'geometry', 'ft2', 'yd2', 'unitprice',
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
        },
      })),
  }), [location]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  //const [report, setReport] = useState("");
  const [track, setTrack] = useState<number>(0);
  const [type, setType] = useState<string>("reuse");
  const [diameter, setDiameter] = useState<number>(0);
  const [length, setLength] = useState<number>(0);
  const [userName, setUserName] = useState<string>();
  const [description, setDescription] = useState<string>("");
  const joint = "joint";
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [placePhotos, setPlacePhotos] = useState<File[]>([]);

  const [tab, setTab] = useState("1");
  const [basemap, setBasemap] = useState("mapbox://styles/mapbox/streets-v12");
  const [pdfMode, setPdfMode] = useState(false);
  const [calResult, setCalResult] = useState<number | null>(null);
  const [computeStatus, setComputeStatus] = useState<string[]>([]);
  const [showAdminTabs, setShowAdminTabs] = useState<boolean>(false);

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

  const coloredLocationGeoJSON = useMemo(() => ({
    ...locationGeoJSON,
    features: locationGeoJSON.features.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        color: TYPE_COLOR_MAP[f.properties.type] ?? '#2b6cb0',
      },
    })),
  }), [locationGeoJSON]);
  const typeInfo1Rows = useMemo(() => {
    const groups: Record<string, { typeid1: string; type: string | null; unitprice: number | null; unit: string | null; quan: number; value: number }> = {};
    for (const t of trackInfoList) {
      if (!t.typeid1) continue;
      const g = groups[t.typeid1] ??= { typeid1: t.typeid1, type: null, unitprice: null, unit: null, quan: 0, value: 0 };
      if (g.type == null && t.type != null) g.type = t.type;
      if (g.unitprice == null && t.unitprice != null) g.unitprice = t.unitprice;
      if (g.unit == null && t.unit != null) g.unit = t.unit;
      g.quan += t.quan ?? 0;
      g.value += t.value ?? 0;
    }
    // Resolve type/unitprice/unit from trackData.ts (source of truth) so stale Track rows don't show outdated values
    for (const g of Object.values(groups)) {
      const ref = TRACK_DATA.find(r => r.typeid1 === g.typeid1);
      if (ref) {
        g.type = ref.type;
        g.unitprice = ref.unitprice;
        g.unit = ref.unit;
      }
    }
    return Object.values(groups).sort((a, b) => a.typeid1.localeCompare(b.typeid1, undefined, { numeric: true }));
  }, [trackInfoList]);

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackFields, setEditTrackFields] = useState({
    track: "" as number | "", geometry: "line",
    ft2: "" as number | "", yd2: "" as number | "",
    unitprice: "" as number | "", quan: "" as number | "",
    value: "" as number | "", numpoint: "" as number | "",
    trip: false, cost: false,
    unit: "", lastdate: "",
  });
  const [newTrack, setNewTrack] = useState({
    track: "" as number | "", geometry: "line",
    ft2: "" as number | "", yd2: "" as number | "",
    unitprice: "" as number | "", quan: "" as number | "",
    value: "" as number | "", numpoint: "" as number | "",
    trip: false, cost: true,
  });



  const options = TRACK_DATA
    .map(r => ({ value: r.type, label: r.type, geometry: r.geometry }))
    .sort((a, b) => a.geometry.localeCompare(b.geometry));

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

  const handleTrack = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setTrack(val);
    if (!isNaN(val) && !trackInfoList.some(item => item.track === val)) {
      client.models.Track.create({ track: val });
      setNewTrack({ track: "", geometry: "line", ft2: "", yd2: "", unitprice: "", quan: "", value: "", numpoint: "", trip: false, cost: true });
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
      length: calResult !== null ? calResult : length,
      username: name,
      description: description,
      lat: lat,
      lng: lng,
      joint: joint,
    });

    if (!trackInfoList.some(t => t.track === track)) {
      client.models.Track.create({ track, cost: true });
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
      ft2: newTrack.ft2 !== "" ? Number(newTrack.ft2) : undefined,
      yd2: newTrack.yd2 !== "" ? Number(newTrack.yd2) : undefined,
      unitprice: newTrack.unitprice !== "" ? Number(newTrack.unitprice) : undefined,
      quan: newTrack.quan !== "" ? Number(newTrack.quan) : undefined,
      value: newTrack.value !== "" ? Number(newTrack.value) : undefined,
      numpoint: newTrack.numpoint !== "" ? Number(newTrack.numpoint) : undefined,
      trip: newTrack.trip,
      cost: true,
    });
    setNewTrack({ track: "", geometry: "line", ft2: "", yd2: "", unitprice: "", quan: "", value: "", numpoint: "", trip: false, cost: true });
  }

  function saveTrackInfo(id: string) {
    client.models.Track.update({
      id,
      track: editTrackFields.track !== "" ? Number(editTrackFields.track) : undefined,
      geometry: editTrackFields.geometry || undefined,
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
      flushSync(() => setComputeStatus(["Complete Polygon: processing..."]));
      const LAT_FT = 364000;
      const features: {
        type: 'Feature';
        geometry: { type: 'Polygon'; coordinates: number[][][] };
        properties: Record<string, unknown>;
      }[] = [];

      const polygonTracks = trackInfoList.filter(t => t.geometry === 'polygon');
      flushSync(() => setComputeStatus(prev => [...prev, `Complete Polygon: found ${polygonTracks.length} polygon track(s)...`]));

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
        setComputeStatus(prev => [...prev, "Complete Polygon: no polygon tracks with 3+ points found."]);
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

      flushSync(() => setComputeStatus(prev => [...prev, `Complete Polygon: uploading ${features.length} polygon(s)...`]));
      const geojson = { type: 'FeatureCollection' as const, features };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      await uploadData({
        path: 'geojson/polygon.geojson',
        data: blob,
        options: { contentType: 'application/json' },
      }).result;
      setComputeStatus(prev => [...prev, `✓ Saved ${features.length} polygon(s) to Amplify Storage as geojson/polygon.geojson.`]);
    } catch (err) {
      console.error('handleCompletePolygon error:', err);
      setComputeStatus(prev => [...prev, `✗ Complete Polygon failed: ${String(err)}`]);
    }
  }

  async function handleCompute() {
    const LAT_FT = 364000;
    const sorted = [...trackInfoList].sort((a, b) => (a.track ?? 0) - (b.track ?? 0));

    // Pass 0: populate unitprice and geometry from trackData.ts by matching Location type → TRACK_DATA
    flushSync(() => setComputeStatus(["Pass 0: Populating unit price, geometry, unit from trackData..."]));
    for (const trackRec of sorted) {
      const pts = location.filter(l => l.track === trackRec.track);
      const firstType = pts.find(p => p.type)?.type;
      const match = firstType ? TRACK_DATA.find(r => r.type === firstType) : undefined;
      await client.models.Track.update({
        id: trackRec.id,
        trip: true,
        ...(trackRec.cost == null && { cost: true }),
        ...(match?.unitprice != null && { unitprice: match.unitprice }),
        ...(match?.geometry  != null && { geometry:  match.geometry  }),
        ...(match?.unit      != null && { unit:      match.unit      }),
        ...(match?.color     != null && { color:     match.color     }),
        ...(match?.type      != null && { type:      match.type      }),
        ...(match?.typeid1   != null && { typeid1:   match.typeid1   }),
        ...(match?.typeid    != null && { typeid:    match.typeid    }),
      });
    }

    // Remove Track records whose track number no longer exists in Location
    flushSync(() => setComputeStatus(prev => [...prev, "Removing Track rows with no matching Location..."]));
    const usedTracks = new Set(location.map(l => l.track));
    await Promise.all(
      sorted
        .filter(t => t.track == null || !usedTracks.has(t.track))
        .map(t => client.models.Track.delete({ id: t.id }))
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
        const total = Math.round(pts.reduce((s, p) => s + (p.length ?? 0), 0) * 100) / 100;
        await client.models.Track.update({ id: trackRec.id, quan: total });

      } else if (trackRec.geometry === 'point') {
        const n = pts.length;
        await client.models.Track.update({ id: trackRec.id, quan: n, numpoint: n });

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

    // Pass 3: count Location records where joint <> "joint", grouped by joint value → save to Valve table (last step)
    flushSync(() => setComputeStatus(prev => [...prev, "Pass 3: Counting joints, updating Valve table..."]));
    const nonJoint = location.filter(l => l.joint !== 'joint' && l.joint != null && l.joint !== '');
    const typeCounts: Record<string, number> = {};
    for (const loc of nonJoint) {
      const t = loc.joint ?? 'Unknown';
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }
    const { data: existingValves } = await client.models.Valve.list();
    for (const [valveType, count] of Object.entries(typeCounts)) {
      const existing = existingValves?.find(v => v.valve === valveType);
      if (existing) {
        await client.models.Valve.update({ id: existing.id, number: count });
      } else {
        await client.models.Valve.create({ valve: valveType, number: count });
      }
    }

    // Pass 4: compute Valve value = number * unitprice * ton
    flushSync(() => setComputeStatus(prev => [...prev, "Pass 4: Computing Valve value = number × unit price × ton..."]));
    const { data: freshValves } = await client.models.Valve.list();
    for (const v of freshValves ?? []) {
      if (v.number != null && v.unitprice != null && v.ton != null) {
        const value = Math.round(v.number * v.unitprice * v.ton * 100) / 100;
        await client.models.Valve.update({ id: v.id, value });
      }
    }

    setComputeStatus(prev => [...prev, "✓ Compute complete."]);
    setTab("4");
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
      setBasemap("mapbox://styles/mapbox/satellite-streets-v12")
    }
  };

  return (
    <main>
      <h1>BCWWS REGIONAL EFFLUENT AND REUSE SOLUTIONS - EFFLUENT WATER TRANSMISSION MAIN</h1>
      <Divider orientation="horizontal" />
      <br />
      <Flex alignItems="flex-start">
        <Button onClick={signOut} width={120}>
          Sign out
        </Button>
        <Button onClick={() => setShowAdminTabs(v => !v)} backgroundColor={showAdminTabs ? "#555" : "#888"} color={"white"}>
          {showAdminTabs ? "▲ Tab" : "▼ Tab"}
        </Button>
        <Button onClick={createLocation} backgroundColor={"azure"} color={"red"}>
          + New
        </Button>
        <Button onClick={handleCal} backgroundColor={"lightyellow"} color={"darkblue"}>
          QC
        </Button>
        <Button onClick={handleCompute} backgroundColor={"lightgreen"} color={"darkgreen"}>
          Compute
        </Button>
        <Button onClick={handleCompletePolygon} backgroundColor={"steelblue"} color={"white"}>
          Complete Polygon
        </Button>
        {computeStatus.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", fontWeight: "bold" }}>
            {computeStatus.map((msg, i) => (
              <span key={i} style={{ color: msg.startsWith("✓") ? "darkgreen" : msg.startsWith("✗") ? "red" : "darkorange" }}>
                {msg}
              </span>
            ))}
          </div>
        )}
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
        width="80px"
        />
        <input
          type="time"
          value={time}
          placeholder="time"
          onChange={handleTime}
          style={{ width: '80px' }}
        />
        <input
          type="number"
          value={track}
          placeholder="track"
          onChange={handleTrack}
          style={{ width: '50px' }}
        />
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


  
        <Input
          type="text"
          value={description}
          placeholder="description"
          onChange={handleDescription}
          style={{ width: '600px' }}
        />
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
                      'circle-color': ['coalesce', ['get', 'color'], '#2b6cb0'],
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
                </Source>

                <Source id="station-labels" type="vector" url="mapbox://qiaoxin136.fa1iqa">
                  <Layer
                    id="station-labels"
                    type="symbol"
                    source="station-labels"
                    source-layer="text-layer"
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
                                  <option value="F&I, Type 'F' Curb and Gutter" style={{ color: 'darkgreen' }}>F&I, Type 'F' Curb and Gutter</option>
                                  <option value="F&I, Type 'E' Curb and Gutter" style={{ color: 'darkgreen' }}>F&I, Type 'E' Curb and Gutter</option>
                                  <option value="F&I, Type 'D' Curb" style={{ color: 'darkgreen' }}>F&I, Type 'D' Curb</option>
                                  <option value="Remove and Replace Existing Guard Rail" style={{ color: 'darkgreen' }}>Remove and Replace Existing Guard Rail</option>
                                  <option value="Remove and Replace Existing Chain Link Fence" style={{ color: 'darkgreen' }}>Remove and Replace Existing Chain Link Fence</option>
                                  <option value="Remove and Replace Existing Aluminum Fence" style={{ color: 'darkgreen' }}>Remove and Replace Existing Aluminum Fence</option>
                                  <option value="F&I, Stabilized Subgrade" style={{ color: 'darkblue' }}>F&I, Stabilized Subgrade</option>
                                  <option value="F&I, Limerock Base" style={{ color: 'darkblue' }}>F&I, Limerock Base</option>
                                  <option value="F&I, Asphalt Pavement Restoration" style={{ color: 'darkblue' }}>F&I, Asphalt Pavement Restoration</option>
                                  <option value="Mill and Resurface Asphalt Pavement" style={{ color: 'darkblue' }}>Mill and Resurface Asphalt Pavement</option>
                                  <option value="Remove and Replace Asphalt Driveway" style={{ color: 'darkblue' }}>Remove and Replace Asphalt Driveway</option>
                                  <option value="F&I, Asphalt Walkway" style={{ color: 'darkblue' }}>F&I, Asphalt Walkway</option>
                                  <option value="F&I, Concrete Median" style={{ color: 'darkblue' }}>F&I, Concrete Median</option>
                                  <option value="F&I, 6 inch Concrete Sidewalk" style={{ color: 'darkblue' }}>F&I, 6 inch Concrete Sidewalk</option>
                                  <option value="Remove and Replace Concrete Driveway" style={{ color: 'darkblue' }}>Remove and Replace Concrete Driveway</option>
                                  <option value="Remove and Replace Paver Driveway" style={{ color: 'darkblue' }}>Remove and Replace Paver Driveway</option>
                                  <option value="F&I, Paver Walkway" style={{ color: 'darkblue' }}>F&I, Paver Walkway</option>
                                  <option value="F&I, Concrete Golf Cart Path" style={{ color: 'darkblue' }}>F&I, Concrete Golf Cart Path</option>
                                  <option value="F&I, Concrete Golf Cart Path with Rolled Curb" style={{ color: 'darkblue' }}>F&I, Concrete Golf Cart Path with Rolled Curb</option>
                                  <option value="Restoration of Green Areas" style={{ color: 'darkblue' }}>Restoration of Green Areas</option>
                                  <option value="Existing Minor Utility Adjustment">Existing Minor Utility Adjustment</option>
                                  <option value="Existing Major Utility Adjustment">Existing Major Utility Adjustment</option>
                                  <option value="Remove and Replace Existing Road Sign & Post Assembly">Remove and Replace Existing Road Sign &amp; Post Assembly</option>
                                  <option value="Remove and Replace Existing Mailbox">Remove and Replace Existing Mailbox</option>
                                  <option value="Restoration of Golf Course">Restoration of Golf Course</option>
                                  <option value="Removal and Replacement of Unsuitable Material">Removal and Replacement of Unsuitable Material</option>
                                  <option value="Replace Existing Potable Water Service">Replace Existing Potable Water Service</option>
                                  <option value="Replace Existing Sanitary Sewer Lateral">Replace Existing Sanitary Sewer Lateral</option>
                                  <option value="F&I, Pavement Marking and Striping">F&I, Pavement Marking and Striping</option>
                                  <option value="R&D, Existing Trees">R&amp;D, Existing Trees</option>
                                  <option value="F&I, Florida Number 2 Trees">F&I, Florida Number 2 Trees</option>
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
                height="75vh"
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
                        <TableCell as="th" /* style={{ width: '15%' }} */>Date</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Time</TableCell>
                        <TableCell as="th" /* style={{ width: '10%' }} */>Track</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Type</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>User</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Length</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Images</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Latitude</TableCell>
                        <TableCell as="th" /* style={{ width: '15%' }} */>Longitude</TableCell>
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
                height="700px"
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
          }, {
            label: "Type Info",
            value: "5",
            content: (<>
              <ScrollView
                as="div"
                ariaLabel="Type Info"
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
                        <TableCell as="th">#</TableCell>
                        <TableCell as="th">Items</TableCell>
                        <TableCell as="th">Unit Price ($/unit)</TableCell>
                        <TableCell as="th">Unit</TableCell>
                        <TableCell as="th">Quantity</TableCell>
                        <TableCell as="th">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        const isFittingRow = (id: string) => /^#0-6-[1-8]$/.test(id);
                        const fittingRows = typeInfo1Rows.filter(r => isFittingRow(r.typeid1));
                        const lastFittingId = fittingRows.at(-1)?.typeid1;
                        const subQuan = fittingRows.reduce((s, r) => s + r.quan, 0);
                        const subValue = fittingRows.reduce((s, r) => s + r.value, 0);
                        return typeInfo1Rows.flatMap(row => {
                          const cells = (
                            <TableRow key={row.typeid1}>
                              <TableCell>{row.typeid1}</TableCell>
                              <TableCell>{row.type ?? ''}</TableCell>
                              <TableCell>{row.unitprice != null ? '$' + row.unitprice.toLocaleString('en-US') : ''}</TableCell>
                              <TableCell>{row.unit ?? ''}</TableCell>
                              <TableCell>{Math.round(row.quan).toLocaleString('en-US')}</TableCell>
                              <TableCell>{'$' + Math.round(row.value).toLocaleString('en-US')}</TableCell>
                            </TableRow>
                          );
                          if (row.typeid1 === lastFittingId) {
                            return [cells, (
                              <TableRow key="subtotal-0-6" style={{ fontWeight: 'bold' }}>
                                <TableCell>F&I, DIP Compact Fittings</TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell>{Math.round(subQuan).toLocaleString('en-US')}</TableCell>
                                <TableCell>{'$' + Math.round(subValue).toLocaleString('en-US')}</TableCell>
                              </TableRow>
                            )];
                          }
                          return [cells];
                        }).concat([
                          <TableRow key="total" style={{ fontWeight: 'bold' }}>
                            <TableCell>Total</TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>{'$' + Math.round(typeInfo1Rows.reduce((s, r) => s + r.value, 0)).toLocaleString('en-US')}</TableCell>
                          </TableRow>
                        ]);
                      })()}
                    </TableBody>
                  </Table>
                </ThemeProvider>
              </ScrollView>
            </>)
          }] : []),
        ]}
      />

    </main>
  );
}

export default App;
