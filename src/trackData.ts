export type TrackRow = {
  typeid1: string;
  typeid?: string;
  type: string;
  geometry: 'line' | 'point' | 'polygon';
  unitprice: number | null;
  totalprice: number | null;
  color: string | null;
  unit: string | null;
};

export const TRACK_DATA: TrackRow[] = [
  { typeid1: '#0-1', typeid:'#0-1',type: 'Bonds and Insurance', geometry: 'point', unitprice: 718250.00, totalprice: 718250.00, color: 'black', unit: "LS" },
  { typeid1: '#0-2', typeid:'#0-2',type: 'Mobilization', geometry: 'point', unitprice: 478667.00, totalprice: 478667.00,color: 'black', unit: "LS" },
  { typeid1: '#0-3', typeid:'#0-3',type: 'Maintenance of Traffic', geometry: 'point', unitprice: 118125.00, totalprice: 118125.00, color: 'black', unit: "LS" },
  { typeid1: '#0-6-1', typeid:'#0-6',type: '24 inch 90D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00, color: 'purple', unit: "EA"   },
  { typeid1: '#0-6-2', typeid:'#0-6',type: '24 inch 45D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00, color: 'purple', unit: "EA"   },
  { typeid1: '#0-6-3', typeid:'#0-6',type: '24 inch 22.5D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00, color: 'purple', unit: "EA"   },
  { typeid1: '#0-6-4', typeid:'#0-6',type: '24 inch 11.25D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00, color: 'purple', unit: "EA"   },
  { typeid1: '#0-6-5', typeid:'#0-6',type: '30 inch 90D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00,color: 'purple', unit: "EA"   },
  { typeid1: '#0-6-6', typeid:'#0-6',type: '30 inch 45D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00,color: 'purple', unit: "EA"   },
  { typeid1: '#0-6-7', typeid:'#0-6',type: '30 inch 22.5D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00,color: 'purple', unit: "EA"   },
  { typeid1: '#0-6-8', typeid:'#0-6',type: '30 inch 11.25D-Bend', geometry: 'point', unitprice: 31762.00, totalprice: 31762.00,color: 'purple', unit: "EA"   },
  { typeid1: '#0-7', typeid:'#0-7',type: '24 inch Plug Valve', geometry: 'point', unitprice: 59867.00, totalprice: 59867.00,color: 'purple', unit: "EA"},
  { typeid1: '#0-8', typeid:'#0-8',type: '30 inch Plug Valve', geometry: 'point', unitprice: 90045.00, totalprice: 180090.00,color: 'purple', unit: "EA"},
  { typeid1: '#0-9', typeid:'#0-9',type: ' Air Release Valve', geometry: 'point', unitprice: 14808.00, totalprice: 310968.00,color: 'purple', unit: "EA"},
  { typeid1: '#0-10', typeid:'#0-10',type: 'NRWWTP Connection', geometry: 'point', unitprice: 229369.00, totalprice: 229369.00,color: 'purple', unit: "LS" },
  { typeid1: '#0-11', typeid:'#0-11',type: '30 inch Line Stop', geometry: 'point', unitprice: 106061.00, totalprice: 212122.00,color: 'purple', unit: "EA" },
  { typeid1: '#0-12', typeid:'#0-12',type: 'Connect to Existing EWTM', geometry: 'point', unitprice: 16250.00, totalprice: 81250.00,color: 'purple', unit: "EA" },
  { typeid1: '#0-13', typeid:'#0-13',type: 'Removal and Replacement of Unsuitable Material', geometry: 'point', unitprice: 36.00,  totalprice: 18000.00, 
color:  'red', unit: "Cubic Yard" },
  { typeid1: '#0-14', typeid:'#0-14',type: 'Excavation in Hard Rock', geometry: 'line', unitprice: 33.00, totalprice: 49500.00,color: 'red', unit:"FT"},
  { typeid1: '#0-15', typeid:'#0-15',type: 'Minor Utility Adjustment', geometry: 'point', unitprice: 2708.00, totalprice: 81240.00,color: 'red', unit: "EA" },
  { typeid1: '#0-16', typeid:'#0-16',type: 'Major Utility Adjustment', geometry: 'point', unitprice:5417.00, totalprice:81255.00,color:'red',unit:"EA" },
  { typeid1:'#0-17',typeid:'#0-17',type:'Stabilized Subgrade A',geometry:'line',unitprice:15.00,totalprice:216000.00, color:'grey',unit:"SY" },
  { typeid1:'#0-18',typeid:'#0-18',type:'Limerock Base',geometry:'polygon',unitprice:48.75,totalprice:737100.00,color:'grey',unit:"SY" },
   {typeid1: '#0-19', typeid:'#0-19',type: 'Asphalt Pavement Restoration A', geometry: 'line', unitprice: 31.00,totalprice:492156.00, color: 'grey', unit: "SY" },
  { typeid1: '#0-20', typeid:'#0-20',type: 'Mill and Resurface Asphalt Pavement A', geometry: 'line', unitprice: 19.00, totalprice: 934800.00, color: 'grey', unit: "SY" },
  { typeid1: '#0-21', typeid:'#0-21',type: "Pavement Marking & Striping", geometry: 'line', unitprice: 168750.00, totalprice:168750.00,color: 'black', unit: "LS" },
  { typeid1: '#0-22', typeid:'#0-22',type: "Type F Curb and Gutter", geometry: 'line', unitprice: 49.00, totalprice:221970.00,color: 'black', unit: "FT" },
  { typeid1: '#0-23', typeid:'#0-23',type: "Type E Curb and Gutter", geometry: 'line', unitprice: 56.00, totalprice:28560.00,color: 'black', unit: "FT" },
  { typeid1: '#0-24', typeid:'#0-24',type: "Type D Curb", geometry: 'line', unitprice: 47.00, totalprice:4700.00,color: 'black', unit: "FT" },
  { typeid1: '#0-25', typeid:'#0-25',type: 'Concrete Median', geometry: 'polygon', unitprice: 107.00, totalprice:82390.00,color:'grey', unit: "SY" },
  { typeid1: '#0-26', typeid:'#0-26',type: '6 inch Concrete Sidewalk', geometry: 'polygon', unitprice: 107.00, totalprice:9630.00,color: "grey", unit: "SY"  },
  { typeid1: '#0-27', typeid:'#0-27',type: 'Remove and Replace Asphalt Driveway', geometry: 'polygon', unitprice:124.00,totalprice:32240.00,color:"grey",unit:"SY"  },
  { typeid1:'#0-28',typeid:'#0-28',type:'Remove and Replace Concrete Driveway',geometry:'polygon',unitprice:191.00,totalprice:22930.00,color:"grey",unit:"EA"  },
  { typeid1:'#0-29',typeid:'#0-29', type:'Remove and Replace Paver Driveway', geometry:'polygon', unitprice:127.00, totalprice:5080.00, color:'grey', unit:"SY"   },
  {typeid1: '#0-30', typeid:'#0-30',type: 'Replace Existing Potable Water Service', geometry: 'point', unitprice: 3275.00, totalprice:163750.00,color: 'blue', unit: "EA" },
  { typeid1: '#0-31', typeid:'#0-31',type: 'Replace Existing Sanitary Sewer Lateral', geometry: 'point', unitprice: 2854.00, totalprice:142700.00,color: 'green',unit: "EA"  },
  { typeid1: '#0-32', typeid:'#0-32',type: 'Remove and Replace Existing Chain Link Fence', geometry: 'line', unitprice: 48.00, totalprice:4080.00,color: 'light green', unit: "FT" },
  { typeid1: '#0-33', typeid:'#0-33',type: 'Remove and Replace Existing Aluminum Fence', geometry: 'line', unitprice: 41.00, totalprice:4100.00,color: 'light green', unit: "FT" },
  { typeid1: '#0-34', typeid:'#0-34',type: 'Remove and Replace Existing Guard Rail', geometry: 'line', unitprice: 81.00, totalprice:8100.00,color: 'black', unit: "FT" },
  { typeid1: '#0-35', typeid:'#0-35',type: 'Remove and Replace Existing Road Sign & Post Assembly', geometry: 'point', unitprice: 2188.00, totalprice:35008.00,color: 'red', unit: "EA"},
  { typeid1: '#0-36', typeid:'#0-36',type: 'Remove and Replace Existing Mailbox', geometry: 'point', unitprice: 369.00, totalprice:8118.00,color: 'red'  , unit: "EA" },
  { typeid1: '#0-37', typeid:'#0-37',type: 'Asphalt Walkway', geometry: 'polygon', unitprice: 81.00, totalprice:16200.00,color: 'grey' , unit: "SY" },
  { typeid1: '#0-38', typeid:'#0-38',type: 'Paver Walkway', geometry: 'polygon', unitprice:156.00,totalprice:2340.00,color:"grey",unit:"SY"  },
  { typeid1: '#0-39', typeid:'#0-39',type: 'Concrete Walkway', geometry: 'polygon', unitprice: 112.00, totalprice:47040.00,color: 'grey', unit: "SY"  },
  { typeid1: '#0-40', typeid:'#0-40',type: 'Concrete Golf Cart Path with Rolled Curb', geometry: 'polygon', unitprice: 131.00, totalprice:41920.00,color: 'grey', unit: "SY"  },
  { typeid1: '#0-41', typeid:'#0-41',type: 'Restoration of Green Areas', geometry: 'polygon', unitprice: 10.50, totalprice:149625.00,color: 'grey',unit: "SY"  },
   { typeid1: '#0-42', typeid:'#0-42',type: 'Restoration of Golf Course', geometry: 'point', unitprice: 66838.00, totalprice:66838.00,color: 'red', unit: "EA" },
  { typeid1: '#0-43', typeid:'#0-43',type: "R&D, Existing Trees", geometry: 'point', unitprice: 9375.00, totalprice:9375.00,color: 'light green', unit: "EA" },
  { typeid1: '#0-44', typeid:'#0-44',type: 'Florida Number 2 Trees', geometry: 'point', unitprice: 5000.00, totalprice:5000.00,color: 'light green', unit: "EA" },
  { typeid1: '#0-45', typeid:'#0-45',type: '24 inch Ductile Iron Pipe, Class 250 (Bid Alternate to Base Bid 0-4)', geometry: 'line', unitprice: 437.00, totalprice:7798265.00,color: 'purple', unit: "FT"},
  { typeid1: '#0-46', typeid:'#0-46',type: '30 inch Ductile Iron Pipe, Class 250 (Bid Alternate to Base Bid 0-5)', geometry:'line',unitprice:658.0,totalprice:5922.00,color:'purple',unit:"FT"},
  {typeid1: '#0-47', typeid:'#0-47',type: 'Asphalt Pavement Restoration B', geometry: 'polygon', unitprice: 31.00,totalprice:492156.00, color: 'grey', unit: "SY" },
  { typeid1: '#0-48', typeid:'#0-48',type: 'Mill and Resurface Asphalt Pavement B', geometry: 'polygon', unitprice: 19.00, totalprice: 934800.00, color: 'grey', unit: "SY" },
  { typeid1:'#0-49',typeid:'#0-49',type:'Stabilized Subgrade B',geometry:'polygon',unitprice:15.00,totalprice:216000.00, color:'grey',unit:"SY" }
];

export const TRACK_TYPES = TRACK_DATA.map(r => r.type);

