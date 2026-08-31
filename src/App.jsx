import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, Bell, Box, CalendarDays, Check,
  ChevronDown, CircleGauge, Clock3, Crosshair, Ellipsis, Eye, FileBarChart,
  Filter, Gauge, Layers, LocateFixed, Map as MapIcon, Maximize, Menu,
  MessageSquare, MoreVertical, Navigation, Package, PanelLeft, Phone,
  RefreshCw, Route, Search, Settings, ShoppingBag, SlidersHorizontal,
  Truck, Users, WalletCards, X, Zap, Grid2X2, LockKeyhole, LogOut,
  ArrowRight, EyeOff, MapPin, ClipboardList, TrendingUp, ShieldCheck, UserRound, List
} from "lucide-react";
import {
  GoogleMap, LoadScript, Marker, OverlayView, Polyline, TrafficLayer
} from "@react-google-maps/api";
import {
  AreaChart, Area, LineChart, Line, ResponsiveContainer, Tooltip,
  XAxis, YAxis, PieChart, Pie, Cell
} from "recharts";

const center = { lat: 18.5204, lng: 73.8567 };
const mapLibraries = ["geometry"];

const salesmanSeed = [
  { id: 101, name: "Rahul Patil", load: "#1848", route: "Pune East", done: 18, total: 26, speed: 28, battery: 72, status: "In Progress", color: "#6842ee", pos: {lat:18.5638,lng:73.9237} },
  { id: 102, name: "Sachin More", load: "#1847", route: "Pune West", done: 15, total: 24, speed: 32, battery: 64, status: "In Progress", color: "#2777e8", pos: {lat:18.568,lng:73.777} },
  { id: 103, name: "Amit Shinde", load: "#1846", route: "Hadapsar", done: 12, total: 20, speed: 25, battery: 81, status: "In Progress", color: "#7650e8", pos: {lat:18.564,lng:73.965} },
  { id: 104, name: "Vikas Jadhav", load: "#1845", route: "Kothrud", done: 22, total: 22, speed: 0, battery: 93, status: "Delivered", color: "#20a862", pos: {lat:18.507,lng:73.798} },
  { id: 105, name: "Sagar Pawar", load: "#1844", route: "Baner", done: 18, total: 18, speed: 0, battery: 87, status: "Delivered", color: "#20a862", pos: {lat:18.510,lng:73.928} }
];

const routes = {
  101: [
    {lat:18.505,lng:73.805},{lat:18.515,lng:73.825},{lat:18.526,lng:73.842},
    {lat:18.536,lng:73.861},{lat:18.548,lng:73.884},{lat:18.558,lng:73.907},
    {lat:18.564,lng:73.924},{lat:18.572,lng:73.944}
  ],
  102: [
    {lat:18.594,lng:73.744},{lat:18.585,lng:73.763},{lat:18.573,lng:73.784},
    {lat:18.560,lng:73.803},{lat:18.548,lng:73.824},{lat:18.532,lng:73.842}
  ],
  103: [
    {lat:18.522,lng:73.842},{lat:18.535,lng:73.862},{lat:18.549,lng:73.884},
    {lat:18.561,lng:73.909},{lat:18.572,lng:73.937},{lat:18.564,lng:73.965}
  ],
  105: [
    {lat:18.497,lng:73.900},{lat:18.500,lng:73.916},{lat:18.505,lng:73.932},
    {lat:18.510,lng:73.948}
  ]
};

const loads = [
  ["#1848","Rahul Patil","Pune East",26,18,8,69,"In Progress","10 sec ago"],
  ["#1847","Sachin More","Pune West",24,15,9,63,"In Progress","15 sec ago"],
  ["#1846","Amit Shinde","Hadapsar",20,12,8,60,"In Progress","8 sec ago"],
  ["#1845","Vikas Jadhav","Kothrud",22,22,0,100,"Delivered","2 min ago"],
  ["#1844","Sagar Pawar","Baner",18,18,0,100,"Delivered","1 min ago"],
  ["#1843","Swapnil Kadam","Hinjewadi",16,0,16,0,"Pending","—"],
  ["#1842","Nilesh Gaikwad","Pimpri",15,0,15,0,"Pending","—"],
  ["#1841","Mahesh Rokade","Deccan",21,9,12,43,"In Progress","20 sec ago"]
];

const completed = [
  ["Vikas Jadhav","#1845 • Kothrud Route","22 Outlets","11:45 AM"],
  ["Sagar Pawar","#1844 • Baner Route","18 Outlets","10:30 AM"],
  ["Rohit Salve","#1840 • Pune East","25 Outlets","09:15 AM"],
  ["Pravin Shelar","#1839 • Hadapsar Route","20 Outlets","08:40 AM"],
  ["Ajay Kale","#1838 • Pune West Route","24 Outlets","08:05 AM"]
];

const performance = [
  {day:"18 May", delivered:35, progress:58},
  {day:"19 May", delivered:22, progress:45},
  {day:"20 May", delivered:42, progress:64},
  {day:"21 May", delivered:18, progress:41},
  {day:"22 May", delivered:44, progress:66},
  {day:"23 May", delivered:24, progress:47},
  {day:"24 May", delivered:37, progress:61}
];

const pie = [
  {name:"Delivered", value:28, color:"#20a862"},
  {name:"In Progress", value:32, color:"#2777e8"},
  {name:"Pending", value:16, color:"#f59e0b"},
  {name:"Failed", value:2, color:"#ef4444"}
];

const nav = [
  ["Dashboard", BarChart3], ["Live Tracking", LocateFixed], ["Loads", Package],
  ["Salesmen", Users], ["Routes", Route], ["Delivery Reports", FileBarChart],
  ["Performance", Activity], ["Expenses", WalletCards], ["Alerts", Bell],
  ["Customers", ShoppingBag], ["Messages", MessageSquare], ["Settings", Settings]
];

function orderDeliveryStops(stops=[]) {
  if (stops.length < 2) return stops;
  const ordered = [stops[0]];
  const remaining = stops.slice(1);
  while (remaining.length) {
    const previous = ordered[ordered.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((stop,index) => {
      const latitudeScale = Math.cos(((previous.lat + stop.lat) / 2) * Math.PI / 180);
      const latDifference = stop.lat - previous.lat;
      const lngDifference = (stop.lng - previous.lng) * latitudeScale;
      const distance = latDifference * latDifference + lngDifference * lngDifference;
      if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
    });
    ordered.push(remaining.splice(nearestIndex,1)[0]);
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let start=1; start<ordered.length-2; start+=1) {
      for (let end=start+1; end<ordered.length-1; end+=1) {
        const currentDistance = stopDistance(ordered[start-1],ordered[start]) + stopDistance(ordered[end],ordered[end+1]);
        const swappedDistance = stopDistance(ordered[start-1],ordered[end]) + stopDistance(ordered[start],ordered[end+1]);
        if (swappedDistance + .001 < currentDistance) {
          ordered.splice(start,end-start+1,...ordered.slice(start,end+1).reverse());
          improved = true;
        }
      }
    }
  }
  return ordered;
}

