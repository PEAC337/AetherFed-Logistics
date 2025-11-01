
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Drone } from '../types';
import { DroneStatus } from '../types';
import { optimizeRoute, getSituationalAwarenessInfo } from '../services/geminiService';
import { Bot, Battery, Signal, Thermometer, ArrowUp, HeartPulse, MapPin, Loader2, Sparkles, AlertTriangle, Info, Siren, Send } from 'lucide-react';

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
const LOW_BATTERY_THRESHOLD = 20;
const CHARGING_HUB_LOCATION = { x: 10, y: 15 }; // Aether-Hub West

const getStatusPill = (status: DroneStatus) => {
    const baseClasses = 'px-2 py-1 text-xs font-bold rounded-full';
    switch (status) {
        case DroneStatus.Idle: return `${baseClasses} bg-gray-500 text-gray-900`;
        case DroneStatus.Delivering: return `${baseClasses} bg-cyan-500 text-cyan-900 animate-pulse`;
        case DroneStatus.InTransit: return `${baseClasses} bg-sky-500 text-sky-900 animate-pulse`;
        case DroneStatus.Returning: return `${baseClasses} bg-teal-500 text-teal-900 animate-pulse`;
        case DroneStatus.Patrolling: return `${baseClasses} bg-purple-500 text-purple-900 animate-pulse`;
        case DroneStatus.Charging: return `${baseClasses} bg-green-500 text-green-900 animate-pulse`;
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
    const [manualDest, setManualDest] = useState<{x: string, y: string}>({ x: '80', y: '50' });
    const [groupBy, setGroupBy] = useState<'none' | 'model' | 'missionType'>('none');

    const handleOptimizeRoute = async () => {
        if (!selectedDrone || !selectedDrone.patrolPath || selectedDrone.missionType !== 'Patrol') return;
        setIsOptimizing(true);
        const optimized = await optimizeRoute(selectedDrone.patrolPath);
        if (optimized) {
            const updatedDrone = { ...selectedDrone, patrolPath: optimized, currentPatrolWaypoint: 1 };
            setDrones(drones.map(d => d.id === selectedDrone.id ? updatedDrone : d));
            setSelectedDrone(updatedDrone);
        }
        setIsOptimizing(false);
    };

    const handleFetchInfo = async () => {
        if (!selectedDrone) return;
        setIsFetchingInfo(true);
        setSituationalInfo(null);
        const location = { latitude: 34.0522, longitude: -118.2437 }; // Mock LA for demo
        const query = `Provide situational awareness for a drone operating near my current location. Include any temporary flight restrictions (TFRs), weather advisories (like high winds or rain), and notable ground activity or events.`;
        const result = await getSituationalAwarenessInfo(query, location);
        setSituationalInfo(result);
        setIsFetchingInfo(false);
    };

    const handleSetManualDestination = () => {
        if (!selectedDrone) return;
        const x = parseInt(manualDest.x, 10);
        const y = parseInt(manualDest.y, 10);

        if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
            const updatedDrone: Drone = {
                ...selectedDrone,
                status: DroneStatus.InTransit,
                destination: { x, y },
                missionType: 'Delivery',
                patrolPath: undefined,
                currentPatrolWaypoint: undefined,
            };
            setDrones(drones.map(d => (d.id === selectedDrone.id ? updatedDrone : d)));
            setSelectedDrone(updatedDrone);
        } else {
            alert('Please enter valid coordinates (0-100).');
        }
    };

    // Drone movement and status simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setDrones(prevDrones =>
                prevDrones.map(drone => {
                    if ([DroneStatus.Idle, DroneStatus.Maintenance].includes(drone.status)) {
                         if (drone.status === DroneStatus.Charging) {
                            const newBattery = Math.min(100, drone.battery + 0.5);
                            if (newBattery === 100) {
                                return { ...drone, battery: newBattery, status: DroneStatus.Idle };
                            }
                            return { ...drone, battery: newBattery };
                        }
                        return drone;
                    }

                    let target: { x: number; y: number } | undefined;

                    if (drone.status === DroneStatus.Patrolling && drone.patrolPath && drone.currentPatrolWaypoint !== undefined) {
                        target = drone.patrolPath[drone.currentPatrolWaypoint];
                    } else if (drone.status === DroneStatus.Delivering && drone.orderId) {
                        target = drone.destination || { x: 90, y: 60 };
                    } else if (drone.status === DroneStatus.InTransit && drone.destination) {
                        target = drone.destination;
                    } else if (drone.status === DroneStatus.Returning) {
                        target = CHARGING_HUB_LOCATION;
                    }

                    if (!target) return drone;

                    const dx = target.x - drone.position.x;
                    const dy = target.y - drone.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 1) { // Reached target
                        if (drone.status === DroneStatus.Patrolling && drone.patrolPath && drone.currentPatrolWaypoint !== undefined) {
                            const nextWaypoint = (drone.currentPatrolWaypoint + 1) % drone.patrolPath.length;
                            return { ...drone, currentPatrolWaypoint: nextWaypoint };
                        }
                        if (drone.status === DroneStatus.Delivering) {
                            return { ...drone, status: DroneStatus.Returning, destination: undefined };
                        }
                        if (drone.status === DroneStatus.InTransit) {
                            return { ...drone, status: DroneStatus.Idle, destination: undefined };
                        }
                        if (drone.status === DroneStatus.Returning) {
                            const finalStatus = drone.battery < 100 ? DroneStatus.Charging : DroneStatus.Idle;
                            return { ...drone, status: finalStatus, destination: undefined };
                        }
                    }

                    // Move towards target
                    const speed = 0.5;
                    const newX = drone.position.x + (dx / dist) * speed;
                    const newY = drone.position.y + (dy / dist) * speed;
                    
                    // Battery drain simulation
                    let batteryDrain = 0.01; // Idle drain
                    if (drone.status === DroneStatus.Delivering || drone.status === DroneStatus.InTransit) batteryDrain = 0.05;
                    if (drone.status === DroneStatus.Patrolling || drone.status === DroneStatus.Returning) batteryDrain = 0.03;
                    
                    let newBattery = Math.max(0, drone.battery - batteryDrain);
                    let newStatus = drone.status;

                    if (newBattery > 0 && newBattery < LOW_BATTERY_THRESHOLD && drone.status !== DroneStatus.Returning) {
                        newStatus = DroneStatus.Returning;
                    } else if (newBattery === 0) {
                        newStatus = DroneStatus.Idle; // Landed
                    }

                    return { ...drone, position: { x: newX, y: newY }, battery: newBattery, status: newStatus };
                })
            );
        }, 200);

        return () => clearInterval(interval);
    }, []);

    // Collision detection
    useEffect(() => {
        const checkCollisions = () => {
            const alerts: string[][] = [];
            const activeDrones = drones.filter(d => ![DroneStatus.Idle, DroneStatus.Maintenance, DroneStatus.Charging].includes(d.status));
            
            for (let i = 0; i < activeDrones.length; i++) {
                for (let j = i + 1; j < activeDrones.length; j++) {
                    const d1 = activeDrones[i];
                    const d2 = activeDrones[j];
                    
                    const dx = d1.position.x - d2.position.x;
                    const dy = d1.position.y - d2.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const altDiff = Math.abs(d1.telemetry.altitude - d2.telemetry.altitude);

                    // Converging paths check
                    const d1Speed = 0.5; // Assuming constant speed for this check
                    const d2Speed = 0.5;
                    const d1Target = d1.destination || (d1.patrolPath ? d1.patrolPath[d1.currentPatrolWaypoint!] : d1.position);
                    const d2Target = d2.destination || (d2.patrolPath ? d2.patrolPath[d2.currentPatrolWaypoint!] : d2.position);
                    
                    const vel1 = { x: (d1Target.x - d1.position.x) * d1Speed, y: (d1Target.y - d1.position.y) * d1Speed };
                    const vel2 = { x: (d2Target.x - d2.position.x) * d2Speed, y: (d2Target.y - d2.position.y) * d2Speed };

                    const relVel = { x: vel1.x - vel2.x, y: vel1.y - vel2.y };
                    const relPos = { x: d1.position.x - d2.position.x, y: d1.position.y - d2.position.y };

                    const dotProduct = relPos.x * relVel.x + relPos.y * relVel.y;


                    if (distance < COLLISION_THRESHOLD && altDiff < 10 && dotProduct < 0) {
                        alerts.push([d1.id, d2.id]);
                    }
                }
            }
            setCollisionAlerts(alerts);
        };

        const interval = setInterval(checkCollisions, 1000);
        return () => clearInterval(interval);
    }, [drones]);

    const formattedHistory = useMemo(() => {
        return selectedDrone?.telemetryHistory?.map(h => ({
            name: new Date(h.time).toLocaleTimeString(),
            Signal: h.signal,
            Temp: h.temp,
            Altitude: h.alt,
        })) || [];
    }, [selectedDrone]);

    const groupedDrones = useMemo(() => {
        if (groupBy === 'none') {
            return { 'All Drones': drones };
        }
        return drones.reduce((acc, drone) => {
            const key = groupBy === 'model' ? `Model: ${drone.model}` : `Mission: ${drone.missionType || 'Unassigned'}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(drone);
            return acc;
        }, {} as Record<string, Drone[]>);
    }, [drones, groupBy]);

    const isDispatchable = selectedDrone && [DroneStatus.Idle, DroneStatus.Patrolling].includes(selectedDrone.status);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Drone Fleet Command</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Map View */}
                <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg p-4">
                    <h2 className="text-xl font-semibold mb-4">Live Fleet Map</h2>
                    <div className="relative h-[600px] w-full bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
                        <div className="absolute inset-0 bg-transparent" style={{ backgroundSize: '50px 50px', backgroundImage: 'linear-gradient(to right, #4a556820 1px, transparent 1px), linear-gradient(to bottom, #4a556820 1px, transparent 1px)' }}></div>
                        
                        {/* Selected Drone Patrol Path */}
                        {selectedDrone?.patrolPath && (
                            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                                <polyline
                                    points={selectedDrone.patrolPath.map(p => `${p.x}%,${p.y}%`).join(' ')}
                                    fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5 5"
                                />
                                {selectedDrone.patrolPath.map((p, i) => (
                                    <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r={4} fill={selectedDrone.currentPatrolWaypoint === i ? '#a78bfa' : '#4c1d95'} />
                                ))}
                            </svg>
                        )}
                        
                        {/* Selected Drone Manual Destination Path */}
                        {selectedDrone?.destination && (selectedDrone.status === DroneStatus.InTransit || selectedDrone.status === DroneStatus.Delivering) && (
                            <>
                                <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                                    <line
                                        x1={`${selectedDrone.position.x}%`} y1={`${selectedDrone.position.y}%`}
                                        x2={`${selectedDrone.destination.x}%`} y2={`${selectedDrone.destination.y}%`}
                                        stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 6"
                                    />
                                </svg>
                                <div
                                    className="absolute"
                                    style={{
                                        left: `${selectedDrone.destination.x}%`,
                                        top: `${selectedDrone.destination.y}%`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                >
                                    <MapPin className="h-7 w-7 text-green-400 animate-pulse" />
                                </div>
                            </>
                        )}

                        {/* Drones */}
                        {drones.map(drone => (
                            <div
                                key={drone.id}
                                className={`absolute transition-all duration-200 ease-linear cursor-pointer group`}
                                style={{ left: `${drone.position.x}%`, top: `${drone.position.y}%`, transform: 'translate(-50%, -50%)', zIndex: selectedDrone?.id === drone.id ? 10 : 1 }}
                                onClick={() => setSelectedDrone(drone)}
                            >
                                <Bot className={`h-7 w-7 transition-colors ${selectedDrone?.id === drone.id ? 'text-cyan-300' : 'text-gray-400 group-hover:text-cyan-400'}`} />
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs bg-gray-900/80 px-1 rounded whitespace-nowrap text-white">{drone.id}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Drone List</h2>
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as 'none' | 'model' | 'missionType')}
                                className="bg-gray-700 border border-gray-600 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                            >
                                <option value="none">Group by...</option>
                                <option value="model">Model</option>
                                <option value="missionType">Mission Type</option>
                            </select>
                        </div>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                             {Object.entries(groupedDrones).map(([groupName, dronesInGroup]) => (
                                <React.Fragment key={groupName}>
                                    {groupBy !== 'none' && (
                                        <h3 className="text-xs font-bold text-gray-400 uppercase pt-2 sticky top-0 bg-gray-800 z-10">{groupName}</h3>
                                    )}
                                    {dronesInGroup.map(d => (
                                        <div key={d.id} onClick={() => setSelectedDrone(d)} className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${selectedDrone?.id === d.id ? 'bg-gray-700 border-cyan-500' : 'bg-gray-700/50 border-transparent hover:border-gray-600'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="font-bold text-white">{d.id}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm text-gray-300">{d.battery}%</span>
                                                    <div className="w-16 bg-gray-600 rounded-full h-1.5"><div className={`${getBarColor(d.battery)} h-1.5 rounded-full`} style={{ width: `${d.battery}%` }}></div></div>
                                                </div>
                                            </div>
                                            <div className={getStatusPill(d.status)}>{d.status}</div>
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    {selectedDrone && (
                         <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
                             <h2 className="text-xl font-semibold">{selectedDrone.id} - {selectedDrone.model}</h2>
                             
                             <div className="grid grid-cols-2 gap-3">
                                 <TelemetryCard icon={Battery} label="Battery" value={selectedDrone.battery} unit="%" />
                                 <TelemetryCard icon={HeartPulse} label="Health" value={selectedDrone.health} unit="%" />
                                 <TelemetryCard icon={Signal} label="Signal" value={selectedDrone.telemetry.signalStrength} unit="%" />
                                 <TelemetryCard icon={Thermometer} label="Temp" value={selectedDrone.telemetry.temperature.toFixed(1)} unit="°C" />
                                 <TelemetryCard icon={ArrowUp} label="Altitude" value={selectedDrone.telemetry.altitude} unit="m" />
                                 <TelemetryCard icon={MapPin} label="Position" value={`${selectedDrone.position.x.toFixed(1)}, ${selectedDrone.position.y.toFixed(1)}`} unit="" />
                             </div>

                            <div>
                                {selectedDrone.missionType === 'Patrol' && (
                                    <button onClick={handleOptimizeRoute} disabled={isOptimizing} className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50">
                                        {isOptimizing ? <Loader2 className="h-5 w-5 mr-2 animate-spin"/> : <Sparkles className="h-5 w-5 mr-2" />} Optimize Patrol Route
                                    </button>
                                )}
                                <button onClick={handleFetchInfo} disabled={isFetchingInfo} className="w-full flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 mt-2">
                                    {isFetchingInfo ? <Loader2 className="h-5 w-5 mr-2 animate-spin"/> : <Info className="h-5 w-5 mr-2" />} Get Situational Info
                                </button>
                                
                                <div className="mt-4 p-3 bg-gray-700/50 rounded-lg space-y-2">
                                     <h4 className="text-sm font-semibold text-gray-300">Manual Control</h4>
                                     <div className="flex items-center gap-2">
                                         <input type="text" value={manualDest.x} onChange={e => setManualDest({...manualDest, x: e.target.value})} placeholder="X" className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-center disabled:opacity-50" disabled={!isDispatchable} />
                                         <input type="text" value={manualDest.y} onChange={e => setManualDest({...manualDest, y: e.target.value})} placeholder="Y" className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-center disabled:opacity-50" disabled={!isDispatchable} />
                                         <button onClick={handleSetManualDestination} className="p-2 bg-green-600 hover:bg-green-700 rounded disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={!isDispatchable} title="Dispatch Drone">
                                             <Send className="h-4 w-4"/>
                                         </button>
                                     </div>
                                     {!isDispatchable && <p className="text-xs text-gray-500 text-center">Drone must be Idle or Patrolling to dispatch.</p>}
                                </div>
                            </div>
                         </div>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Telemetry History for {selectedDrone?.id}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={formattedHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                            <XAxis dataKey="name" stroke="#a0aec0" fontSize={12} />
                            <YAxis stroke="#a0aec0" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }} />
                            <Legend />
                            <Line type="monotone" dataKey="Signal" stroke="#0ea5e9" yAxisId={0} />
                            <Line type="monotone" dataKey="Altitude" stroke="#8b5cf6" yAxisId={0} />
                            <Line type="monotone" dataKey="Temp" stroke="#f59e0b" yAxisId={0} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                     <h2 className="text-xl font-semibold mb-4">Situational Awareness</h2>
                     {isFetchingInfo && <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>}
                     {situationalInfo ? (
                        <div className="text-gray-300 text-sm whitespace-pre-wrap h-[300px] overflow-y-auto pr-2">{situationalInfo.text}</div>
                     ) : !isFetchingInfo && (
                        <div className="text-gray-500 h-full flex items-center justify-center">Select a drone and click "Get Situational Info".</div>
                     )}
                </div>
            </div>

            {(collisionAlerts.length > 0 || drones.some(d => d.battery < LOW_BATTERY_THRESHOLD)) && (
                <div>
                     <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center"><Siren className="h-6 w-6 mr-3"/>Active Alerts</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {collisionAlerts.map((pair, index) => (
                             <div key={index} className="bg-yellow-900/50 border border-yellow-600 text-yellow-300 p-4 rounded-lg flex items-center">
                                <AlertTriangle className="h-6 w-6 mr-3"/>
                                <div>
                                    <p className="font-bold">Collision Warning</p>
                                    <p className="text-sm">Drones {pair[0]} and {pair[1]} are converging.</p>
                                </div>
                            </div>
                         ))}
                         {drones.filter(d => d.battery < LOW_BATTERY_THRESHOLD && d.status !== DroneStatus.Charging).map(d => (
                              <div key={d.id} className="bg-red-900/50 border border-red-600 text-red-300 p-4 rounded-lg flex items-center">
                                <Battery className="h-6 w-6 mr-3"/>
                                <div>
                                    <p className="font-bold">Low Battery</p>
                                    <p className="text-sm">Drone {d.id} at {d.battery.toFixed(0)}%. Returning to base.</p>
                                </div>
                            </div>
                         ))}
                     </div>
                </div>
            )}
        </div>
    );
};

export default Drones;
