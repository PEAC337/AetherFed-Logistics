import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Package, Users, Truck, Loader2, Link as LinkIcon, Newspaper } from 'lucide-react';
import { getGroundedNews } from '../services/geminiService';

const salesData = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 5000 },
  { name: 'Apr', sales: 4500 },
  { name: 'May', sales: 6000 },
  { name: 'Jun', sales: 5500 },
];

const orderStatusData = [
  { name: 'Delivered', value: 400 },
  { name: 'Shipped', value: 150 },
  { name: 'Processing', value: 80 },
  { name: 'Pending', value: 50 },
];

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];

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

const NewsPanel: React.FC = () => {
    const [news, setNews] = useState<{ text: string; groundingChunks: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            const result = await getGroundedNews("Summarize the top 3 latest news headlines and breakthroughs in the drone logistics and autonomous delivery industry.");
            setNews(result);
            setIsLoading(false);
        };
        fetchNews();
    }, []);

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center"><Newspaper className="h-6 w-6 mr-3 text-cyan-400"/>Industry News & Updates</h2>
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
            ) : news ? (
                <div className="space-y-4">
                    <p className="text-gray-300 whitespace-pre-wrap text-sm">{news.text}</p>
                    {news.groundingChunks.length > 0 && (
                        <div className="pt-3 border-t border-gray-700">
                             <h3 className="text-xs font-bold text-gray-400 mb-2">SOURCES:</h3>
                             <div className="flex flex-col space-y-2">
                                {news.groundingChunks.map((chunk, index) => chunk.web && (
                                    <a href={chunk.web.uri} key={index} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline truncate flex items-center gap-1.5">
                                        <LinkIcon className="h-3 w-3 flex-shrink-0" /> {chunk.web.title}
                                    </a>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-gray-500">Could not fetch news at this time.</p>
            )}
        </div>
    );
};


const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" value="$405,231" icon={DollarSign} color="bg-green-500" />
        <MetricCard title="Total Orders" value="12,873" icon={Package} color="bg-blue-500" />
        <MetricCard title="Active Shipments" value="1,204" icon={Truck} color="bg-yellow-500" />
        <MetricCard title="Customers" value="5,432" icon={Users} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Sales Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
              <XAxis dataKey="name" stroke="#a0aec0" />
              <YAxis stroke="#a0aec0" />
              <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }} />
              <Legend />
              <Bar dataKey="sales" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Order Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {orderStatusData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <NewsPanel />
    </div>
  );
};

export default Dashboard;