function stopDistance(left, right) {
  if (!left || !right) return 0;
  const earthRadiusKm = 6371;
  const latDelta = (right.lat-left.lat) * Math.PI/180;
  const lngDelta = (right.lng-left.lng) * Math.PI/180;
  const a = Math.sin(latDelta/2) ** 2 + Math.cos(left.lat*Math.PI/180) * Math.cos(right.lat*Math.PI/180) * Math.sin(lngDelta/2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function Avatar({name="Admin", small=false}) {
  return <div className={`avatar ${small ? "small":""}`}>{name.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>;
}

function StatusPill({status}) {
  const cls = status === "Delivered" ? "success" : status === "Pending" ? "warning" : "info";
  return <span className={`status-pill ${cls}`}><i/> {status}</span>;
}

function KPI({icon:Icon, label, value, change, desc, tone="purple", down=false, points}) {
  return <div className="kpi-card">
    <div className={`kpi-icon ${tone}`}><Icon size={18}/></div>
    <div className="kpi-content">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row">
        <strong>{value}</strong>
        {change && <span className={`change ${down ? "down":""}`}>{down ? "↓" : "↑"} {change}</span>}
      </div>
      <div className="kpi-desc">{desc}</div>
      <svg className="sparkline" viewBox="0 0 150 32" preserveAspectRatio="none">
        <polyline points={points || "0,24 12,22 24,25 36,17 48,19 60,10 72,18 84,8 96,15 108,7 120,18 132,12 150,15"} fill="none" stroke="currentColor" strokeWidth="2"/>
      </svg>
    </div>
  </div>
}

function SalesmanCard({person, onClick, fallback=false}) {
  return (
      <button className={`salesman-marker ${fallback ? "fallback" : ""}`} style={{"--marker":person.color}} onClick={onClick} aria-label={`Open ${person.name} tracking details`}>
        <div className="marker-head">
          <Avatar name={person.name} small/>
          <div>
            <b>{person.name}</b>
            <span>Load {person.load}</span>
          </div>
        </div>
        <div className="marker-foot">
          <span className="vehicle-icon"><Truck size={15}/></span>
          <span>{person.done}/{person.total} ({Math.round(person.done/person.total*100)}%)</span>
          <b>{person.speed} km/h</b>
        </div>
      </button>
  );
}

function SalesmanOverlay({person, onClick}) {
  return (
    <OverlayView position={person.pos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <SalesmanCard person={person} onClick={onClick}/>
    </OverlayView>
  );
}

function MapPanel({salesmen, setSelected, showRoutes, traffic, layerState, trackedLoad, onMapLoad, onMapUnmount}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [mapLoadError, setMapLoadError] = useState(false);
  const trackedStops = trackedLoad?.stops || [];
  const routeStops = useMemo(()=>orderDeliveryStops(trackedStops), [trackedLoad]);
  if (typeof window !== "undefined") window.gm_authFailure = () => setMapLoadError(true);
  useEffect(()=>()=>{
    if (typeof window !== "undefined") window.gm_authFailure = undefined;
  }, []);
  const options = {
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: "greedy",
    styles: [
      {featureType:"poi",elementType:"labels.icon",stylers:[{visibility:"off"}]},
      {featureType:"transit",elementType:"labels.icon",stylers:[{visibility:"off"}]}
    ]
  };

  if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_JAVASCRIPT_API_KEY" || mapLoadError) {
    return <div className="map-fallback">
      <div className="map-grid"/>
      <div className="fallback-city">Pune</div>
      <div className="fallback-road r1"/><div className="fallback-road r2"/><div className="fallback-road r3"/>
      {showRoutes && <svg className="fallback-routes" viewBox="0 0 1000 320" preserveAspectRatio="none">
        {salesmen.slice(0,4).map((person,index)=><path key={person.id} d={["M155 95 C280 100 305 220 470 205 S620 115 755 120","M235 245 C330 230 370 150 520 150 S680 235 805 215","M335 65 C420 95 490 105 570 80 S720 58 845 100","M130 210 C250 170 360 265 485 250 S650 180 760 260"][index]} fill="none" stroke={person.color} strokeWidth="3" strokeLinecap="round" strokeDasharray="7 4"/>) }
      </svg>}
      {layerState.salesmen && salesmen.map(p => <div key={p.id} className="fake-map-marker" style={{left:`${25+(p.id%5)*13}%`,top:`${35+(p.id%4)*10}%`}}>
        <SalesmanCard fallback person={p} onClick={()=>setSelected(p)}/>
      </div>)}
      <div className="map-key-note"><MapIcon size={15}/> {mapLoadError ? <>Google Maps rejected this key. Enable Maps JavaScript API, billing, and allow <b>localhost:5173</b>.</> : <>Live map unavailable — add <b>VITE_GOOGLE_MAPS_API_KEY</b>.</>}</div>
    </div>
  }

  return <LoadScript googleMapsApiKey={apiKey} libraries={mapLibraries} authReferrerPolicy="origin" onError={()=>setMapLoadError(true)}>
    <GoogleMap mapContainerClassName="real-map" center={routeStops[0] || center} zoom={routeStops.length ? 14 : 12} options={options} onLoad={onMapLoad} onUnmount={onMapUnmount}>
      {!trackedStops.length && showRoutes && Object.entries(routes).map(([id,path]) =>
        <Polyline key={id} path={path} options={{strokeColor:salesmen.find(x=>x.id===+id)?.color || "#6842ee", strokeOpacity:.9, strokeWeight:4}}/>
      )}
      {showRoutes && routeStops.length > 1 && <Polyline path={routeStops} options={{strokeColor:"#4338e8",strokeOpacity:1,strokeWeight:5,zIndex:20}}/>}
      {layerState.stops && routeStops.map((stop,index) => index === 0
        ? <Marker key={`delivery-${stop.sequence}`} position={{lat:stop.lat,lng:stop.lng}} title={`Start: ${stop.customerName}`} icon={{path:0,scale:14,fillColor:"#13b47b",fillOpacity:1,strokeColor:"#fff",strokeWeight:3}} label={{text:"▶",color:"#fff",fontSize:"11px"}} zIndex={31}/>
        : <Marker key={`delivery-${stop.sequence}`} position={{lat:stop.lat,lng:stop.lng}} title={`${index}. ${stop.customerName}`} label={{text:String(index),color:"#fff",fontSize:"10px",fontWeight:"700"}} zIndex={30}/>) }
      {traffic && <TrafficLayer/>}
      {!trackedStops.length && layerState.salesmen && salesmen.map(p => <SalesmanOverlay key={p.id} person={p} onClick={()=>setSelected(p)}/>)}
      {!trackedStops.length && salesmen.map(p => <Marker key={`m-${p.id}`} position={p.pos} icon={{path:2,scale:0}}/> )}
    </GoogleMap>
  </LoadScript>
}

function LoadDrawer({row, onClose, onTrack}) {
  if (!row) return null;
  const [id,name,route,total,done,pending,progress,status] = row;
  const outlets = ["ABC Stores","XYZ Traders","Om General Store","Ganesh Mart","Shree Enterprises","Sai Distributors"];
  return <div className="drawer-backdrop" onClick={onClose}>
    <aside className="drawer" onClick={e=>e.stopPropagation()}>
      <div className="drawer-head">
        <div><span className="eyebrow">LOAD DETAILS</span><h2>Load {id}</h2></div>
        <button className="icon-btn" onClick={onClose}><X size={18}/></button>
      </div>
      <div className="drawer-person">
        <Avatar name={name}/><div><b>{name}</b><span>{route}</span></div><StatusPill status={status}/>
      </div>
      <div className="drawer-stats">
        <div><b>{total}</b><span>Outlets</span></div><div><b>{done}</b><span>Delivered</span></div>
        <div><b>{pending}</b><span>Pending</span></div><div><b>{progress}%</b><span>Complete</span></div>
      </div>
      <div className="progress-large"><span style={{width:`${progress}%`}}/></div>
      <div className="drawer-section"><h3>Delivery Sequence</h3>
        {outlets.map((o,i)=><div className="sequence-row" key={o}>
          <span className={`seq ${i<3 ? "done":""}`}>{i+1}</span><div><b>{o}</b><small>{i<3 ? "Delivered • 10:2"+i+" AM":"Pending"}</small></div>
          <StatusPill status={i<3 ? "Delivered":"Pending"}/>
        </div>)}
      </div>
      <div className="drawer-section">
        <h3>Load Activity</h3>
        <div className="activity-line"><span/>Load started <b>09:05 AM</b></div>
        <div className="activity-line"><span/>Last GPS update <b>10 sec ago</b></div>
        <div className="activity-line"><span/>ETA <b>12:45 PM</b></div>
      </div>
      <button className="primary-btn" onClick={()=>onTrack?.(id)}><Navigation size={16}/> Track Salesman</button>
    </aside>
  </div>
}

function LoginPage({onLogin}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const submit = async event => {
    event.preventDefault();
    if (!identifier.trim() || !password) return setError("Enter your username and password.");
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload.error || "Login failed.");
      onLogin(payload.user);
    } catch (requestError) {
      setError(requestError.message === "Failed to fetch" ? "Unable to reach the login server." : requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="login-page">
    <section className="login-panel">
      <div className="login-panel-inner">
      <div className="login-brand"><span><Truck size={27}/></span><div><b>Salesman Portal</b><small>TotalApp Distributor Access</small></div></div>
      <div className="login-copy"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to your account</h1><p>Access your distributor dashboard and manage deliveries efficiently.</p></div>
      <form onSubmit={submit} noValidate>
        <label>Username, email or mobile<div className="login-input"><UserRound size={19}/><input autoFocus autoComplete="username" value={identifier} onChange={event=>setIdentifier(event.target.value)} placeholder="Enter login ID"/></div></label>
        <label>Password<div className="login-input"><LockKeyhole size={19}/><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Enter password"/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        <div className="login-options"><label><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/><span><Check size={13}/></span>Remember me</label><button type="button">Forgot password?</button></div>
        {error && <div className="login-error" role="alert"><AlertTriangle size={15}/>{error}</div>}
        <button className="primary-btn login-submit" disabled={submitting}>{submitting ? <><RefreshCw className="spin" size={16}/>Signing in…</> : <>Log in<ArrowRight size={19}/></>}</button>
        <div className="login-divider"><span>or continue with</span></div>
        <div className="login-alternatives"><button type="button"><ShieldCheck size={18}/>Login with OTP</button><button type="button"><UserRound size={18}/>Use Token</button></div>
      </form>
      <div className="login-security"><ShieldCheck size={18}/><div><b>Secure · Reliable · Always On</b><span>Your safety and data security are our top priority.</span></div></div>
      </div>
    </section>
    <aside className="login-visual">
      <div className="login-live"><i/>Live Tracking</div>
      <div className="login-visual-content">
        <h2>Deliver more.<br/>Track better.<br/><em>Grow together.</em></h2>
        <p>Real-time route visibility, smart delivery tracking<br/>and distributor-focused operations.</p>
        <div className="login-features">
          <div><span><MapPin size={24}/></span><div><b>Live Route Tracking</b><small>Real-time location and<br/>route updates</small></div></div>
          <div><span><ClipboardList size={24}/></span><div><b>Delivery Management</b><small>Plan, assign and monitor<br/>deliveries</small></div></div>
          <div><span><TrendingUp size={24}/></span><div><b>Performance Insights</b><small>Track performance and<br/>achieve more</small></div></div>
        </div>
      </div>
      <div className="login-overview"><div className="overview-label"><span><CircleGauge size={15}/></span><b>Today's Overview</b></div><div className="overview-stats"><div><b>24</b><span>Deliveries<br/>Assigned</span></div><div><b>18</b><span>Deliveries<br/>Completed</span></div><div><b>6</b><span>In Progress</span></div><div><b>92%</b><span>On-time<br/>Performance</span></div><svg viewBox="0 0 170 64" preserveAspectRatio="none"><polyline points="0,56 16,23 31,39 48,10 63,13 79,28 94,15 109,20 126,5 142,11 170,0"/></svg></div></div>
    </aside>
  </main>
}

const customerCardTones = ["purple","green","orange","blue","pink","cyan"];

function CustomerMetric({icon:Icon, label, value, note, badge, tone}) {
  return <div className="customer-metric"><span className={`customer-metric-icon ${tone}`}><Icon size={18}/></span><div><span>{label}</span><div><strong>{value}</strong>{badge && <em>{badge}</em>}</div><small>{note}</small></div></div>;
}

function customerInitials(name="Customer") {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();
}

function customerDate(value) {
  if (!value) return ["—",""];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return [String(value),""];
  return [date.toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"}), date.toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"})];
}

function DirectoryPage({type, user, onUnauthorized}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [customerStatus, setCustomerStatus] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [areas, setAreas] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [inactiveTotal, setInactiveTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showCustomerSummary, setShowCustomerSummary] = useState(false);
  const [showCustomerFilters, setShowCustomerFilters] = useState(false);
  const tableRef = useRef(null);
  const label = type === "customers" ? "Customers" : "Salesmen";
  const customerMode = type === "customers";

  const load = async signal => {
    setLoading(true);
    setError("");
    try {
      const parameters = customerMode ? new URLSearchParams({ page:String(page), ...(query ? { search:query } : {}), ...(area ? { area } : {}), ...(customerStatus ? { status:customerStatus } : {}), ...(createdDate ? { createdDate } : {}) }) : null;
      const response = await fetch(`/api/${type}${parameters ? `?${parameters}` : ""}`, { credentials:"include", signal });
      if (response.status === 401) return onUnauthorized();
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload.error || `Unable to load ${label.toLowerCase()}.`);
      const nextRecords = Array.isArray(payload.records) ? payload.records : [];
      setRecords(nextRecords);
      setTotal(customerMode ? Number(payload.total ?? nextRecords.length) : nextRecords.length);
      setAllTotal(customerMode ? Number(payload.allTotal ?? payload.total ?? nextRecords.length) : nextRecords.length);
      setActiveTotal(Number(payload.activeTotal ?? 0));
      setInactiveTotal(Number(payload.inactiveTotal ?? 0));
      if (Array.isArray(payload.areas)) setAreas(payload.areas);
      setTotalPages(customerMode ? Math.max(1, Number(payload.totalPages) || 1) : 1);
      if (customerMode && payload.page && Number(payload.page) !== page) setPage(Number(payload.page));
      if (tableRef.current) tableRef.current.scrollTop = 0;
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message === "Failed to fetch" ? "Unable to reach the application server." : requestError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(()=>{
    const controller = new AbortController();
    load(controller.signal);
    return ()=>controller.abort();
  }, [type, page, query, area, customerStatus, createdDate]);

  useEffect(()=>{
    setPage(1); setSearch(""); setQuery(""); setArea(""); setCustomerStatus(""); setCreatedDate(""); setShowCustomerSummary(false); setShowCustomerFilters(false);
  }, [type]);

  useEffect(()=>{
    if (!customerMode) return;
    const timer = setTimeout(()=>{ setPage(1); setQuery(search.trim()); }, 300);
    return ()=>clearTimeout(timer);
  }, [search, customerMode]);

  const columns = useMemo(()=>{
    const keys = records.flatMap(record=>Object.keys(record));
    return [...new Set(keys)].filter(key=>key !== "_id" && !/pass|pwd|secret|token|distributor/i.test(key) && records.some(record=>["string","number","boolean"].includes(typeof record[key]))).slice(0,7);
  }, [records]);
  const filtered = useMemo(()=>customerMode ? records : records.filter(record=>JSON.stringify(record).toLowerCase().includes(search.toLowerCase())), [records, search, customerMode]);
  const pageItems = useMemo(()=>{
    const pages = [...new Set([1,page-1,page,page+1,totalPages])].filter(value=>value>=1 && value<=totalPages).sort((a,b)=>a-b);
    return pages.flatMap((value,index)=>index && value-pages[index-1]>1 ? [`gap-${value}`,value] : [value]);
  }, [page,totalPages]);
  const firstRecord = total ? (page-1)*100+1 : 0;
  const lastRecord = Math.min(page*100,total);
  const activePercent = allTotal ? `${(activeTotal/allTotal*100).toFixed(1)}%` : "0%";
  const inactivePercent = allTotal ? `${(inactiveTotal/allTotal*100).toFixed(1)}%` : "0%";
  const clearFilters = () => { setSearch(""); setQuery(""); setArea(""); setCustomerStatus(""); setCreatedDate(""); setPage(1); };

  if (!customerMode) return <section className="directory-card">
    <div className="directory-head"><div><h2>{label}</h2><p>Records belonging to the logged-in distributor only</p></div><div className="directory-tools"><div className="search-box"><Search size={15}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search salesmen..."/></div><button className="refresh-light" onClick={()=>load()} disabled={loading}><RefreshCw className={loading?"spin":""} size={15}/>Refresh</button></div></div>
    {loading ? <div className="directory-state"><RefreshCw className="spin" size={22}/><b>Loading salesmen…</b></div> : error ? <div className="directory-state error"><AlertTriangle size={22}/><b>{error}</b><button onClick={()=>load()}>Retry</button></div> : !filtered.length ? <div className="directory-state"><Users size={24}/><b>{records.length ? "No matching records." : "No salesmen found for this distributor."}</b></div> : <div className="directory-table"><table><thead><tr>{columns.map(column=><th key={column}>{column.replace(/_/g," ")}</th>)}</tr></thead><tbody>{filtered.map((record,index)=><tr key={record._id||index}>{columns.map(column=><td key={column}>{record[column] == null || record[column] === "" ? "—" : String(record[column])}</td>)}</tr>)}</tbody></table></div>}
    <div className="directory-footer">Showing {filtered.length} of {records.length} records</div>
  </section>;

  return <section className="customer-page">
    <div className="customer-page-actions"><div><b>{user?.name || "Distributor"}</b><span>{user?.distributorId}</span></div><button type="button" className={`customer-view-toggle ${showCustomerSummary?"active":""}`} onClick={()=>setShowCustomerSummary(value=>!value)} aria-expanded={showCustomerSummary}><Grid2X2 size={15}/>Summary</button><button type="button" className={`customer-view-toggle ${showCustomerFilters?"active":""}`} onClick={()=>setShowCustomerFilters(value=>!value)} aria-expanded={showCustomerFilters}><Filter size={15}/>Filters</button><button className="add-customer" disabled title="Customer creation is not available"><span>+</span>Add Customer</button><button disabled title="Export is not available"><FileBarChart size={15}/>Export</button><button onClick={()=>load()} disabled={loading} aria-label="Refresh customers"><RefreshCw className={loading?"spin":""} size={16}/></button></div>
    {showCustomerSummary && <div className="customer-metrics">
      <CustomerMetric icon={ShoppingBag} label="Total Customers" value={allTotal.toLocaleString()} badge="100%" note="All mapped customers" tone="purple"/>
      <CustomerMetric icon={Check} label="Active Customers" value={activeTotal.toLocaleString()} badge={activePercent} note="Currently active" tone="green"/>
      <CustomerMetric icon={X} label="Inactive Customers" value={inactiveTotal.toLocaleString()} badge={inactivePercent} note="Not active" tone="orange"/>
      <CustomerMetric icon={Layers} label="Records Per Page" value="100" note="Optimized view" tone="blue"/>
      <CustomerMetric icon={FileBarChart} label="Total Pages" value={totalPages.toLocaleString()} note="Pages available" tone="pink"/>
      <CustomerMetric icon={Users} label="Currently Showing" value={total ? `${firstRecord}–${lastRecord}` : "0"} note={`of ${total.toLocaleString()} customers`} tone="cyan"/>
    </div>}
    {showCustomerFilters && <div className="customer-filter-card">
      <div className="customer-search"><Search size={15}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search by name, customer ID, phone, area..."/>{search && <button onClick={()=>setSearch("")} aria-label="Clear search"><X size={14}/></button>}</div>
      <label><span>Area</span><select value={area} onChange={event=>{setArea(event.target.value);setPage(1)}}><option value="">All Areas</option>{areas.map(value=><option key={value}>{value}</option>)}</select></label>
      <label><span>Status</span><select value={customerStatus} onChange={event=>{setCustomerStatus(event.target.value);setPage(1)}}><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label className="customer-date"><span>Created Date</span><div><CalendarDays size={14}/><input type="date" value={createdDate} onChange={event=>{setCreatedDate(event.target.value);setPage(1)}}/></div></label>
      <button className="more-filters" disabled title="No additional filters available"><SlidersHorizontal size={14}/>More Filters</button>
      <button className="clear-filters" onClick={clearFilters}><RefreshCw size={14}/>Clear</button>
    </div>}
    <div className="customer-table-card">
      <div className="customer-table-scroll" ref={tableRef}>
        {loading ? <div className="customer-table-state"><RefreshCw className="spin" size={22}/><b>Loading customers…</b></div> : error ? <div className="customer-table-state error"><AlertTriangle size={22}/><b>{error}</b><button onClick={()=>load()}>Retry</button></div> : !records.length ? <div className="customer-table-state"><Users size={24}/><b>No customers match the selected filters.</b></div> : <table className="customer-data-table">
          <thead><tr><th>Customer Name</th><th>Customer ID</th><th>Phone</th><th>Area</th><th>Address</th><th>Status</th><th>Created At</th><th>Actions</th></tr></thead>
          <tbody>{records.map((record,index)=>{const [date,time]=customerDate(record.created_at);return <tr key={record._id||record.customer_id||index}><td><div className="customer-name-cell"><span className={`customer-avatar ${customerCardTones[index%customerCardTones.length]}`}>{customerInitials(record.name)}</span><b title={record.name}>{record.name||"—"}</b></div></td><td>{record.customer_id||"—"}</td><td>{record.phone ? <span className="customer-phone"><Phone size={13}/>{record.phone}</span> : "—"}</td><td>{record.area||"—"}</td><td><span className="customer-address" title={record.address}>{record.address||"—"}</span></td><td><span className={`customer-status ${String(record.status).toLowerCase()==="active"?"active":"inactive"}`}>{record.status||"Unknown"}</span></td><td><span className="customer-created"><b>{date}</b><small>{time}</small></span></td><td><div className="customer-row-actions"><button disabled title="Customer details are not available" aria-label={`View ${record.name}`}><Eye size={14}/></button><button disabled title="More actions are not available" aria-label={`More actions for ${record.name}`}><MoreVertical size={15}/></button></div></td></tr>})}</tbody>
        </table>}
      </div>
      <div className="customer-pagination"><span>{total ? `Showing ${firstRecord} to ${lastRecord} of ${total.toLocaleString()} customers` : "Showing 0 customers"}</span><div><button className="page-arrow" disabled={page===1||loading} onClick={()=>setPage(value=>Math.max(1,value-1))} aria-label="Previous page">‹</button>{pageItems.map(item=>typeof item==="string"?<span className="page-gap" key={item}>…</span>:<button key={item} className={page===item?"current":""} disabled={loading} onClick={()=>setPage(item)}>{item}</button>)}<button className="page-arrow" disabled={page===totalPages||loading} onClick={()=>setPage(value=>Math.min(totalPages,value+1))} aria-label="Next page">›</button></div></div>
    </div>
  </section>;
}

function loadDate(value) {
  if (!value) return {date:"—",time:"Not recorded"};
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return {date:String(value),time:""};
  return {
    date:parsed.toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"}),
    time:parsed.toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"})
  };
}

function loadProgress(load) {
  return load.totalBills ? Math.round(load.deliveredBills/load.totalBills*100) : 0;
}

function LoadDirectory({user, onUnauthorized, onTrack}) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({totalLoads:0,totalBills:0,deliveredBills:0,pendingBills:0,mappedBills:0});
  const [seriesOptions, setSeriesOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [series, setSeries] = useState("");
  const [progress, setProgress] = useState("");
  const [location, setLocation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const tableRef = useRef(null);

  useEffect(()=>{
    const timer = setTimeout(()=>{setPage(1);setQuery(search.trim())}, 300);
    return ()=>clearTimeout(timer);
  }, [search]);

  useEffect(()=>{
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const parameters = new URLSearchParams({page:String(page),pageSize:String(pageSize),sort,...(query?{search:query}:{}),...(series?{series}:{}),...(progress?{progress}:{}),...(location?{location}:{}),...(from?{from}:{}),...(to?{to}:{})});
        const response = await fetch(`/api/deliveries?${parameters}`, {credentials:"include",signal:controller.signal});
        if (response.status === 401) return onUnauthorized();
        const payload = await response.json().catch(()=>({}));
        if (!response.ok) throw new Error(payload.error || "Unable to load deliveries.");
        setRecords(Array.isArray(payload.records)?payload.records:[]);
        setSummary(payload.summary || {totalLoads:0,totalBills:0,deliveredBills:0,pendingBills:0,mappedBills:0});
        setSeriesOptions(Array.isArray(payload.series)?payload.series:[]);
        setTotal(Number(payload.total)||0);
        setTotalPages(Math.max(1,Number(payload.totalPages)||1));
        if (payload.page && Number(payload.page)!==page) setPage(Number(payload.page));
        if (tableRef.current) tableRef.current.scrollTop=0;
      } catch (requestError) {
        if (requestError.name!=="AbortError") setError(requestError.message==="Failed to fetch"?"Unable to reach the application server.":requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return ()=>controller.abort();
  }, [page,pageSize,query,series,progress,location,from,to,sort,refreshKey]);

  const clearFilters = () => {setSearch("");setQuery("");setSeries("");setProgress("");setLocation("");setFrom("");setTo("");setSort("newest");setPage(1)};
  const mappedPercent = summary.totalBills ? Math.round(summary.mappedBills/summary.totalBills*100) : 0;
  const deliveredPercent = summary.totalBills ? Math.round(summary.deliveredBills/summary.totalBills*100) : 0;
  const firstRecord = total?(page-1)*pageSize+1:0;
  const lastRecord = Math.min(page*pageSize,total);
  const pageItems = useMemo(()=>{
    const pages=[...new Set([1,page-1,page,page+1,totalPages])].filter(value=>value>=1&&value<=totalPages).sort((a,b)=>a-b);
    return pages.flatMap((value,index)=>index&&value-pages[index-1]>1?[`gap-${value}`,value]:[value]);
  },[page,totalPages]);
  const activeFilterCount = [query,series,progress,location,from,to].filter(Boolean).length;
  const selectedBillRoute = useMemo(()=>{
    const mappedBills = orderDeliveryStops((selectedLoad?.bills||[]).filter(bill=>bill.hasLocation));
    return new Map(mappedBills.map((bill,index)=>[bill.sequence,{stop:index+1,distance:index?stopDistance(mappedBills[index-1],bill):0}]));
  },[selectedLoad]);
  const selectedDisplayBills = useMemo(()=>{
    const bills = selectedLoad?.bills||[];
    return [...orderDeliveryStops(bills.filter(bill=>bill.hasLocation)),...bills.filter(bill=>!bill.hasLocation)];
  },[selectedLoad]);

  return <section className="loads-page">
    <div className="loads-hero">
      <div><span className="loads-hero-icon"><Package size={22}/></span><div><span className="eyebrow">MAS_DELIVERY</span><h2>Load Operations</h2><p>Every load assigned to <b>{user?.name||"your distributor"}</b>, with bill progress and mapping health.</p></div></div>
      <div className="loads-hero-actions"><button className={`loads-filter-toggle ${filtersOpen?"active":""}`} onClick={()=>setFiltersOpen(value=>!value)} aria-expanded={filtersOpen}><Filter size={16}/>Filters{activeFilterCount>0&&<em>{activeFilterCount}</em>}<ChevronDown size={14}/></button><button className="loads-refresh" onClick={()=>setRefreshKey(value=>value+1)} disabled={loading}><RefreshCw className={loading?"spin":""} size={16}/>Refresh data</button></div>
    </div>
    <div className="loads-metrics">
      <div><span className="purple"><Package size={18}/></span><small>Total loads</small><strong>{summary.totalLoads.toLocaleString()}</strong><em>Distributor scoped</em></div>
      <div><span className="blue"><FileBarChart size={18}/></span><small>Total bills</small><strong>{summary.totalBills.toLocaleString()}</strong><em>Across all loads</em></div>
      <div><span className="green"><Check size={18}/></span><small>Delivered bills</small><strong>{summary.deliveredBills.toLocaleString()}</strong><em>{deliveredPercent}% completion</em></div>
      <div><span className="orange"><Clock3 size={18}/></span><small>Pending bills</small><strong>{summary.pendingBills.toLocaleString()}</strong><em>Attention required</em></div>
      <div><span className="cyan"><MapPin size={18}/></span><small>Locations mapped</small><strong>{mappedPercent}%</strong><em>{summary.mappedBills.toLocaleString()} valid points</em></div>
    </div>
    {filtersOpen&&<div className="loads-filter-card">
      <div className="loads-search"><Search size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search load no, bill, customer or code…"/>{search&&<button onClick={()=>setSearch("")} aria-label="Clear search"><X size={14}/></button>}</div>
      <label><span>Series</span><select value={series} onChange={event=>{setSeries(event.target.value);setPage(1)}}><option value="">All series</option>{seriesOptions.map(value=><option key={value||"blank"} value={value||"__blank__"}>{value||"Blank series"}</option>)}</select></label>
      <label><span>Delivery progress</span><select value={progress} onChange={event=>{setProgress(event.target.value);setPage(1)}}><option value="">Any progress</option><option value="complete">Completed</option><option value="in-progress">In progress</option><option value="not-started">Not started</option></select></label>
      <label><span>Location coverage</span><select value={location} onChange={event=>{setLocation(event.target.value);setPage(1)}}><option value="">Any coverage</option><option value="mapped">Fully mapped</option><option value="partial">Partially mapped</option><option value="none">No locations</option></select></label>
      <label><span>From date</span><input type="date" value={from} onChange={event=>{setFrom(event.target.value);setPage(1)}}/></label>
      <label><span>To date</span><input type="date" value={to} min={from||undefined} onChange={event=>{setTo(event.target.value);setPage(1)}}/></label>
      <label><span>Sort by</span><select value={sort} onChange={event=>{setSort(event.target.value);setPage(1)}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="load-desc">Load no: high to low</option><option value="load-asc">Load no: low to high</option></select></label>
      <button className="loads-clear" onClick={clearFilters}><RefreshCw size={14}/>Clear filters</button>
    </div>}
    <div className="loads-table-card">
      <div className="loads-table-head"><div><h3>All Loads</h3><span>{total.toLocaleString()} matching records</span></div><label>Rows <select value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}><option>20</option><option>50</option><option>100</option></select></label></div>
      <div className="loads-table-scroll" ref={tableRef}>
        {loading?<div className="loads-state"><RefreshCw className="spin" size={24}/><b>Loading your loads…</b><span>Reading distributor records from Mas_Delivery</span></div>:error?<div className="loads-state error"><AlertTriangle size={24}/><b>{error}</b><button onClick={()=>setRefreshKey(value=>value+1)}>Retry</button></div>:!records.length?<div className="loads-state"><Package size={27}/><b>No loads match these filters.</b><button onClick={clearFilters}>Clear all filters</button></div>:<table className="loads-data-table"><thead><tr><th>Load</th><th>Uploaded</th><th>Bill progress</th><th>Location health</th><th>Load value</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.map(load=>{const progressValue=loadProgress(load);const dateValue=loadDate(load.uploadedAt);const mappingValue=load.totalBills?Math.round(load.mappedBills/load.totalBills*100):0;const status=progressValue===100?"Completed":progressValue>0?"In progress":"Not started";return <tr key={load.id}><td><div className="load-id-cell"><span><Package size={15}/></span><div><b>{load.loadSeries||"(blank)"} {load.loadNo}</b><small>{load.totalBills} bills attached</small></div></div></td><td><div className="load-date"><b>{dateValue.date}</b><small>{dateValue.time}</small></div></td><td><div className="load-progress"><div><b>{load.deliveredBills}/{load.totalBills}</b><span>{progressValue}%</span></div><i><em style={{width:`${progressValue}%`}}/></i><small>{load.pendingBills} pending</small></div></td><td><div className="load-location"><span className={mappingValue===100?"good":mappingValue?"partial":"empty"}><MapPin size={13}/>{load.mappedBills}/{load.totalBills}</span><small>{mappingValue}% coverage</small></div></td><td><b className="load-amount">₹{Number(load.totalAmount||0).toLocaleString("en-IN",{maximumFractionDigits:2})}</b></td><td><span className={`load-status ${status.toLowerCase().replace(/\s/g,"-")}`}><i/>{status}</span></td><td><div className="load-actions"><button onClick={()=>setSelectedLoad(load)} title="View all bills" aria-label={`View load ${load.loadNo}`}><Eye size={15}/></button><button className="track" disabled={!load.mappedBills} onClick={()=>onTrack(load)} title={load.mappedBills?"Track on map":"No mapped locations"} aria-label={`Track load ${load.loadNo}`}><Navigation size={15}/></button></div></td></tr>})}</tbody></table>}
      </div>
      <div className="loads-pagination"><span>{total?`Showing ${firstRecord} to ${lastRecord} of ${total.toLocaleString()} loads`:"Showing 0 loads"}</span><div><button disabled={page===1||loading} onClick={()=>setPage(value=>Math.max(1,value-1))}>‹</button>{pageItems.map(item=>typeof item==="string"?<span key={item}>…</span>:<button key={item} className={page===item?"current":""} onClick={()=>setPage(item)} disabled={loading}>{item}</button>)}<button disabled={page===totalPages||loading} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}>›</button></div></div>
    </div>
    {selectedLoad&&<div className="load-detail-layer"><button className="load-detail-scrim" onClick={()=>setSelectedLoad(null)} aria-label="Close details"/><aside className="load-detail-drawer"><div className="load-detail-head"><div><span className="eyebrow">LOAD DETAILS</span><h2>{selectedLoad.loadSeries||"(blank)"} {selectedLoad.loadNo}</h2><p>{selectedLoad.totalBills} bills · ₹{Number(selectedLoad.totalAmount||0).toLocaleString("en-IN")}</p></div><button onClick={()=>setSelectedLoad(null)} aria-label="Close details"><X size={18}/></button></div><div className="load-detail-summary"><div><span>Delivered</span><b>{selectedLoad.deliveredBills}</b></div><div><span>Pending</span><b>{selectedLoad.pendingBills}</b></div><div><span>Mapped</span><b>{selectedLoad.mappedBills}</b></div></div><div className="load-bills-head"><h3>Optimized delivery sequence</h3><span>{selectedLoad.bills.length} records</span></div><div className="load-bills">{selectedDisplayBills.map(bill=>{const routeInfo=selectedBillRoute.get(bill.sequence);return <div key={`${bill.sequence}-${bill.trnSeries}-${bill.trnNo}`}><span className="bill-sequence">{routeInfo?.stop||bill.sequence}</span><div><b>{bill.customerName}</b><small>{bill.customerCode||"No customer code"} · {bill.trnSeries} {bill.trnNo}</small><div className="bill-route-meta"><em className={bill.hasLocation?"mapped":"unmapped"}><MapPin size={10}/>{bill.hasLocation?"Mapped":"No location"}</em>{routeInfo&&<span><Route size={10}/>{routeInfo.stop===1?"Route start · 0.0 km":`${routeInfo.distance.toFixed(1)} km from previous stop`}</span>}</div></div><div><b>₹{Number(bill.billAmount||0).toLocaleString("en-IN")}</b><small>{bill.status||"pending"}</small></div></div>})}</div><button className="load-detail-track" disabled={!selectedLoad.mappedBills} onClick={()=>onTrack(selectedLoad)}><Navigation size={15}/>Track on map</button></aside></div>}
  </section>;
}

function DashboardApp({user, onLogout, onUnauthorized}) {
  const mapRef = useRef(null);
  const [active, setActive] = useState("Dashboard");
  const [showRoutes, setShowRoutes] = useState(true);
  const [traffic, setTraffic] = useState(true);
  const [layers, setLayers] = useState({salesmen:true, stops:true, geofences:false});
  const [layersOpen, setLayersOpen] = useState(true);
  const [selected, setSelected] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("All Routes");
  const [salesmanFilter, setSalesmanFilter] = useState("All Salesmen");
  const [statusFilter, setStatusFilter] = useState("All");
  const [date, setDate] = useState("2025-05-24");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loadSeries, setLoadSeries] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [trackedLoad, setTrackedLoad] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [routePanelOpen, setRoutePanelOpen] = useState(true);
  const pageSize = 5;

  const routeOptions = useMemo(() => [...new Set(loads.map(row=>row[2]))], []);
  const filteredLoads = useMemo(() => loads.filter(r =>
    r.join(" ").toLowerCase().includes(search.toLowerCase()) &&
    (routeFilter === "All Routes" || r[2] === routeFilter) &&
    (statusFilter === "All" || r[7] === statusFilter)
  ), [search, routeFilter, statusFilter]);
  const visibleSalesmen = useMemo(() => salesmanSeed.filter(person =>
    (routeFilter === "All Routes" || person.route === routeFilter) &&
    (salesmanFilter === "All Salesmen" || person.name === salesmanFilter) &&
    (statusFilter === "All" || person.status === statusFilter)
  ), [routeFilter, salesmanFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredLoads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedLoads = filteredLoads.slice((currentPage-1)*pageSize, currentPage*pageSize);
  const orderedTrackedStops = useMemo(()=>orderDeliveryStops(trackedLoad?.stops || []), [trackedLoad]);
  const trackedRouteDistance = useMemo(()=>orderedTrackedStops.reduce((total,stop,index)=>index?total+stopDistance(orderedTrackedStops[index-1],stop):total,0),[orderedTrackedStops]);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(()=>setRefreshing(false), 700);
  };

  const toggleLayer = key => setLayers(current=>({...current,[key]:!current[key]}));
  const enterFullscreen = () => document.querySelector(".map-wrap")?.requestFullscreen?.();
  const moveMap = direction => {
    const map = mapRef.current;
    if (!map) return;
    if (direction === "in") map.setZoom((map.getZoom() || 12) + 1);
    if (direction === "out") map.setZoom((map.getZoom() || 12) - 1);
    if (direction === "center") { map.panTo(center); map.setZoom(12); }
  };
  const selectSalesman = person => {
    setSelected(person);
    if (person?.pos && mapRef.current) mapRef.current.panTo(person.pos);
  };
  const focusDeliveryStop = stop => {
    if (!mapRef.current || !stop) return;
    mapRef.current.panTo({lat:stop.lat,lng:stop.lng});
    mapRef.current.setZoom(16);
  };
  const fitTrackedLoad = (map=mapRef.current, load=trackedLoad) => {
    const stops = load?.stops || [];
    if (!map || !stops.length || !window.google?.maps) return;
    if (stops.length === 1) {
      map.panTo({lat:stops[0].lat,lng:stops[0].lng});
      map.setZoom(16);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    stops.forEach(stop=>bounds.extend({lat:stop.lat,lng:stop.lng}));
    map.fitBounds(bounds, 70);
  };
  useEffect(()=>{ fitTrackedLoad(); }, [trackedLoad]);

  const fetchTrackedDelivery = async (requestedSeries, requestedNumber) => {
    const requestedLoadNo = String(requestedNumber).trim();
    if (!/^\d+$/.test(requestedLoadNo)) return setTrackingError("Enter a valid load number.");
    setTrackingLoading(true);
    setTrackingError("");
    try {
      const parameters = new URLSearchParams({loadSeries:String(requestedSeries||"").trim(),loadNo:requestedLoadNo});
      const response = await fetch(`/api/deliveries/track?${parameters}`, {credentials:"include"});
      if (response.status === 401) return onUnauthorized();
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload.error || "Unable to load tracking details.");
      setTrackedLoad(payload.load);
      setSelected(null);
      setTimeout(()=>fitTrackedLoad(mapRef.current,payload.load),0);
    } catch (requestError) {
      setTrackedLoad(null);
      setTrackingError(requestError.message === "Failed to fetch" ? "Unable to reach the application server." : requestError.message);
    } finally {
      setTrackingLoading(false);
    }
  };
  const trackDelivery = event => {
    event.preventDefault();
    setRoutePanelOpen(true);
    fetchTrackedDelivery(loadSeries,loadNumber);
  };
  const openDatabaseLoad = load => {
    setLoadSeries(load.loadSeries||"");
    setLoadNumber(String(load.loadNo));
    setTrackedLoad(null);
    setRoutePanelOpen(false);
    setLayersOpen(false);
    setShowRoutes(true);
    setActive("Live Tracking");
    setSidebarOpen(false);
    window.scrollTo({top:0,behavior:"smooth"});
    fetchTrackedDelivery(load.loadSeries,load.loadNo);
  };
  const trackLoad = loadId => {
    const person = salesmanSeed.find(item=>item.load===loadId);
    setDrawer(null);
    if (person) selectSalesman(person);
    setActive("Live Tracking");
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const navTargets = {Dashboard:".topbar","Live Tracking":".tracking-card",Routes:".tracking-card","Delivery Reports":".performance-card",Performance:".performance-card"};
  const availableModules = new Set([...Object.keys(navTargets), "Loads", "Salesmen", "Customers"]);
  const navigate = label => {
    setActive(label);
    setSidebarOpen(false);
    if (label === "Salesmen" || label === "Customers" || label === "Loads") {
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }
    if (label === "Live Tracking" || label === "Dashboard") {
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }
    const target = navTargets[label];
    if (target) document.querySelector(target)?.scrollIntoView({behavior:"smooth",block:"start"});
  };
  const directoryActive = active === "Salesmen" || active === "Customers";
  const loadsActive = active === "Loads";
  const trackingActive = active === "Live Tracking";
  const dashboardActive = !directoryActive && !loadsActive && !trackingActive;
  const pageTitle = directoryActive ? active : loadsActive ? "Loads" : trackingActive ? "Live Load Tracking" : "Delivery Tracking Dashboard";
  const pageDescription = directoryActive ? `TotalApp ${active.toLowerCase()} for your distributor account` : loadsActive ? "Complete Mas_Delivery workspace for your distributor account" : trackingActive ? "Find a load by series and number, then view its saved delivery locations" : "Real-time overview of all loads and delivery performance";

  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={()=>setSidebarOpen(false)}/>} 
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-icon"><Truck size={20}/></div>
        <div><b>Salesman Portal</b><span>Admin Panel</span></div>
        <button className="sidebar-close" onClick={()=>setSidebarOpen(false)} aria-label="Close navigation"><X size={17}/></button>
      </div>

      <nav className="nav-list">
        {nav.map(([label,Icon]) => { const available=availableModules.has(label); return <button key={label} onClick={()=>navigate(label)} disabled={!available} title={available?`Open ${label}`:`${label} module is not included in this project`} className={`nav-item ${active===label ? "active":""} ${!available?"unavailable":""}`}>
          <Icon size={17}/><span>{label}</span>{label==="Alerts" && <em>5</em>}
        </button>})}
      </nav>

      <div className="sidebar-bottom">
        <button className="admin-card" onClick={onLogout} title="Log out"><Avatar name={user?.name}/><div><b>{user?.name || "Distributor"}</b><span>Distributor Account</span></div><LogOut size={15}/></button>
        <div className="summary-card">
          <h4>TODAY'S SUMMARY</h4>
          <div><span><Box size={15}/>Total Outlets</span><b>1,248</b></div>
          <div><span><Check size={15}/>Delivered</span><b className="green">874</b></div>
          <div><span><Package size={15}/>Pending</span><b className="orange">374</b></div>
          <div><span><Gauge size={15}/>Success Rate</span><b className="green">70.0%</b></div>
        </div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="title-wrap">
          <button className="mobile-menu" onClick={()=>setSidebarOpen(true)} aria-label="Open navigation"><Menu size={18}/></button>
          <div className="title-line"><h1>{pageTitle}</h1>{(dashboardActive||trackingActive) && <span className="live-pill"><i/> Live</span>}</div>
          <p>{pageDescription}</p>
        </div>
        {dashboardActive && <div className="top-actions">
          <label className="date-control"><CalendarDays size={15}/><input type="date" value={date} onChange={event=>setDate(event.target.value)} aria-label="Dashboard date"/></label>
          <label className="native-select"><select value={routeFilter} onChange={event=>{setRouteFilter(event.target.value);setPage(1)}} aria-label="Filter by route"><option>All Routes</option>{routeOptions.map(route=><option key={route}>{route}</option>)}</select><ChevronDown size={14}/></label>
          <button className={`refresh-btn ${refreshing?"loading":""}`} onClick={refresh}><RefreshCw size={15}/>Refresh</button>
          <button disabled title="Notifications are not implemented in this project" className="icon-btn notification"><Bell size={18}/><em>3</em></button>
          <button disabled title="App launcher is not implemented in this project" className="icon-btn" aria-label="Open apps"><Grid2X2 size={17}/></button>
        </div>}
      </header>

      {directoryActive ? <DirectoryPage type={active === "Customers" ? "customers" : "salesmen"} user={user} onUnauthorized={onUnauthorized}/> : loadsActive ? <LoadDirectory user={user} onUnauthorized={onUnauthorized} onTrack={openDatabaseLoad}/> : <>
      {dashboardActive && <section className="kpi-grid">
        <KPI icon={Box} label="Total Loads" value="48" change="100%" desc="All loads for delivery" tone="purple"/>
        <KPI icon={Truck} label="In Progress" value="32" change="66.7%" desc="Currently in delivery" tone="blue"/>
        <KPI icon={Check} label="Delivered" value="28" change="58.3%" desc="Successfully delivered" tone="green"/>
        <KPI icon={Package} label="Pending" value="16" change="33.3%" desc="Yet to be started" tone="orange" down/>
        <KPI icon={Route} label="Total Distance" value="1,248 km" desc="All routes today" tone="purple"/>
        <KPI icon={Clock3} label="Total Time" value="26h 45m" desc="Total delivery time" tone="blue"/>
        <KPI icon={CircleGauge} label="Avg. Delivery Time" value="32m" desc="Per outlet" tone="pink"/>
      </section>}

      {(dashboardActive || trackingActive) && <section className={`tracking-card ${trackingActive ? "live-tracking-page" : "dashboard-tracking"}`}>
        {dashboardActive && <div className="section-head tracking-head">
          <div><div className="section-title"><h2>Live Tracking</h2><span className="on-route"><i/> {visibleSalesmen.filter(person=>person.status === "In Progress").length} On Route</span></div><p>Real-time location of all salesmen on the field</p></div>
          <div className="map-actions">
            <label className="native-select"><select value={salesmanFilter} onChange={event=>setSalesmanFilter(event.target.value)} aria-label="Filter by salesman"><option>All Salesmen</option>{salesmanSeed.map(person=><option key={person.id}>{person.name}</option>)}</select><ChevronDown size={14}/></label>
            <button className={`check-btn ${showRoutes?"checked":""}`} onClick={()=>setShowRoutes(!showRoutes)}><span>{showRoutes && <Check size={12}/>}</span>Show Routes</button>
            <label className="switch-label">Traffic <button className={`switch ${traffic?"on":""}`} onClick={()=>setTraffic(!traffic)}><i/></button></label>
            <button className="icon-btn" onClick={enterFullscreen} aria-label="Open map fullscreen"><Maximize size={17}/></button>
          </div>
        </div>}
        {trackingActive && <form className="load-tracker" onSubmit={trackDelivery}>
          <div className="load-tracker-title"><span><LocateFixed size={18}/></span><div><b>Track a Load</b><small>Enter the load details from Mas_Delivery</small></div></div>
          <label><span>Load Series</span><input value={loadSeries} onChange={event=>setLoadSeries(event.target.value)} placeholder="(Blank)" maxLength="40"/></label>
          <label><span>Load No.</span><input value={loadNumber} onChange={event=>setLoadNumber(event.target.value.replace(/\D/g,""))} placeholder="Enter load number" inputMode="numeric" required/></label>
          <button className="track-load-btn" disabled={trackingLoading}>{trackingLoading ? <><RefreshCw className="spin" size={15}/>Loading…</> : <><Navigation size={15}/>Track</>}</button>
        </form>}
        {trackingActive && trackingError && <div className="tracking-feedback error" role="alert"><AlertTriangle size={15}/>{trackingError}</div>}
        {trackingActive && trackedLoad && <div className={`tracking-feedback ${trackedLoad.mappedBills ? "success" : "warning"}`}>
          <MapPin size={15}/><b>Load Series: {trackedLoad.loadSeries || "(blank)"}</b><b>Load No: {trackedLoad.loadNo}</b><span>{trackedLoad.mappedBills ? `${trackedLoad.mappedBills} of ${trackedLoad.totalBills} delivery locations mapped` : `Load found with ${trackedLoad.totalBills} bills, but no valid latitude/longitude values are saved.`}</span>
        </div>}

        <div className={`map-wrap ${trackingActive&&!routePanelOpen?"route-panel-closed":""}`}>
          <MapPanel salesmen={visibleSalesmen} setSelected={selectSalesman} showRoutes={showRoutes} traffic={traffic} layerState={layers} trackedLoad={trackingActive ? trackedLoad : null} onMapLoad={map=>{mapRef.current=map;if (trackingActive) fitTrackedLoad(map)}} onMapUnmount={()=>{mapRef.current=null}}/>
          {trackingActive&&!routePanelOpen&&<button className="route-panel-toggle" onClick={()=>setRoutePanelOpen(true)}><List size={15}/>Show delivery route{trackedLoad&&<span>{trackedLoad.mappedBills}</span>}</button>}
          {trackingActive&&routePanelOpen && <aside className="delivery-route-panel">
            <div className="delivery-route-head"><div><b>Delivery Route</b><span>{trackedLoad ? `${trackedLoad.mappedBills} stops · ${trackedRouteDistance.toFixed(1)} km total` : "Waiting for load"}</span></div><button onClick={()=>setRoutePanelOpen(false)} aria-label="Hide delivery route"><X size={15}/></button></div>
            <div className="delivery-route-list">
              <button type="button" className="delivery-route-start" disabled={!orderedTrackedStops.length} onClick={()=>focusDeliveryStop(orderedTrackedStops[0])}><i><Navigation size={15}/></i><div><b>{orderedTrackedStops[0]?.customerName || "Start"}</b><span>{orderedTrackedStops.length ? "Route start · 0.0 km" : "Track a load to view its route"}</span></div></button>
              {orderedTrackedStops.slice(1).map((stop,index)=><button type="button" key={stop.sequence} onClick={()=>focusDeliveryStop(stop)}><i>{index+1}</i><div><b>{stop.customerName}</b><span>{stopDistance(orderedTrackedStops[index],stop).toFixed(1)} km from previous · {stop.trnSeries}{stop.trnSeries && stop.trnNo ? " " : ""}{stop.trnNo || "Delivery stop"}</span></div></button>)}
              {trackedLoad && !trackedLoad.stops.length && <div className="delivery-route-empty"><MapPin size={20}/><span>No saved coordinates are available for this load.</span></div>}
            </div>
            <button className="delivery-route-foot" disabled={!orderedTrackedStops.length} onClick={()=>fitTrackedLoad()}><Maximize size={15}/>Fit full route on map</button>
          </aside>}
          <div className="map-left-controls">
            <button onClick={()=>moveMap("in")} aria-label="Zoom in"><span>+</span></button><button onClick={()=>moveMap("out")} aria-label="Zoom out"><span>−</span></button><button className={layersOpen?"active":""} onClick={()=>setLayersOpen(value=>!value)} aria-label="Map layers"><Layers size={17}/></button><button onClick={()=>moveMap("center")} aria-label="Center map"><LocateFixed size={17}/></button><button onClick={enterFullscreen} aria-label="Open map fullscreen"><Maximize size={16}/></button>
          </div>
          {layersOpen && <div className="map-layers">
            <h4>Map Layers</h4>
            {[["Salesmen",layers.salesmen,()=>toggleLayer("salesmen")],["Routes",showRoutes,()=>setShowRoutes(value=>!value)],["Stops",layers.stops,()=>toggleLayer("stops")],["Traffic",traffic,()=>setTraffic(value=>!value)],["Geofences",layers.geofences,()=>toggleLayer("geofences")]].map(([x,on,handler])=><div key={x}><span>{x}</span><button aria-label={`Toggle ${x}`} onClick={handler} className={`switch mini ${on?"on":""}`}><i/></button></div>)}
            <hr/>
            <h4>Status Filter</h4>
            {[["In Progress","blue"],["Delivered","green"],["Pending","orange"],["Offline","red"]].map(([status,color])=><button key={status} className={`legend-row ${statusFilter===status ? "active" : ""}`} onClick={()=>{setStatusFilter(current=>current===status?"All":status);setPage(1)}}><i className={`dot ${color}`}/>{status}<b>{loads.filter(row=>row[7]===status).length}</b></button>)}
          </div>}

          {selected && <div className="salesman-popup">
            <div className="popup-head"><Avatar name={selected.name}/><div><b>{selected.name}</b><span>{selected.route}</span></div><button onClick={()=>setSelected(null)}><X size={15}/></button></div>
            <div className="popup-status"><span>● {selected.status}</span><b>{selected.load}</b></div>
            <div className="popup-grid">
              <div><small>Delivered</small><b>{selected.done}/{selected.total}</b></div>
              <div><small>Progress</small><b>{Math.round(selected.done/selected.total*100)}%</b></div>
              <div><small>Speed</small><b>{selected.speed} km/h</b></div>
              <div><small>Battery</small><b>{selected.battery}%</b></div>
              <div><small>Distance</small><b>22.7 km</b></div>
              <div><small>ETA</small><b>12:45 PM</b></div>
            </div>
            <div className="popup-update"><Zap size={14}/> Last location update: 10 seconds ago</div>
            <button className="primary-btn small-btn" onClick={()=>selectSalesman(selected)}><Navigation size={15}/> Center on Salesman</button>
          </div>}
        </div>
      </section>}

      {dashboardActive && <section className="bottom-grid">
        <div className="table-card">
          <div className="section-head">
            <div><h2>Load Delivery Overview</h2></div>
            <div className="table-tools"><div className="search-box"><Search size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search load, salesman, route..."/></div><button className={`filter-btn ${filterOpen?"active":""}`} onClick={()=>setFilterOpen(!filterOpen)}><Filter size={15}/>Filter</button></div>
          </div>
          {filterOpen && <div className="filter-pop"><b>Advanced Filters</b><label>Status<select value={statusFilter} onChange={event=>{setStatusFilter(event.target.value);setPage(1)}}><option>All</option><option>In Progress</option><option>Delivered</option><option>Pending</option></select></label><label>Route<select value={routeFilter} onChange={event=>{setRouteFilter(event.target.value);setPage(1)}}><option>All Routes</option>{routeOptions.map(route=><option key={route}>{route}</option>)}</select></label><button onClick={()=>{setStatusFilter("All");setRouteFilter("All Routes");setSearch("");setPage(1)}}>Reset</button></div>}
          <div className="table-scroll"><table><thead><tr><th>Load ID</th><th>Salesman</th><th>Route</th><th>Outlets</th><th>Delivered</th><th>Pending</th><th>Progress</th><th>Status</th><th>Last Update</th><th>Actions</th></tr></thead>
          <tbody>{pagedLoads.length ? pagedLoads.map((r)=><tr key={r[0]}><td><b>{r[0]}</b></td><td><div className="person-cell"><Avatar name={r[1]} small/><span>{r[1]}</span></div></td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td><div className="progress-cell"><span>{r[6]}%</span><div><i style={{width:`${r[6]}%`}}/></div></div></td><td><StatusPill status={r[7]}/></td><td>{r[8]}</td><td><div className="row-actions"><button aria-label={`View ${r[0]}`} onClick={()=>setDrawer(r)}><Eye size={14}/></button><button aria-label={`Locate ${r[0]}`} onClick={()=>trackLoad(r[0])}><MapIcon size={14}/></button><button disabled title="No additional load actions are implemented" aria-label={`More actions for ${r[0]}`}><MoreVertical size={14}/></button></div></td></tr>) : <tr><td className="empty-table" colSpan="10">No loads found for the selected filters.</td></tr>}</tbody></table></div>
          <div className="pagination"><span>{filteredLoads.length ? `Showing ${(currentPage-1)*pageSize+1} to ${Math.min(currentPage*pageSize,filteredLoads.length)} of ${filteredLoads.length} loads` : "Showing 0 loads"}</span><div><button disabled={currentPage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>‹</button>{Array.from({length:totalPages},(_,index)=>index+1).map(pageNumber=><button key={pageNumber} className={currentPage===pageNumber?"current":""} onClick={()=>setPage(pageNumber)}>{pageNumber}</button>)}<button disabled={currentPage===totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}>›</button></div></div>
        </div>

        <div className="completed-card">
          <div className="section-head"><h2>Recently Completed</h2><span className="text-btn">All {completed.length}</span></div>
          <div>{completed.map(x=><div className="completed-row" key={x[0]}><div className="complete-icon"><Check size={13}/></div><div><b>{x[0]}</b><span>{x[1]}</span></div><div className="complete-time"><b>{x[3]}</b><span>{x[2]}</span></div></div>)}</div>
        </div>

        <div className="performance-card">
          <div className="section-head"><h2>Performance Overview</h2><span className="select-btn compact">Last 7 Days</span></div>
          <div className="chart-top">
            <div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" innerRadius={43} outerRadius={58} paddingAngle={1} startAngle={90} endAngle={-270}>{pie.map(x=><Cell key={x.name} fill={x.color}/>)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><b>70%</b><span>Success Rate</span></div></div>
            <div className="chart-legend">{pie.map(x=><div key={x.name}><i style={{background:x.color}}/><span>{x.name}</span><b>{x.value} <small>({x.name==="Delivered"?"58.3":x.name==="In Progress"?"66.7":x.name==="Pending"?"33.3":"4.2"}%)</small></b></div>)}</div>
          </div>
          <h3 className="subchart-title">Deliveries Over Time</h3>
          <div className="line-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={performance}><XAxis dataKey="day" tick={{fontSize:9}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip contentStyle={{borderRadius:10,border:"1px solid #e8eaf1",fontSize:11}}/><Line type="monotone" dataKey="delivered" stroke="#20a862" strokeWidth={2} dot={{r:2}}/><Line type="monotone" dataKey="progress" stroke="#2777e8" strokeWidth={2} dot={{r:2}}/></LineChart></ResponsiveContainer></div>
          <div className="line-legend"><span><i className="green"/>Delivered</span><span><i className="blue"/>In Progress</span></div>
        </div>
      </section>}
      </>}
    </main>
    <LoadDrawer row={drawer} onClose={()=>setDrawer(null)} onTrack={trackLoad}/>
  </div>
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(()=>{
    const controller = new AbortController();
    fetch("/api/auth/me", { credentials:"include", signal:controller.signal })
      .then(async response => response.ok ? (await response.json()).user : null)
      .then(sessionUser=>setUser(sessionUser))
      .catch(error=>{ if (error.name !== "AbortError") setUser(null); })
      .finally(()=>{ if (!controller.signal.aborted) setCheckingSession(false); });
    return ()=>controller.abort();
  }, []);

  const logout = async () => {
    try { await fetch("/api/auth/logout", { method:"POST", credentials:"include" }); }
    finally { setUser(null); }
  };

  if (checkingSession) return <div className="auth-loading"><div className="brand-icon"><Truck size={22}/></div><RefreshCw className="spin" size={19}/><span>Checking your session…</span></div>;
  if (!user) return <LoginPage onLogin={setUser}/>;
  return <DashboardApp user={user} onLogout={logout} onUnauthorized={()=>setUser(null)}/>;
}

export default App;
