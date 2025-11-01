import React, { useState } from 'react';
import type { InvoiceItem } from '../types';
import { InvoiceStatus } from '../types';
import { DollarSign, FileText, Bot, CreditCard, Copy, Check, Landmark } from 'lucide-react';

const mockBillingData: InvoiceItem[] = [
    {
        invoiceId: 'INV-2023-1001',
        date: '2023-10-28',
        serviceDescription: 'S.O.A.P. Drone Patrol Dispatch',
        droneId: 'AEX-701',
        durationHours: 4.5,
        rate: 150.00,
        amount: 675.00,
        status: InvoiceStatus.Paid,
    },
    {
        invoiceId: 'INV-2023-1002',
        date: '2023-10-29',
        serviceDescription: 'Emergency Geofence Breach Response',
        droneId: 'AEX-704',
        durationHours: 1.0,
        rate: 250.00,
        amount: 250.00,
        status: InvoiceStatus.Due,
    },
    {
        invoiceId: 'INV-2023-1003',
        date: '2023-10-30',
        serviceDescription: 'Agency Notification Escalation Fee',
        droneId: 'AEX-704',
        amount: 50.00,
        status: InvoiceStatus.Due,
    },
    {
        invoiceId: 'INV-2023-0905',
        date: '2023-09-15',
        serviceDescription: 'Scheduled Perimeter Surveillance',
        droneId: 'AEX-707',
        durationHours: 8.0,
        rate: 120.00,
        amount: 960.00,
        status: InvoiceStatus.Overdue,
    },
     {
        invoiceId: 'INV-2023-1004',
        date: '2023-10-31',
        serviceDescription: 'S.O.A.P. Drone Patrol Dispatch',
        droneId: 'AEX-710',
        durationHours: 6.0,
        rate: 150.00,
        amount: 900.00,
        status: InvoiceStatus.Due,
    },
];

const getStatusColor = (status: InvoiceStatus) => {
  switch (status) {
    case InvoiceStatus.Paid: return 'bg-green-500 text-green-900';
    case InvoiceStatus.Due: return 'bg-yellow-500 text-yellow-900';
    case InvoiceStatus.Overdue: return 'bg-red-500 text-red-900';
    default: return 'bg-gray-500 text-gray-900';
  }
};

const MetricCard: React.FC<{ title: string; value: string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center">
    <div className={`p-3 rounded-full mr-4 ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const AccountingPlatform: React.FC<{ name: string, accountNumber: string, routingNumber: string, icon: React.ElementType }> = ({ name, accountNumber, routingNumber, icon: Icon }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(accountNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
                <Icon className="h-8 w-8 mr-3 text-cyan-400"/>
                <div>
                    <p className="font-semibold text-white">{name}</p>
                    <p className="text-xs text-gray-400 font-mono">
                        Acct: {accountNumber} | Rout: {routingNumber}
                    </p>
                </div>
            </div>
            <button onClick={handleCopy} className="p-2 rounded-md hover:bg-gray-600 transition-colors" title="Copy Account Number">
                {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 text-gray-400" />}
            </button>
        </div>
    );
};

const WalletAddress: React.FC<{ name: string, address: string, iconUrl: string }> = ({ name, address, iconUrl }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
                <img src={iconUrl} alt={`${name} logo`} className="h-8 w-8 mr-3"/>
                <div>
                    <p className="font-semibold text-white">{name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{address}</p>
                </div>
            </div>
            <button onClick={handleCopy} className="p-2 rounded-md hover:bg-gray-600 transition-colors">
                {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 text-gray-400" />}
            </button>
        </div>
    );
};


const Billing: React.FC = () => {
    const balanceDue = mockBillingData
        .filter(item => item.status === InvoiceStatus.Due || item.status === InvoiceStatus.Overdue)
        .reduce((sum, item) => sum + item.amount, 0);
    
    const billedThisMonth = mockBillingData
        .filter(item => new Date(item.date).getMonth() === new Date().getMonth())
        .reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Billing & Payments</h1>
                <button className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Make a Payment
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard title="Current Balance Due" value={`$${balanceDue.toFixed(2)}`} icon={DollarSign} color="bg-red-500" />
                <MetricCard title="Total Billed This Month" value={`$${billedThisMonth.toFixed(2)}`} icon={FileText} color="bg-blue-500" />
                <MetricCard title="Active Billable Services" value="2" icon={Bot} color="bg-yellow-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-700">
                        <h2 className="text-xl font-semibold">Invoice History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="p-4 font-semibold">Invoice ID</th>
                                    <th className="p-4 font-semibold">Date</th>
                                    <th className="p-4 font-semibold">Service Description</th>
                                    <th className="p-4 font-semibold">Drone ID</th>
                                    <th className="p-4 font-semibold">Duration/Units</th>
                                    <th className="p-4 font-semibold">Rate</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockBillingData.map(item => (
                                    <tr key={item.invoiceId} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4 font-mono text-cyan-400">{item.invoiceId}</td>
                                        <td className="p-4">{item.date}</td>
                                        <td className="p-4">{item.serviceDescription}</td>
                                        <td className="p-4">{item.droneId || 'N/A'}</td>
                                        <td className="p-4">{item.durationHours ? `${item.durationHours.toFixed(1)} hrs` : '1 unit'}</td>
                                        <td className="p-4">{item.rate ? `$${item.rate.toFixed(2)}/hr` : 'N/A'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium">${item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
                    <h2 className="text-xl font-semibold">Payment Configuration & Settlement</h2>
                    <p className="text-sm text-gray-400">Use the details below for service payment settlements.</p>
                    <div className="space-y-3">
                        <AccountingPlatform 
                            name="AetherFed Consolidated Banking"
                            accountNumber="9876543210"
                            routingNumber="012345678"
                            icon={Landmark}
                        />
                        <WalletAddress 
                            name="Bitcoin (BTC)"
                            address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
                            iconUrl="https://img.icons8.com/color/48/bitcoin--v1.png"
                        />
                         <WalletAddress 
                            name="Ethereum (ETH)"
                            address="0x12B3E63a9A2a9a4A3d4E5f6D8A9c8B7f6A5d4c3b"
                            iconUrl="https://img.icons8.com/color/48/ethereum.png"
                        />
                    </div>
                     <p className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                        Please ensure you are sending the correct currency to the specified address. Cryptocurrency transactions are irreversible.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Billing;