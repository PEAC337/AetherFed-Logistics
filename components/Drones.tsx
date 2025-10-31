import React, { useState, useEffect, useRef } from 'react';
import type { Drone, Order } from '../types';
import { DroneStatus, OrderStatus } from '../types';
import { getFaaRegulationSummary, getSituationalAwarenessInfo } from '../services/geminiService';
import { Bot, Battery, Thermometer, Package, HeartPulse, Signal, Clock, Hash, AlertTriangle, XCircle, Edit, Settings, BatteryWarning, Rocket, CheckCircle, Eye, ShieldCheck, Map as MapIcon, Save, Ban, ClipboardList, Loader2, Share2, Send, Landmark, ShieldAlert, MapPin, Truck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const initialDrones: Drone[] = Array.from({ length: 10 }, (_, i) => {
    const isPatrol = i % 3 === 1;
    return {
        id: `AEX-${700 + i}`,
        model: isPatrol ? 'Vigilance Eagle' : (i % 3 === 0 ? 'HeavyLift V2' : 'SkyHopper Pro'),
        status: DroneStatus.Idle,
        battery: 100,
        health: 100,
        estimatedFlightTime: 60,
        position: { x: 10 + (Math.random() - 0.5) * 5, y: 10 + (Math.random() - 0.5) * 5 },
        payload: 0,
        telemetry: { signalStrength: 98, temperature: 25, altitude: 0, },
        missionType: isPatrol ? 'Patrol' : 'Delivery',
        patrolPath: isPatrol ? [ { x: 20, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }, { x: 20, y: 80 } ] : undefined,
        currentPatrolWaypoint: 0,
    };
});

const mockPendingOrders: Partial<Order>[] = [
    { id: 'ORD-004', customerName: 'Alice Johnson', status: OrderStatus.Pending, items: [{ quantity: 2, price: 160, name: 'Item', sku: 'A' }] },
    { id: 'ORD-012', customerName: 'Tom Harris', status: OrderStatus.Pending, items: [{ quantity: 1, price: 50, name: 'Item', sku: 'B' }] },
    { id: 'ORD-015', customerName: 'Olivia Chen', status: OrderStatus.Pending, items: [{ quantity: 3, price: 20, name: 'Item', sku: 'C' }] },
];

type TelemetryPoint = { time: number; signal: number; temp: number; alt: number; };
type TelemetryHistory = Record<string, TelemetryPoint[]>;
interface Geofence { x: number; y: number; width: number; height: number; }
type AlertType = 'geofence' | 'battery' | 'temperature';
interface SystemAlert { droneId: string; timestamp: number; type: AlertType; message: string; sharedWith?: string[]; }
interface LawEnforcementAgency { id: string; name: string; }

const MAX_HISTORY_LENGTH = 30;
const BASE_STATION = { x: 10, y: 10 };
const CRUISING_ALTITUDE = 120;
const MAX_TEMP = 45;
const AMBIENT_TEMP = 25;
const DRONE_SPEED = 0.5;

const lawEnforcementAgencies: LawEnforcementAgency[] = [
    { id: 'SPD', name: 'Springfield Police Department' },
    { id: 'SCSP', name: 'Shelbyville County State Patrol' },
    { id: 'NCAVIATION', name: 'National Civil Aviation Authority' },
    { id: 'AETHERSEC', name: 'AetherFlow Internal Security' }
];

const getStatusColor = (status: DroneStatus) => {
    const colors: Record<DroneStatus, string> = {
        [DroneStatus.Idle]: 'text-green-400',
        [DroneStatus.InTransit]: 'text-blue-400',
        [DroneStatus.Delivering]: 'text-cyan-400',
        [DroneStatus.Returning]: 'text-purple-400',
        [DroneStatus.Charging]: 'text-yellow-400',
        [DroneStatus.Maintenance]: 'text-red-400',
        [DroneStatus.Patrolling]: 'text-orange-400',
    };
    return colors[status];
};

const DroneIcon = ({ drone, isAlerting }: { drone: Drone; isAlerting: boolean }) => (
    <div className="absolute transition-all duration-500 ease-linear cursor-pointer" style={{ left: `${drone.position.x}%`, top: `${drone.position.y}%`, transform: 'translate(-50%, -50%)' }} title={`Drone ${drone.id}`}>
        {drone.missionType === 'Patrol' ?
            <Eye className={`h-6 w-6 ${isAlerting ? 'text-red-500 animate-pulse' : getStatusColor(drone.status)}`} /> :
            <Bot className={`h-6 w-6 ${isAlerting ? 'text-red-500 animate-pulse' : getStatusColor(drone.status)}`} />
        }
    </div>
);

const DetailCard: React.FC<{ icon: React.ElementType, label: string, value: string | number, iconClass?: string }> = ({ icon: Icon, label, value, iconClass = "text-cyan-400" }) => (
    <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
        <Icon className={`h-7 w-7 ${iconClass}`} />
        <div><p className="text-xs text-gray-400">{label}</p><p className="font-semibold text-base">{value}</p></div>
    </div>
);

const TelemetryChart: React.FC<{ data: TelemetryPoint[]; dataKey: keyof Omit<TelemetryPoint, 'time'>; strokeColor: string; title: string; unit: string; }> = ({ data, dataKey, strokeColor, title, unit }) => (
  <div className="bg-gray-700/50 p-3 rounded-lg flex-1">
    <h4 className="text-sm font-semibold text-gray-300 mb-2 text-center">{title}</h4>
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
        <XAxis dataKey="time" hide={true} />
        <YAxis stroke="#a0aec0" tick={{ fontSize: 10 }} unit={unit} domain={['dataMin - 5', 'dataMax + 5']} allowDataOverflow={true} />
        <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568', borderRadius: '0.5rem' }} labelFormatter={(label) => new Date(label).toLocaleTimeString()} formatter={(value) => [`${(value as number).toFixed(1)}${unit}`, null]}/>
        <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const AlertIcon: React.FC<{type: AlertType}> = ({ type }) => {
    switch (type) {
        case 'geofence': return <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />;
        case 'battery': return <BatteryWarning className="h-5 w-5 text-orange-400 flex-shrink-0" />;
        case 'temperature': return <Thermometer className="h-5 w-5 text-red-400 flex-shrink-0" />;
        default: return null;
    }
}

const Drones: React.FC = () => {
    const [drones, setDrones] = useState<Drone[]>(initialDrones);
    const [selectedDrone, setSelectedDrone] = useState<Drone | null>(drones[0]);
    const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistory>({});
    const [geofence, setGeofence] = useState<Geofence | null>({ x: 5, y: 5, width: 90, height: 90 });
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [alertThresholds, setAlertThresholds] = useState({ battery: 20, temperature: 40 });
    const [selectedOrderToAssign, setSelectedOrderToAssign] = useState('');
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [newPatrolPath, setNewPatrolPath] = useState<{ x: number, y: number }[]>([]);
    const [faaSummary, setFaaSummary] = useState('');
    const [isFaaLoading, setIsFaaLoading] = useState(false);

    // State for Inter-Agency Notification
    const [notificationTarget, setNotificationTarget] = useState<SystemAlert | null>(null);
    const [selectedAgencies, setSelectedAgencies] = useState<Set<string>>(new Set());
    const [notificationMessage, setNotificationMessage] = useState('');

    // State for Situational Awareness
    const [saQuery, setSaQuery] = useState('Are there any schools or parks nearby?');
    const [saResult, setSaResult] = useState<{ text: string; groundingChunks: any[] } | null>(null);
    const [isSaLoading, setIsSaLoading] = useState(false);


    const mapRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const interval = setInterval(() => {
            const currentAlerts: SystemAlert[] = [];

            setDrones(prevDrones => {
                const nextDrones = prevDrones.map(drone => {
                    let { position, status, battery, health, telemetry, orderId, patrolPath, currentPatrolWaypoint = 0 } = drone;
                    let newPosition = { ...position };
                    let newStatus = status;
                    let newBattery = battery;
                    let newHealth = health;
                    let newTelemetry = { ...telemetry };
                    let newCurrentPatrolWaypoint = currentPatrolWaypoint;
    
                    const isActive = status !== DroneStatus.Idle && status !== DroneStatus.Charging && status !== DroneStatus.Maintenance;
                    
                    if (status === DroneStatus.Patrolling && patrolPath && patrolPath.length > 0) {
                        const targetWaypoint = patrolPath[currentPatrolWaypoint];
                        const dx = targetWaypoint.x - position.x;
                        const dy = targetWaypoint.y - position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 2) {
                            newCurrentPatrolWaypoint = (currentPatrolWaypoint + 1) % patrolPath.length;
                        } else {
                            newPosition.x += (dx / distance) * DRONE_SPEED;
                            newPosition.y += (dy / distance) * DRONE_SPEED;
                        }
                    } else if (status === DroneStatus.Returning) {
                        const dx = BASE_STATION.x - position.x;
                        const dy = BASE_STATION.y - position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                         if (distance < 2) {
                            newStatus = DroneStatus.Idle;
                            newTelemetry.altitude = 0;
                        } else {
                            newPosition.x += (dx / distance) * DRONE_SPEED;
                            newPosition.y += (dy / distance) * DRONE_SPEED;
                        }
                    } else if (status === DroneStatus.InTransit || status === DroneStatus.Delivering) {
                        newPosition.x += (Math.random() - 0.5) * DRONE_SPEED * 2;
                        newPosition.y += (Math.random() - 0.5) * DRONE_SPEED * 2;
                    }
    
                    if (isActive) {
                        newBattery = Math.max(0, battery - 0.05);
                        newHealth = Math.max(0, health - (Math.random() * 0.0025));
                        newTelemetry.altitude = Math.min(CRUISING_ALTITUDE, telemetry.altitude + 1.25 + Math.random() * 0.5);
                        newTelemetry.temperature = Math.min(MAX_TEMP, telemetry.temperature + 0.125 + Math.random() * 0.05);
                    } else {
                        newTelemetry.altitude = Math.max(0, telemetry.altitude - 2.5);
                        newTelemetry.temperature = Math.max(AMBIENT_TEMP, telemetry.temperature - 0.125);
                    }
                    
                    newPosition.x = Math.max(0, Math.min(95, newPosition.x));
                    newPosition.y = Math.max(0, Math.min(95, newPosition.y));
                    
                    const distFromBase = Math.sqrt(Math.pow(newPosition.x - BASE_STATION.x, 2) + Math.pow(newPosition.y - BASE_STATION.y, 2));
                    newTelemetry.signalStrength = Math.max(0, 100 - (distFromBase * 0.3) - Math.random() * 5);
                    const estimatedFlightTime = Math.floor((newBattery / 100) * 60);
                    
                    if (geofence && isActive) {
                        const isOutside = newPosition.x < geofence.x || newPosition.x > geofence.x + geofence.width || newPosition.y < geofence.y || newPosition.y > geofence.y + geofence.height;
                        if (isOutside) currentAlerts.push({ droneId: drone.id, timestamp: Date.now(), type: 'geofence', message: `${drone.id} breached geofence.` });
                    }
                    if (isActive && newBattery < alertThresholds.battery) currentAlerts.push({ droneId: drone.id, timestamp: Date.now(), type: 'battery', message: `${drone.id} low battery (${newBattery.toFixed(0)}%).` });
                    if (newTelemetry.temperature > alertThresholds.temperature) currentAlerts.push({ droneId: drone.id, timestamp: Date.now(), type: 'temperature', message: `${drone.id} overheating (${newTelemetry.temperature.toFixed(1)}°C).` });

                    return { ...drone, position: newPosition, battery: newBattery, health: newHealth, telemetry: newTelemetry, estimatedFlightTime, orderId, status: newStatus, currentPatrolWaypoint: newCurrentPatrolWaypoint };
                });
                
                setAlerts(prev => [...prev.filter(p => currentAlerts.some(c => c.droneId === p.droneId && c.type === p.type)), ...currentAlerts.filter(c => !prev.some(p => p.droneId === c.droneId && c.type === c.type))].map(a => {
                    const existing = prev.find(p => p.timestamp === a.timestamp);
                    return { ...a, sharedWith: existing?.sharedWith || [] };
                }));
                
                setTelemetryHistory(prevHistory => {
                    const nextHistory = { ...prevHistory };
                    nextDrones.forEach(drone => {
                        const history = nextHistory[drone.id] || [];
                        nextHistory[drone.id] = [...history, { time: Date.now(), signal: drone.telemetry.signalStrength, temp: drone.telemetry.temperature, alt: drone.telemetry.altitude }].slice(-MAX_HISTORY_LENGTH);
                    });
                    return nextHistory;
                });
                return nextDrones;
            });
        }, 500);
        return () => clearInterval(interval);
    }, [geofence, alertThresholds]);

    const updateDroneState = (droneId: string, updates: Partial<Drone>) => {
        const updater = (d: Drone) => d.id === droneId ? { ...d, ...updates } : d;
        setDrones(drones.map(updater));
        if (selectedDrone?.id === droneId) setSelectedDrone(prev => prev ? { ...prev, ...updates } : null);
    };

    // --- Geofence and Path Handlers ---
    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isEditingPath || !mapRef.current) return;
        const rect = mapRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setNewPatrolPath([...newPatrolPath, { x, y }]);
    };

    const handleStartPathEdit = () => {
        if (!selectedDrone) return;
        setIsEditingPath(true);
        setNewPatrolPath(selectedDrone.patrolPath || []);
    };
    
    const handleSavePath = () => {
        if (!selectedDrone) return;
        updateDroneState(selectedDrone.id, { patrolPath: newPatrolPath });
        setIsEditingPath(false);
        setNewPatrolPath([]);
    };

    const handleCancelPathEdit = () => {
        setIsEditingPath(false);
        setNewPatrolPath([]);
    };
    
    // --- Mission Control Handlers ---
    const handleAssignOrder = () => {
        if (!selectedDrone || !selectedOrderToAssign) return;
        const orderPayload = mockPendingOrders.find(o => o.id === selectedOrderToAssign)?.items?.reduce((acc, item) => acc + item.quantity, 0) || 1;
        updateDroneState(selectedDrone.id, { orderId: selectedOrderToAssign, status: DroneStatus.InTransit, payload: orderPayload });
        setSelectedOrderToAssign('');
    };
    
    const handleStartPatrol = () => {
        if (!selectedDrone || !selectedDrone.patrolPath || selectedDrone.patrolPath.length === 0) return;
        updateDroneState(selectedDrone.id, { status: DroneStatus.Patrolling, currentPatrolWaypoint: 0 });
    };

    const handleEndMission = () => {
        if (!selectedDrone) return;
        updateDroneState(selectedDrone.id, { status: DroneStatus.Returning, orderId: undefined, payload: 0 });
    };
    
    const handleGetFaaSummary = async () => {
        setIsFaaLoading(true);
        setFaaSummary('');
        const summary = await getFaaRegulationSummary();
        setFaaSummary(summary || 'Error fetching summary.');
        setIsFaaLoading(false);
    }
    
    // --- Inter-Agency Notification Handlers ---
    const handleInitiateNotification = (alert: SystemAlert) => {
        const drone = drones.find(d => d.id === alert.droneId);
        if (!drone) return;

        let message = `[URGENT] ${alert.type.toUpperCase()} ALERT\n\n`;
        message += `Drone ID: ${drone.id} (${drone.model})\n`;
        message += `Mission Type: ${drone.missionType}\n`;
        message += `Alert: ${alert.message}\n`;
        message += `Last Known Position: (${drone.position.x.toFixed(2)}, ${drone.position.y.toFixed(2)})\n`;
        message += `Altitude: ${drone.telemetry.altitude.toFixed(0)}m\n\n`;
        message += `Requesting immediate situational awareness in operational area.`;

        setNotificationMessage(message);
        setNotificationTarget(alert);
    };
    
    const handleAgencySelect = (agencyId: string) => {
        const newSelection = new Set(selectedAgencies);
        if (newSelection.has(agencyId)) {
            newSelection.delete(agencyId);
        } else {
            newSelection.add(agencyId);
        }
        setSelectedAgencies(newSelection);
    };

    const handleSendNotification = () => {
        if (!notificationTarget) return;
        setAlerts(prevAlerts => prevAlerts.map(a => 
            a.timestamp === notificationTarget.timestamp 
            ? { ...a, sharedWith: Array.from(new Set([...(a.sharedWith || []), ...Array.from(selectedAgencies)])) }
            : a
        ));
        setNotificationTarget(null);
        setSelectedAgencies(new Set());
        setNotificationMessage('');
    };

    // --- Situational Awareness Handler ---
    const handleGetSAInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!saQuery || !selectedDrone) return;

        setIsSaLoading(true);
        setSaResult(null);

        // Mock lat/lng from drone position (0-100) -> Southern California area
        const droneLocation = {
            latitude: 33.5 + (selectedDrone.position.y / 100) * 1.5,
            longitude: -118.5 + (selectedDrone.position.x / 100) * 1.5,
        };

        const result = await getSituationalAwarenessInfo(saQuery, droneLocation);
        
        if (result) {
            setSaResult(result);
        } else {
            setSaResult({ text: 'Error fetching information.', groundingChunks: [] });
        }
        setIsSaLoading(false);
    };


    const alertDroneIds = new Set(alerts.map(a => a.droneId));
    const assignedOrderIds = new Set(drones.map(d => d.orderId).filter(Boolean));
    const availableOrders = mockPendingOrders.filter(o => !assignedOrderIds.has(o.id));

    return (
        <div className="h-full flex flex-col space-y-6">
            <h1 className="text-3xl font-bold text-white">Drone Fleet Command</h1>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                <div className={`lg:col-span-2 bg-gray-800 rounded-lg shadow-lg p-4 relative overflow-hidden ${isEditingPath ? 'cursor-copy' : ''}`} ref={mapRef} onClick={handleMapClick}>
                    <div className="absolute inset-0 bg-transparent" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #4a556820 1px, transparent 1px), linear-gradient(to bottom, #4a556820 1px, transparent 1px)' }}></div>
                    {geofence && <div className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none" style={{ left: `${geofence.x}%`, top: `${geofence.y}%`, width: `${geofence.width}%`, height: `${geofence.height}%` }}></div>}
                    <div className="absolute" style={{left: `${BASE_STATION.x}%`, top: `${BASE_STATION.y}%`, transform: 'translate(-50%, -50%)'}}><ShieldCheck className="h-8 w-8 text-cyan-300" title="Base Station" /></div>
                    
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {selectedDrone?.patrolPath && selectedDrone.patrolPath.length > 1 && (<polyline points={selectedDrone.patrolPath.map(p => `${p.x}%,${p.y}%`).join(' ')} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4 4" />)}
                        {isEditingPath && newPatrolPath.length > 0 && newPatrolPath.map((p, i) => (<circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="6" fill="#0ea5e9" stroke="white" strokeWidth="2" />))}
                        {isEditingPath && newPatrolPath.length > 1 && (<polyline points={newPatrolPath.map(p => `${p.x}%,${p.y}%`).join(' ')} fill="none" stroke="#0ea5e9" strokeWidth="2" />)}
                    </svg>

                    {drones.map(drone => <div key={drone.id} onClick={(e) => { e.stopPropagation(); setSelectedDrone(drone); }}><DroneIcon drone={drone} isAlerting={alertDroneIds.has(drone.id)} /></div>)}
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0 overflow-y-auto pr-2">
                    {/* Fleet Status Panel */}
                    <div className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col">
                        <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-700 pb-2">Fleet Status</h2>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {drones.map(drone => (
                                <div key={drone.id} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedDrone?.id === drone.id ? 'bg-cyan-900/50' : 'hover:bg-gray-700'} ${alertDroneIds.has(drone.id) ? 'ring-2 ring-red-500' : ''}`} onClick={() => setSelectedDrone(drone)}>
                                    <div className="flex justify-between items-center"><span className="font-bold flex items-center">{drone.missionType === 'Patrol' ? <Eye className="h-4 w-4 mr-2 text-orange-400" /> : <Package className="h-4 w-4 mr-2 text-blue-400" />}{drone.id}</span><span className={`text-sm font-medium ${getStatusColor(drone.status)}`}>{drone.status}</span></div>
                                    <div className="space-y-1.5 mt-2"><div className="w-full bg-gray-600 rounded-full h-1.5"><div title={`Battery: ${drone.battery.toFixed(0)}%`} className="bg-green-500 h-1.5 rounded-full" style={{width: `${drone.battery}%`}}></div></div><div className="w-full bg-gray-600 rounded-full h-1.5"><div title={`Health: ${drone.health.toFixed(0)}%`} className="bg-cyan-500 h-1.5 rounded-full" style={{width: `${drone.health}%`}}></div></div></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selected Drone Details */}
                    {selectedDrone ? (
                        <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
                            <div className="flex justify-between items-start">
                                <div><h3 className="text-2xl font-bold text-cyan-400">{selectedDrone.id}</h3><p className="text-gray-400">{selectedDrone.model}</p></div>
                                <div className="flex items-center space-x-2 p-3 bg-gray-700/50 rounded-lg">
                                    {selectedDrone.missionType === 'Patrol' ? <Eye className={`h-6 w-6 ${getStatusColor(selectedDrone.status)}`} /> : <Bot className={`h-6 w-6 ${getStatusColor(selectedDrone.status)}`} />}
                                    <div><p className="text-xs text-gray-400">Status</p><p className="font-semibold">{selectedDrone.status}</p></div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <DetailCard icon={Package} label="Payload" value={`${selectedDrone.payload} kg`} iconClass="text-yellow-400" />
                                <DetailCard icon={Battery} label="Battery" value={`${selectedDrone.battery.toFixed(0)}%`} iconClass="text-green-400" />
                                <DetailCard icon={HeartPulse} label="Health" value={`${selectedDrone.health.toFixed(0)}%`} iconClass="text-rose-400" />
                                <DetailCard icon={Clock} label="Est. Flight Time" value={`${selectedDrone.estimatedFlightTime} min`} />
                            </div>

                            <div className="bg-gray-700/50 rounded-lg p-4">
                                <h4 className="font-semibold text-white mb-3">Mission Control</h4>
                                {isEditingPath ? (
                                    <div className="space-y-3"><p className="text-sm text-cyan-300">Click on the map to add waypoints.</p><div className="flex space-x-2"><button onClick={handleSavePath} className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg"><Save className="h-5 w-5 mr-2" />Save Path</button><button onClick={handleCancelPathEdit} className="w-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg"><Ban className="h-5 w-5 mr-2" />Cancel</button></div></div>
                                ) : selectedDrone.status === DroneStatus.Idle ? (
                                    selectedDrone.missionType === 'Patrol' ? (
                                        <div className="space-y-3"><button onClick={handleStartPatrol} disabled={!selectedDrone.patrolPath || selectedDrone.patrolPath.length === 0} className="w-full flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"><Rocket className="h-5 w-5 mr-2" />Start Patrol</button><button onClick={handleStartPathEdit} className="w-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg"><MapIcon className="h-5 w-5 mr-2" />Edit Patrol Path</button></div>
                                    ) : (
                                        <div className="space-y-3"><select value={selectedOrderToAssign} onChange={(e) => setSelectedOrderToAssign(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white"><option value="">Select an order to assign...</option>{availableOrders.map(order => (<option key={order.id} value={order.id}>{order.id} - {order.customerName}</option>))}</select><button onClick={handleAssignOrder} disabled={!selectedOrderToAssign} className="w-full flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"><Rocket className="h-5 w-5 mr-2" />Assign & Deploy</button></div>
                                    )
                                ) : (
                                    <div className="space-y-3"><DetailCard icon={Hash} label="Assigned Mission" value={selectedDrone.orderId || 'Patrolling'} /><button onClick={handleEndMission} className="w-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"><CheckCircle className="h-5 w-5 mr-2" />End Mission & Return</button></div>
                                )}
                            </div>
                            <div><h3 className="text-xl font-bold mb-4 text-white">Live Instrument Panel</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><TelemetryChart data={telemetryHistory[selectedDrone.id] || []} dataKey="signal" strokeColor="#06b6d4" title="Signal" unit="%" /><TelemetryChart data={telemetryHistory[selectedDrone.id] || []} dataKey="temp" strokeColor="#f59e0b" title="Temp" unit="°C" /><TelemetryChart data={telemetryHistory[selectedDrone.id] || []} dataKey="alt" strokeColor="#8b5cf6" title="Altitude" unit="m" /></div></div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex-1 flex flex-col items-center justify-center text-center text-gray-500"><Bot className="h-12 w-12 mb-4" /><h3 className="text-lg font-semibold">No Drone Selected</h3><p className="text-sm">Click a drone to view its telemetry and controls.</p></div>
                    )}
                    
                    {/* Compliance Dashboard */}
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
                        <h3 className="text-xl font-bold text-white flex items-center"><ClipboardList className="h-6 w-6 mr-2 text-cyan-400"/>Compliance Dashboard</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-700/50 rounded-lg flex items-center">
                                <ShieldCheck className="h-6 w-6 mr-3 text-green-400 flex-shrink-0"/>
                                <div>
                                    <p className="text-xs text-gray-400">Company FTN (FAA)</p>
                                    <p className="font-mono text-base text-white">C1998695</p>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-700/50 rounded-lg flex items-center">
                                <Landmark className="h-6 w-6 mr-3 text-blue-400 flex-shrink-0"/>
                                <div>
                                    <p className="text-xs text-gray-400">FinCEN ID</p>
                                    <p className="font-mono text-base text-white">3000-0074-3082</p>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-700/50 rounded-lg flex items-center">
                                <ShieldAlert className="h-6 w-6 mr-3 text-red-400 flex-shrink-0"/>
                                <div>
                                    <p className="text-xs text-gray-400">FEMA SID</p>
                                    <p className="font-mono text-base text-white">0008940258</p>
                                </div>
                            </div>
                             <div className="p-3 bg-gray-700/50 rounded-lg flex items-center">
                                <Truck className="h-6 w-6 mr-3 text-yellow-400 flex-shrink-0"/>
                                <div>
                                    <p className="text-xs text-gray-400">USDOT #'s</p>
                                    <p className="font-mono text-sm text-white">4357526, 4379213, 4372926</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-300 border-t border-gray-700 pt-4">
                           <p className="font-semibold text-gray-200 mb-2">Pre-flight Checklist</p>
                           <label className="flex items-center"><input type="checkbox" className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-cyan-500 focus:ring-cyan-600 mr-2" />Pre-flight inspection complete.</label>
                           <label className="flex items-center"><input type="checkbox" className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-cyan-500 focus:ring-cyan-600 mr-2" />Weather conditions checked.</label>
                           <label className="flex items-center"><input type="checkbox" className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-cyan-500 focus:ring-cyan-600 mr-2" />Airspace is clear of obstructions.</label>
                        </div>
                        <button onClick={handleGetFaaSummary} disabled={isFaaLoading} className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50"><Bot className="h-5 w-5 mr-2" />Get AI Summary of Regulations</button>
                        {isFaaLoading && <div className="flex justify-center items-center text-cyan-400"><Loader2 className="h-5 w-5 mr-2 animate-spin" /><span>Fetching summary...</span></div>}
                        {faaSummary && <div className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded-lg whitespace-pre-wrap">{faaSummary}</div>}
                    </div>

                     {/* Situational Awareness Panel */}
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <MapPin className="h-6 w-6 mr-3 text-cyan-400" />
                            Situational Awareness
                        </h3>
                        <p className="text-sm text-gray-400">
                            Ask location-based questions about the selected drone's vicinity using Google Maps data.
                        </p>
                        <form onSubmit={handleGetSAInfo} className="flex space-x-2">
                            <input
                                type="text"
                                value={saQuery}
                                onChange={(e) => setSaQuery(e.target.value)}
                                placeholder="e.g., Good landing spots nearby?"
                                className="flex-grow bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                disabled={!selectedDrone}
                            />
                            <button
                                type="submit"
                                disabled={isSaLoading || !selectedDrone || !saQuery}
                                className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50"
                            >
                                {isSaLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ask'}
                            </button>
                        </form>
                        {isSaLoading && <div className="flex justify-center items-center text-cyan-400 pt-4"><Loader2 className="h-5 w-5 mr-2 animate-spin" /><span>Getting info...</span></div>}
                        {saResult && !isSaLoading && (
                            <div className="text-sm text-gray-300 bg-gray-700/50 p-3 rounded-lg space-y-4">
                                <h4 className="font-semibold text-gray-200">AI Response:</h4>
                                <div className="whitespace-pre-wrap">{saResult.text}</div>
                                {saResult.groundingChunks.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-200 border-t border-gray-600 pt-3 mt-3">Sources from Google Maps:</h4>
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            {saResult.groundingChunks.map((chunk, index) => (
                                                chunk.maps && (
                                                    <li key={index}>
                                                        <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                                                            {chunk.maps.title}
                                                        </a>
                                                    </li>
                                                )
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    {/* System Alerts */}
                    <div className={`bg-gray-800 rounded-lg shadow-lg p-6 ${alerts.length > 0 ? 'border border-red-500/50' : 'border border-transparent'}`}>
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center"><AlertTriangle className={`h-6 w-6 mr-3 ${alerts.length > 0 ? 'text-red-500 animate-ping' : 'text-gray-500'}`} /> System Alerts ({alerts.length})</h3>
                        <div className="max-h-48 overflow-y-auto pr-2 space-y-2">{alerts.length > 0 ? alerts.map(alert => (
                            <div key={alert.timestamp} className="p-3 bg-gray-700/50 rounded-lg">
                                <div className="flex items-start text-sm space-x-3">
                                    <AlertIcon type={alert.type}/>
                                    <div>
                                        <p>{alert.message}</p>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <button onClick={() => handleInitiateNotification(alert)} className="flex items-center text-xs bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-1 px-2 rounded"><Share2 className="h-3 w-3 mr-1" />Notify Agencies</button>
                                            {alert.sharedWith && alert.sharedWith.length > 0 && (<span className="text-xs text-gray-400 bg-gray-600 px-2 py-0.5 rounded-full">Shared ({alert.sharedWith.length})</span>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-gray-400">All systems normal.</p>}</div>
                    </div>
                </div>
            </div>

             {/* Inter-Agency Notification Modal */}
             {notificationTarget && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setNotificationTarget(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg border border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-yellow-400 flex items-center"><Share2 className="mr-2"/>Notify External Agencies</h2>
                            <button onClick={() => setNotificationTarget(null)}><XCircle className="h-6 w-6 text-gray-500 hover:text-white"/></button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Share critical alert information with relevant authorities. The list of agencies may be contingent on the drone's traversed skyway.</p>
                        
                        <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
                            <h3 className="font-semibold text-white mb-2">Dispatch Message</h3>
                            <textarea value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} rows={7} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"></textarea>
                        </div>

                        <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
                            <h3 className="font-semibold text-white mb-3">Select Agencies to Notify</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {lawEnforcementAgencies.map(agency => (
                                    <label key={agency.id} className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer ${selectedAgencies.has(agency.id) ? 'bg-cyan-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                        <input type="checkbox" checked={selectedAgencies.has(agency.id)} onChange={() => handleAgencySelect(agency.id)} className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-cyan-500 focus:ring-cyan-600 accent-cyan-500" />
                                        <span className="text-sm font-medium">{agency.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setNotificationTarget(null)} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors">Cancel</button>
                            <button onClick={handleSendNotification} disabled={selectedAgencies.size === 0} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                               <Send className="h-5 w-5 mr-2" /> Send Notification ({selectedAgencies.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Drones;