
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Drone } from '../types';
import { DroneStatus } from '../types';
import { optimizeRoute, getSituationalAwarenessInfo } from '../services/geminiService';
import { Bot, Battery, Signal, Thermometer, ArrowUp, HeartPulse, MapPin, Loader2, Sparkles, AlertTriangle, Info, Siren } from 'lucide-react';

const mockDrones: Drone[] = [
  {
    id: 'AEX-701', model: 'Vigilance Eagle', status: DroneStatus.Patrolling, battery: 78, health: 92, estimatedFlightTime: 45,
    position: { x: 25, y: 40 }, payload: 2.5, telemetry: { signalStrength: 95, temperature: 22, altitude: 120 },
    missionType: 'Patrol', patrolPath: [{ x: 25, y: 40 }, { x: 45, y: 20 }, { x: 70, y: 35 }, { x: 50, y: 60 }, { x: 30, y: 55 }], currentPatrolWaypoint: 1,
    flightHours: 152, nextMaintenance: '2024-08-10',
  },
  {
    id: 'AEX-702', model: 'HeavyLift V2', status: DroneStatus.Returning, battery: 45, health: 98, estimatedFlightTime: 22,
    position: { x: 15, y: 25 }, payload: 15.0, orderId: 'ORD-003', telemetry: { signalStrength: 88, temperature: 24, altitude: 80 },
    missionType: 'Delivery', flightHours: 88, nextMaintenance: '2024-09-01',
  },
  {
    id: 'AEX-703', model: 'SkyHopper Pro', status: DroneStatus.Delivering, battery: 62, health: 85, estimatedFlightTime: 35,
    position: { x: 80, y: 50 }, payload: 4.8, orderId: 'ORD-002', telemetry: { signalStrength: 91, temperature: 21, altitude: 100 },
    missionType: 'Delivery', flightHours: 189, nextMaintenance: '2024-07-20',
  },
    {
    id: 'AEX-704', model: 'SkyHopper Pro', status: DroneStatus.InTransit, battery: 75, health: 95, estimatedFlightTime: 40,
    position: { x: 40, y: 70 }, payload: 4.8, orderId: 'ORD-004', telemetry: { signalStrength: 92, temperature: 23, altitude: 110 },
    missionType: 'Delivery', flightHours: 35, nextMaintenance: '2024-10-01',
  },
  {
    id: 'AEX-705', model: 'Vigilance Eagle', status: DroneStatus.Idle, battery: 100, health: 99, estimatedFlightTime: 60,
    position: { x: 10, y: 15 }, payload: 2.5, telemetry: { signalStrength: 100, temperature: 19, altitude: 0 },
    missionType: 'Patrol', patrolPath: [{ x: 10, y: 15 }, { x: 20, y: 80 }, { x: 5, y: 60 }, { x: 15, y: 40 }], currentPatrolWaypoint: 0,
    flightHours: 51, nextMaintenance: '2024-09-15',
  },
  {
    id: 'AEX-706', model: 'HeavyLift V2', status: DroneStatus.Maintenance, battery: 0, health: 55, estimatedFlightTime: 0,
    position: { x: 85, y: 80 }, payload: 0, telemetry: { signalStrength: 0, temperature: 20, altitude: 0 },
    missionType: 'Delivery', flightHours: 250, nextMaintenance: '2024-08-05',
  },
];

const COLLISION_THRESHOLD = 8; // in percentage of map width/height

const getStatusPill = (status: DroneStatus) => {
    const baseClasses = 'px-2 py-1 text-xs font-bold rounded-full';
    switch (status) {
        case DroneStatus.Idle: return `${baseClasses} bg-gray-500 text-gray-900`;
        case DroneStatus.Delivering: return `${baseClasses} bg-cyan-500 text-cyan-900 animate-pulse`;
        // FIX: Corrected typo from Drone_status to DroneStatus
        case DroneStatus.InTransit: return `${baseClasses} bg-sky-500 text-sky-900 animate-pulse`;
        case DroneStatus.Returning: return `${baseClasses} bg-teal-500 text-teal-900 animate-pulse`;
        case DroneStatus.Patrolling: return `${baseClasses} bg-purple-500 text-purple-900 animate-pulse`;
        case DroneStatus.Charging: return `${baseClasses} bg-green-500 text-green-900`;
        case DroneStatus.Maintenance: return `${baseClasses} bg-red-500 text-red-900`;
        default: return `${baseClasses} bg-gray-700`;
    }
};

const getBarColor = (value: number) => {
    if (value > 70) return 'bg-green-500';
    if (value > 30) return 'bg-yellow-500';
    return 'bg-red-500';
};

const TelemetryCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; unit: string; }> = ({ icon: Icon, label, value, unit }) => (
    <div className="bg-gray-700/50 p-3 rounded-lg flex items-center">
        <Icon className="h-6 w-6 mr-3 text-cyan-400" />
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="font-bold text-white">{value} <span className="text-xs text-gray-400">{unit}</span></p>
        </div>
    </div>
);

