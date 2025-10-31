import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Warehouse, CheckCircle } from 'lucide-react';

// Enhanced data structure for dynamic shipments
interface Shipment {
  id: string;
  orderId: string;
  customerName: string;
  startPoint: { x: number; y: number; name: string };
  endPoint: { x: number; y: number; name: string };
  currentPosition: { x: number; y: number };
  progress: number; // 0-100
  eta: number; // minutes
}

const initialShipments: Shipment[] = [
  {
    id: 'SHP-001',
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
    startPoint: { x: 10, y: 15, name: 'Aether-Hub West' },
    endPoint: { x: 75, y: 30, name: 'Metropolis, NY' },
    currentPosition: { x: 10, y: 15 },
    progress: 0,
    eta: 120,
  },
  {
    id: 'SHP-002',
    orderId: 'ORD-007',
    customerName: 'Michael Miller',
    startPoint: { x: 85, y: 80, name: 'Aether-Hub South' },
    endPoint: { x: 20, y: 55, name: 'National City, TX' },
    currentPosition: { x: 85, y: 80 },
    progress: 0,
    eta: 180,
  },
  {
    id: 'SHP-003',
    orderId: 'ORD-011',
    customerName: 'Sarah Lee',
    startPoint: { x: 10, y: 15, name: 'Aether-Hub West' },
    endPoint: { x: 90, y: 60, name: 'Star Labs, CA' },
    currentPosition: { x: 10, y: 15 },
    progress: 0,
    eta: 240,
  },
];


const Shipping: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setShipments(prevShipments =>
        prevShipments.map(shipment => {
          if (shipment.progress >= 100) return shipment;

          const newProgress = Math.min(100, shipment.progress + 0.2);
          
          const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

          const currentX = lerp(shipment.startPoint.x, shipment.endPoint.x, newProgress / 100);
          const currentY = lerp(shipment.startPoint.y, shipment.endPoint.y, newProgress / 100);
          
          const remainingEta = Math.max(0, shipment.eta * (1 - newProgress / 100));

          return {
            ...shipment,
            progress: newProgress,
            currentPosition: { x: currentX, y: currentY },
            eta: remainingEta
          };
        })
      );
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  const hubs = [
      { x: 10, y: 15, name: 'Aether-Hub West' },
      { x: 85, y: 80, name: 'Aether-Hub South' }
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Live Logistics Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Shipment Map</h2>
          <div className="relative h-[600px] w-full bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
            {/* Map Grid Background */}
            <div className="absolute inset-0 bg-transparent" style={{ backgroundSize: '50px 50px', backgroundImage: 'linear-gradient(to right, #4a556820 1px, transparent 1px), linear-gradient(to bottom, #4a556820 1px, transparent 1px)' }}></div>

            {/* Hubs */}
            {hubs.map(hub => (
                <div key={hub.name} className="absolute" style={{ left: `${hub.x}%`, top: `${hub.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <Warehouse className="h-8 w-8 text-purple-400" />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">{hub.name}</span>
                </div>
            ))}

            {/* Selected Shipment Route */}
            {selectedShipment && (
                 <>
                    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                       <line 
                           x1={`${selectedShipment.startPoint.x}%`} y1={`${selectedShipment.startPoint.y}%`}
                           x2={`${selectedShipment.endPoint.x}%`} y2={`${selectedShipment.endPoint.y}%`}
                           stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 5"
                       />
                    </svg>
                    <div className="absolute" style={{ left: `${selectedShipment.endPoint.x}%`, top: `${selectedShipment.endPoint.y}%`, transform: 'translate(-50%, -50%)' }}>
                       <MapPin className="h-8 w-8 text-green-400 animate-pulse" />
                       <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-300 whitespace-nowrap">{selectedShipment.endPoint.name}</span>
                    </div>
                </>
            )}

            {/* Shipments */}
            {shipments.map(shipment => (
              <div
                key={shipment.id}
                className={`absolute transition-all duration-100 ease-linear cursor-pointer`}
                style={{
                  left: `${shipment.currentPosition.x}%`,
                  top: `${shipment.currentPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: selectedShipment?.id === shipment.id ? 10 : 1,
                }}
                onClick={() => setSelectedShipment(shipment)}
              >
                <Truck className={`h-7 w-7 transition-colors ${selectedShipment?.id === shipment.id ? 'text-cyan-300' : 'text-cyan-500 hover:text-cyan-300'}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Tracking Details</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {shipments.map(s => (
                <div key={s.id}
                  className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${selectedShipment?.id === s.id ? 'bg-gray-700 border-cyan-500' : 'bg-gray-700/50 border-transparent hover:border-gray-600'}`}
                  onClick={() => setSelectedShipment(s)}
                >
                    <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-white">{s.orderId}</p>
                        <p className="text-sm text-gray-300">{s.customerName}</p>
                    </div>
                    
                    <div className="w-full bg-gray-600 rounded-full h-2.5 mb-2">
                        <div className="bg-cyan-500 h-2.5 rounded-full" style={{width: `${s.progress}%`}}></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center text-gray-400">
                             {s.progress < 100 ? (
                                <>
                                 <Truck className="h-4 w-4 mr-2" /> In-Transit
                                </>
                            ) : (
                                <>
                                 <CheckCircle className="h-4 w-4 mr-2 text-green-400" /> Delivered
                                </>
                            )}
                        </div>
                         <div className="text-right text-cyan-400 font-semibold">
                            {s.progress < 100 ? `ETA: ${Math.ceil(s.eta)} min` : 'Completed'}
                        </div>
                    </div>

                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shipping;