import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Drone, MaintenanceEvent } from '../types';
import { MaintenanceStatus, MaintenanceType, DroneStatus } from '../types';
import { Wrench, PlusCircle, Bot, HeartPulse, Clock, Calendar } from 'lucide-react';

// Mock Data - In a real app, this would come from an API
const initialDrones: Omit<Drone, 'position' | 'telemetry' | 'estimatedFlightTime' | 'payload' | 'orderId' | 'currentPatrolWaypoint' | 'patrolPath' | 'destination' | 'telemetryHistory'>[] = Array.from({ length: 10 }, (_, i) => {
    const flightHours = Math.floor(Math.random() * 200) + 50;
    const isPatrol = i % 3 === 1;
    return {
        id: `AEX-${700 + i}`,
        model: isPatrol ? 'Vigilance Eagle' : (i % 3 === 0 ? 'HeavyLift V2' : 'SkyHopper Pro'),
        status: DroneStatus.Idle,
        battery: 100,
        health: 100 - Math.floor(flightHours / 20),
        missionType: isPatrol ? 'Patrol' : 'Delivery',
        flightHours,
        nextMaintenance: `2024-${new Date().getMonth() + 2}-15`,
    };
});

const mockMaintenanceData: MaintenanceEvent[] = [
    { id: 'MAINT-001', droneId: 'AEX-703', scheduledDate: '2024-07-20', type: MaintenanceType.Routine, status: MaintenanceStatus.Completed, notes: 'All systems green.' },
    { id: 'MAINT-002', droneId: 'AEX-705', scheduledDate: '2024-08-05', type: MaintenanceType.Repair, status: MaintenanceStatus.Scheduled, notes: 'Rotor blade replacement required.' },
    { id: 'MAINT-003', droneId: 'AEX-701', scheduledDate: '2024-08-10', type: MaintenanceType.Software, status: MaintenanceStatus.Scheduled, notes: 'Firmware update v3.1.2.' },
];

const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
        case MaintenanceStatus.Completed: return 'bg-green-500 text-green-900';
        case MaintenanceStatus.InProgress: return 'bg-yellow-500 text-yellow-900';
        case MaintenanceStatus.Scheduled: return 'bg-blue-500 text-blue-900';
        default: return 'bg-gray-500 text-gray-900';
    }
};

const getHealthColor = (health: number) => {
    if (health > 80) return 'bg-green-500';
    if (health > 50) return 'bg-yellow-500';
    return 'bg-red-500';
};

const Maintenance: React.FC = () => {
    const [drones] = useState(initialDrones);
    const [schedule, setSchedule] = useState<MaintenanceEvent[]>(mockMaintenanceData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState<Partial<MaintenanceEvent>>({
        droneId: '',
        type: MaintenanceType.Routine,
        scheduledDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const topDronesByFlightHours = useMemo(() => {
        return [...drones]
            .sort((a, b) => b.flightHours - a.flightHours)
            .slice(0, 5);
    }, [drones]);

    const handleScheduleEvent = (e: React.FormEvent) => {
        e.preventDefault();
        const finalEvent: MaintenanceEvent = {
            id: `MAINT-${String(schedule.length + 1).padStart(3, '0')}`,
            status: MaintenanceStatus.Scheduled,
            ...newEvent
        } as MaintenanceEvent;
        setSchedule([...schedule, finalEvent]);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Maintenance Hub</h1>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Schedule Maintenance
                </button>
            </div>

            {/* Drone Health Overview */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Fleet Health Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {drones.map(drone => (
                        <div key={drone.id} className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <p className="font-bold text-white">{drone.id}</p>
                                <p className="text-sm text-gray-400">{drone.model}</p>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 flex items-center"><HeartPulse className="h-4 w-4 mr-2 text-rose-400"/>Health</span>
                                    <span className="font-semibold">{drone.health}%</span>
                                </div>
                                <div className="w-full bg-gray-600 rounded-full h-2"><div className={`${getHealthColor(drone.health)} h-2 rounded-full`} style={{width: `${drone.health}%`}}></div></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 flex items-center"><Clock className="h-4 w-4 mr-2 text-cyan-400"/>Flight Hours</span>
                                    <span className="font-semibold">{drone.flightHours.toFixed(1)} hrs</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 flex items-center"><Calendar className="h-4 w-4 mr-2 text-purple-400"/>Next Service</span>
                                    <span className="font-semibold">{drone.nextMaintenance}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Flight Hours Chart */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Top 5 Drones by Flight Hours</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topDronesByFlightHours} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                        <XAxis dataKey="id" stroke="#a0aec0" />
                        <YAxis stroke="#a0aec0" />
                        <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }} />
                        <Legend />
                        <Bar dataKey="flightHours" name="Flight Hours" fill="#06b6d4" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Maintenance Schedule Table */}
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Scheduled Events</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Event ID</th>
                                <th className="p-4 font-semibold">Drone ID</th>
                                <th className="p-4 font-semibold">Scheduled Date</th>
                                <th className="p-4 font-semibold">Type</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedule.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).map(event => (
                                <tr key={event.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 font-mono text-cyan-400">{event.id}</td>
                                    <td className="p-4">{event.droneId}</td>
                                    <td className="p-4">{event.scheduledDate}</td>
                                    <td className="p-4">{event.type}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(event.status)}`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-300">{event.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Schedule Maintenance Modal */}
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">Schedule New Maintenance Event</h2>
                        <form onSubmit={handleScheduleEvent} className="space-y-4">
                            <div>
                                <label htmlFor="droneId" className="block text-sm font-medium text-gray-300 mb-1">Select Drone</label>
                                <select id="droneId" value={newEvent.droneId} onChange={e => setNewEvent({...newEvent, droneId: e.target.value})} required className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white">
                                    <option value="" disabled>-- Choose a drone --</option>
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.id} ({d.model})</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Maintenance Type</label>
                                <select id="type" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as MaintenanceType})} required className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white">
                                    {Object.values(MaintenanceType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">Scheduled Date</label>
                                <input type="date" id="date" value={newEvent.scheduledDate} onChange={e => setNewEvent({...newEvent, scheduledDate: e.target.value})} required className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"/>
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">Notes / Description</label>
                                <textarea id="notes" value={newEvent.notes} onChange={e => setNewEvent({...newEvent, notes: e.target.value})} rows={3} required className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white" placeholder="e.g., Annual sensor calibration"></textarea>
                            </div>
                             <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors">Cancel</button>
                                <button type="submit" className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors">Schedule Event</button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default Maintenance;