import React, { useState, Fragment } from 'react';
import type { Order } from '../types';
import { OrderStatus } from '../types';
import { PlusCircle, Search, ChevronDown, ShoppingCart, Truck, History } from 'lucide-react';

const mockOrders: Order[] = [
  { 
    id: 'ORD-001', customerName: 'John Doe', date: '2023-10-27', status: OrderStatus.Delivered, total: 250.00,
    items: [
      { sku: 'AEX-DRN-01', name: 'SkyHopper Pro Drone', quantity: 1, price: 200.00 },
      { sku: 'AEX-BAT-02', name: 'Extra Battery Pack', quantity: 2, price: 25.00 },
    ],
    shippingDetails: { address: '123 Maple St, Springfield, IL', carrier: 'Aether-Drone', trackingNumber: 'ADRONE123456789' },
    history: [
      { status: OrderStatus.Delivered, date: '2023-10-27 14:30' },
      { status: OrderStatus.Shipped, date: '2023-10-27 09:00' },
      { status: OrderStatus.Processing, date: '2023-10-26 18:00' },
      { status: OrderStatus.Pending, date: '2023-10-26 15:45' },
    ]
  },
  { 
    id: 'ORD-002', customerName: 'Jane Smith', date: '2023-10-26', status: OrderStatus.Shipped, total: 150.50,
    items: [ { sku: 'AEX-PRP-04', name: 'Stealth Propellers (Set of 4)', quantity: 2, price: 75.25 } ],
    shippingDetails: { address: '456 Oak Ave, Metropolis, NY', carrier: 'FedEx', trackingNumber: 'FX987654321' },
    history: [
      { status: OrderStatus.Shipped, date: '2023-10-26 11:00' },
      { status: OrderStatus.Processing, date: '2023-10-25 16:20' },
      { status: OrderStatus.Pending, date: '2023-10-25 14:00' },
    ]
  },
  { 
    id: 'ORD-003', customerName: 'Sam Wilson', date: '2023-10-26', status: OrderStatus.Processing, total: 75.00,
    items: [ { sku: 'AEX-CAM-03', name: '4K Gimbal Camera', quantity: 1, price: 75.00 } ],
    shippingDetails: { address: '789 Pine Ln, Gotham, NJ', carrier: 'UPS', trackingNumber: 'UPS555444333' },
    history: [
      { status: OrderStatus.Processing, date: '2023-10-26 10:00' },
      { status: OrderStatus.Pending, date: '2023-10-26 09:15' },
    ]
  },
  { 
    id: 'ORD-004', customerName: 'Alice Johnson', date: '2023-10-25', status: OrderStatus.Pending, total: 320.00, 
    items: [
      { sku: 'AEX-DRN-02', name: 'HeavyLift V2', quantity: 1, price: 300.00 },
      { sku: 'AEX-CAS-01', name: 'Hard Shell Case', quantity: 1, price: 20.00 },
    ],
    shippingDetails: { address: '101 Elm St, Star City, CA', carrier: 'Aether-Drone', trackingNumber: 'ADRONE99887766' },
    history: [
      { status: OrderStatus.Pending, date: '2023-10-25 12:00' },
    ]
  },
  { 
    id: 'ORD-005', customerName: 'Robert Brown', date: '2023-10-24', status: OrderStatus.Cancelled, total: 50.00, 
    items: [ { sku: 'AEX-BAT-02', name: 'Extra Battery Pack', quantity: 2, price: 25.00 } ],
    shippingDetails: { address: '212 Birch Rd, Central City, MO', carrier: 'N/A', trackingNumber: 'N/A' },
    history: [
      { status: OrderStatus.Cancelled, date: '2023-10-24 11:00', notes: 'Customer request.' },
      { status: OrderStatus.Pending, date: '2023-10-24 10:30' },
    ]
  },
  // Adding more mock orders to make pagination useful
  { 
    id: 'ORD-006', customerName: 'Emily Davis', date: '2023-10-23', status: OrderStatus.Delivered, total: 120.00,
    items: [ { sku: 'AEX-CAM-03', name: '4K Gimbal Camera', quantity: 1, price: 75.00 }, { sku: 'AEX-CAS-01', name: 'Hard Shell Case', quantity: 1, price: 45.00 }],
    shippingDetails: { address: '333 Cedar Blvd, Coast City, FL', carrier: 'Aether-Drone', trackingNumber: 'ADRONE11223344' },
    history: [ { status: OrderStatus.Delivered, date: '2023-10-23 13:00' }, { status: OrderStatus.Shipped, date: '2023-10-23 09:00' }, { status: OrderStatus.Pending, date: '2023-10-22 10:00' } ]
  },
  { 
    id: 'ORD-007', customerName: 'Michael Miller', date: '2023-10-22', status: OrderStatus.Shipped, total: 89.99,
    items: [ { sku: 'AEX-PRP-04', name: 'Stealth Propellers (Set of 4)', quantity: 1, price: 89.99 } ],
    shippingDetails: { address: '444 Spruce Way, National City, TX', carrier: 'DHL', trackingNumber: 'DHL789012345' },
    history: [ { status: OrderStatus.Shipped, date: '2023-10-22 15:00' }, { status: OrderStatus.Pending, date: '2023-10-22 11:00' } ]
  },
];

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.Delivered: return 'bg-green-500 text-green-900';
    case OrderStatus.Shipped: return 'bg-blue-500 text-blue-900';
    case OrderStatus.Processing: return 'bg-yellow-500 text-yellow-900';
    case OrderStatus.Pending: return 'bg-orange-500 text-orange-900';
    case OrderStatus.Cancelled: return 'bg-red-500 text-red-900';
    default: return 'bg-gray-500 text-gray-900';
  }
};

