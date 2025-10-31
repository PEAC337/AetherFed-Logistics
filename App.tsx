import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Shipping from './components/Shipping';
import Drones from './components/Drones';
import Feedback from './components/Feedback';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import Billing from './components/Billing';
import Maintenance from './components/Maintenance';

export type ViewType = 'dashboard' | 'orders' | 'shipping' | 'drones' | 'feedback' | 'imageGenerator' | 'imageEditor' | 'billing' | 'maintenance';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <Orders />;
      case 'shipping':
        return <Shipping />;
      case 'drones':
        return <Drones />;
      case 'feedback':
        return <Feedback />;
      case 'imageGenerator':
        return <ImageGenerator />;
      case 'imageEditor':
        return <ImageEditor />;
      case 'billing':
        return <Billing />;
      case 'maintenance':
        return <Maintenance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-gray-900">
          {renderView()}
        </div>
        <footer className="text-center p-4 text-xs text-gray-500 border-t border-gray-700">
          Copyright © {new Date().getFullYear()} AetherFlow Logistics. All Rights Reserved.
        </footer>
      </main>
    </div>
  );
};

export default App;