// Function to generate mock telemetry history
const generateTelemetryHistory = (currentTelemetry: Drone['telemetry']) => {
    const history = [];
    for (let i = 10; i >= 0; i--) {
        history.push({
            time: Date.now() - i * 5000,
            signal: Math.max(0, Math.min(100, currentTelemetry.signalStrength + (Math.random() - 0.5) * 10)),
            temp: currentTelemetry.temperature + (Math.random() - 0.5) * 2,
            alt: Math.max(0, currentTelemetry.altitude + (Math.random() - 0.5) * 20),
        });
    }
    return history;
};

const Drones: React.FC = () => {
    const [drones, setDrones] = useState<Drone[]>(mockDrones.map(d => ({...d, telemetryHistory: generateTelemetryHistory(d.telemetry) })));
    const [selectedDrone, setSelectedDrone] = useState<Drone | null>(drones[0]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const [situationalInfo, setSituationalInfo] = useState<{ text: string; groundingChunks: any[] } | null>(null);
    const [collisionAlerts, setCollisionAlerts] = useState<string[][]>([]);

    const handleOptimizeRoute = async () => {
        if (!selectedDrone || !selectedDrone.patrolPath || selectedDrone.missionType !== 'Patrol') return;
        setIsOptimizing(true);
        const newPath = await optimizeRoute(selectedDrone.patrolPath);
        if (newPath) {
            const updatedDrones = drones.map(d =>
                d.id === selectedDrone.id ? { ...d, patrolPath: newPath } : d
            );
            setDrones(updatedDrones);
            setSelectedDrone(updatedDrones.find(d => d.id === selectedDrone.id) || null);
        }
        setIsOptimizing(false);
    };

    const handleGetInfo = async () => {
        if (!selectedDrone) return;
        setIsFetchingInfo(true);
        setSituationalInfo(null);
        const query = `Provide situational awareness for a drone at these coordinates. What are the key landmarks, potential obstacles like tall buildings or power lines, and any reported air traffic advisories nearby?`;
        const mockLocation = { latitude: 34.0522 + (selectedDrone.position.y / 1000), longitude: -118.2437 + (selectedDrone.position.x / 1000) };
        const info = await getSituationalAwarenessInfo(query, mockLocation);
        setSituationalInfo(info);
        setIsFetchingInfo(false);
    };

    // Drone simulation and collision detection
    useEffect(() => {
        const interval = setInterval(() => {
            // Update drone positions for simulation
            const updatedDrones = drones.map(drone => {
                if ([DroneStatus.Delivering, DroneStatus.InTransit, DroneStatus.Returning, DroneStatus.Patrolling].includes(drone.status)) {
                    // Simple random walk for simulation
                    const newX = Math.max(0, Math.min(100, drone.position.x + (Math.random() - 0.5) * 2));
                    const newY = Math.max(0, Math.min(100, drone.position.y + (Math.random() - 0.5) * 2));
                    return { ...drone, position: { x: newX, y: newY } };
                }
                return drone;
            });

            // Collision Detection
            const alerts: string[][] = [];
            for (let i = 0; i < updatedDrones.length; i++) {
                for (let j = i + 1; j < updatedDrones.length; j++) {
                    const d1 = updatedDrones[i];
                    const d2 = updatedDrones[j];
                    // Ignore idle/maintenance drones
                    if (d1.status === DroneStatus.Idle || d1.status === DroneStatus.Maintenance || d2.status === DroneStatus.Idle || d2.status === DroneStatus.Maintenance) {
                        continue;
                    }
                    const distance = Math.sqrt(Math.pow(d1.position.x - d2.position.x, 2) + Math.pow(d1.position.y - d2.position.y, 2));
                    if (distance < COLLISION_THRESHOLD) {
                        alerts.push([d1.id, d2.id]);
                    }
                }
            }
            setCollisionAlerts(alerts);
            setDrones(updatedDrones);
            if (selectedDrone) {
                setSelectedDrone(prev => updatedDrones.find(d => d.id === prev?.id) || null);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [drones, selectedDrone]);
    
    useEffect(() => {
        setSituationalInfo(null);
    }, [selectedDrone]);
    
    const dronesInCollision = useMemo(() => new Set(collisionAlerts.flat()), [collisionAlerts]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Drone Fleet Management</h1>
            
            {collisionAlerts.length > 0 && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg shadow-lg" role="alert">
                    <div className="flex items-center">
                        <Siren className="h-6 w-6 mr-3 animate-pulse" />
                        <div>
                            <p className="font-bold">CRITICAL ALERT: Potential Collision Detected!</p>
                            <div className="text-sm">
                                {collisionAlerts.map((pair, i) => <span key={i} className="mr-4">{pair.join(' & ')} are in close proximity.</span>)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg p-4 space-y-3 h-[80vh] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-2">Fleet Status</h2>
                    {drones.map(drone => (
                        <div key={drone.id} className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${selectedDrone?.id === drone.id ? 'bg-gray-700 border-cyan-500' : 'bg-gray-700/50 border-transparent hover:border-gray-600'} ${dronesInCollision.has(drone.id) ? 'border-red-500 animate-pulse' : ''}`} onClick={() => setSelectedDrone(drone)}>
                           <div className="flex justify-between items-center mb-2">
                                <p className="font-bold text-white flex items-center"><Bot className="h-5 w-5 mr-2" />{drone.id}</p>
                                <span className={getStatusPill(drone.status)}>{drone.status}</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-2">{drone.model}</p>
                            <div className="flex items-center text-sm"><Battery className="h-4 w-4 mr-2" /><div className="w-full bg-gray-600 rounded-full h-2.5 mr-2"><div className={`${getBarColor(drone.battery)} h-2.5 rounded-full`} style={{ width: `${drone.battery}%` }}></div></div><span className="font-semibold">{drone.battery}%</span></div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-2 space-y-4">
                    {selectedDrone ? (
                        <>
                            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                                <h2 className="text-2xl font-bold mb-4">{selectedDrone.id} - {selectedDrone.model}</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><TelemetryCard icon={HeartPulse} label="Health" value={selectedDrone.health} unit="%" /><TelemetryCard icon={Signal} label="Signal" value={selectedDrone.telemetry.signalStrength} unit="%" /><TelemetryCard icon={Thermometer} label="Temp" value={selectedDrone.telemetry.temperature} unit="°C" /><TelemetryCard icon={ArrowUp} label="Altitude" value={selectedDrone.telemetry.altitude} unit="m" /></div>
                            </div>
                            
                             <div className="bg-gray-800 rounded-lg shadow-lg p-4 h-96">
                                <h3 className="text-lg font-semibold mb-2">Mission Map</h3>
                                <div className="relative h-full w-full bg-gray-900 rounded-md overflow-hidden border-2 border-gray-700">
                                    <div className="absolute inset-0 bg-transparent" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #4a556820 1px, transparent 1px), linear-gradient(to bottom, #4a556820 1px, transparent 1px)' }}></div>
                                    {selectedDrone.patrolPath && (<svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}><polyline points={selectedDrone.patrolPath.map(p => `${p.x}%,${p.y}%`).join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 4"/>{selectedDrone.patrolPath.map((p, i) => (<circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill={i === selectedDrone.currentPatrolWaypoint ? "#a78bfa" : "#4c1d95"} />))}</svg>)}
                                    {drones.map(d => (
                                        <div key={d.id} className="absolute transition-transform duration-1000 ease-linear" style={{ left: `${d.position.x}%`, top: `${d.position.y}%`, transform: 'translate(-50%, -50%)' }}>
                                            {dronesInCollision.has(d.id) ? <Siren className="h-8 w-8 text-red-500 animate-ping" /> : <Bot className={`h-7 w-7 ${d.id === selectedDrone.id ? 'text-cyan-300 scale-125' : 'text-cyan-500'}`} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold mb-4">Telemetry History</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={selectedDrone.telemetryHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                                        <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} stroke="#a0aec0" fontSize={12} />
                                        <YAxis stroke="#a0aec0" fontSize={12} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }}/>
                                        <Legend />
                                        <Line type="monotone" dataKey="alt" name="Altitude (m)" stroke="#8884d8" dot={false} />
                                        <Line type="monotone" dataKey="signal" name="Signal (%)" stroke="#82ca9d" dot={false} />
                                        <Line type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ffc658" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                                <h3 className="text-lg font-semibold mb-4">AI-Powered Actions</h3>
                                <div className="flex flex-col md:flex-row gap-4">
                                    {selectedDrone.missionType === 'Patrol' && (<button onClick={handleOptimizeRoute} disabled={isOptimizing} className="flex-1 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isOptimizing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Optimizing...</> : <><Sparkles className="h-5 w-5 mr-2" />Optimize Patrol Route</>}</button>)}
                                     <button onClick={handleGetInfo} disabled={isFetchingInfo} className="flex-1 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isFetchingInfo ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Fetching...</> : <><Info className="h-5 w-5 mr-2" />Get Situational Awareness</>}</button>
                                </div>
                                {situationalInfo && (<div className="mt-4 p-4 bg-gray-700/50 rounded-lg"><h4 className="font-semibold text-cyan-400 mb-2">Gemini Analysis:</h4><p className="text-sm text-gray-300 whitespace-pre-wrap">{situationalInfo.text}</p>{situationalInfo.groundingChunks.length > 0 && (<div className="mt-3 border-t border-gray-600 pt-3"><h5 className="text-xs font-bold text-gray-400 mb-2">SOURCES:</h5><div className="flex flex-wrap gap-2">{situationalInfo.groundingChunks.map((chunk, index) => chunk.maps && (<a href={chunk.maps.uri} key={index} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-600 hover:bg-gray-500 text-cyan-300 px-2 py-1 rounded-md flex items-center gap-1"><MapPin className="h-3 w-3" /> {chunk.maps.title}</a>))}</div></div>)}</div>)}
                            </div>
                        </>
                    ) : (
                        <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex items-center justify-center h-full"><div className="text-center text-gray-500"><Bot className="h-16 w-16 mx-auto" /><p className="mt-4 text-lg">Select a drone to view details</p></div></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Drones;
