import React from 'react';
import type { ViewType } from '../App';
import { Home, Package, Truck, Bot, MessageSquare, Image, CreditCard, Wrench, Wand2 } from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'drones', label: 'Drone Fleet', icon: Bot },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'imageGenerator', label: 'Image Studio', icon: Image },
    { id: 'imageEditor', label: 'Image Editor', icon: Wand2 },
  ] as const;

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="flex items-center justify-center h-20 border-b border-gray-700">
        <Bot className="h-8 w-8 text-cyan-400" />
        <h1 className="text-xl font-bold ml-2 text-white">AetherFlow</h1>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center w-full px-4 py-3 my-1 text-left rounded-lg transition-colors duration-200 ${
                  currentView === item.id
                    ? 'bg-cyan-500 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;