const ITEMS_PER_PAGE = 5;

const ExpandedRow: React.FC<{ order: Order }> = ({ order }) => (
    <tr className="bg-gray-700/50">
        <td colSpan={6} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Order Items */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-white flex items-center"><ShoppingCart className="h-5 w-5 mr-2 text-cyan-400" />Order Items</h4>
                    <ul className="space-y-2 text-sm">
                        {order.items.map(item => (
                            <li key={item.sku} className="flex justify-between p-2 bg-gray-600/50 rounded-md">
                                <span>{item.name} (x{item.quantity})</span>
                                <span className="font-mono text-gray-300">${(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Shipping Details */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-white flex items-center"><Truck className="h-5 w-5 mr-2 text-cyan-400" />Shipping Details</h4>
                    <div className="text-sm space-y-1 text-gray-300">
                        <p>{order.shippingDetails.address}</p>
                        <p><strong>Carrier:</strong> {order.shippingDetails.carrier}</p>
                        <p><strong>Tracking:</strong> <span className="font-mono text-cyan-300">{order.shippingDetails.trackingNumber}</span></p>
                    </div>
                </div>
                
                {/* Order History */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-white flex items-center"><History className="h-5 w-5 mr-2 text-cyan-400" />Order History</h4>
                     <ul className="space-y-2 text-sm">
                        {order.history.map((h, index) => (
                             <li key={index} className="flex items-start">
                                 <div className="flex flex-col items-center mr-3">
                                     <div className={`w-3 h-3 rounded-full ${index === 0 ? getStatusColor(h.status).split(' ')[0] : 'bg-gray-500'}`}></div>
                                     {index < order.history.length -1 && <div className="w-0.5 flex-grow bg-gray-500"></div>}
                                 </div>
                                 <div>
                                     <p className="font-semibold">{h.status}</p>
                                     <p className="text-xs text-gray-400">{h.date}</p>
                                 </div>
                             </li>
                        ))}
                    </ul>
                </div>
            </div>
        </td>
    </tr>
);

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const toggleRow = (orderId: string) => {
    setExpandedOrderId(prevId => (prevId === orderId ? null : orderId));
  };
  
  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Orders</h1>
        <button className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors">
          <PlusCircle className="h-5 w-5 mr-2" />
          New Order
        </button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by Order ID or Customer..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.length > 0 ? currentOrders.map(order => (
                <Fragment key={order.id}>
                    <tr 
                        className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => toggleRow(order.id)}
                    >
                      <td className="p-4 font-mono text-cyan-400 flex items-center">
                        <ChevronDown className={`h-4 w-4 mr-2 transform transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                        {order.id}
                      </td>
                      <td className="p-4">{order.customerName}</td>
                      <td className="p-4">{order.date}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td className="p-4 text-right font-medium">${order.total.toFixed(2)}</td>
                    </tr>
                    {expandedOrderId === order.id && <ExpandedRow order={order} />}
                </Fragment>
              )) : (
                 <tr>
                    <td colSpan={6} className="text-center p-8 text-gray-400">
                        No orders found.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-400">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-300 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
