import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Fuel,
  BarChart3,
  Users,
  Camera,
  LogOut,
  Globe,
  Lock,
  Menu,
  X,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

import { User, OrderEntry, FuelEntry, LanguageCode } from './types';
import { LANGUAGES, getTranslation } from './utils/i18n';
import { getCurrentDate } from './utils/timeCalculations';

import { OrdersView } from './components/OrdersView';
import { ScanCaptureModal } from './components/ScanCaptureModal';
import { OrderFormModal } from './components/OrderFormModal';
import { ReportView } from './components/ReportView';
import { FuelView } from './components/FuelView';
import { EmployeesView } from './components/EmployeesView';

// Storage keys
const LS_ORDERS = 'keeta_v2_orders';
const LS_FUEL = 'keeta_v2_fuel';
const LS_USERS = 'keeta_v2_users';
const LS_SESSION = 'keeta_v2_session';
const LS_PRICE = 'keeta_v2_fuel_price';
const LS_LANG = 'keeta_v2_lang';

// Default sample initial data matching user screenshot
const INITIAL_USERS: User[] = [
  {
    id: 'u-admin-1',
    empNo: 'EMP-001',
    name: 'Administrator',
    role: 'admin',
    username: 'admin',
    salt: 'salt1',
    hash: 'admin123',
    active: true,
    iqama: '2456789101',
    iqamaExp: '2027-12-31',
    nation: 'Saudi Arabia',
    phone: '+966500000000',
    plate: 'KTA 1079',
    vtype: 'motorcycle',
    allowance: 500,
    joined: '2025-01-01',
    createdAt: Date.now(),
  },
  {
    id: 'u-rider-1',
    empNo: 'EMP-002',
    name: 'Ahmed Al-Rider',
    role: 'user',
    username: 'ahmed',
    salt: 'salt2',
    hash: 'rider123',
    active: true,
    iqama: '2398765432',
    iqamaExp: '2026-11-30',
    nation: 'Saudi Arabia',
    phone: '+966551234567',
    plate: 'RHD 4410',
    vtype: 'motorcycle',
    allowance: 350,
    joined: '2025-03-15',
    createdAt: Date.now(),
  },
];

const INITIAL_ORDERS: OrderEntry[] = [
  {
    id: 'ord-sample-1',
    createdAt: Date.now() - 3600000,
    employeeId: 'u-admin-1',
    date: getCurrentDate(),
    orderNo: '1079', // Extracted strictly last 4 digits from 5736823099441079
    fullOrderNo: '5736823099441079',
    orderAccepted: '11:22',
    arrivedAtStore: '11:22',
    orderPickedUp: '11:27',
    atDestination: '11:41',
    arrivedAtCustomer: '11:42',
    expectedDeliveryTime: '11:51',
    acceptToStore: 0,
    storeWait: 5,
    pickupToDelivery: 15,
    destinationToCustomer: 1,
    totalDuration: 20,
    deliveryVsExpected: -9, // 9 min early!
    notes: 'Sample order matching attached screenshot',
  },
];

const INITIAL_FUEL: FuelEntry[] = [
  {
    id: 'fuel-1',
    createdAt: Date.now() - 86400000,
    employeeId: 'u-admin-1',
    date: getCurrentDate(),
    time: '09:15',
    vehicle: 'KTA 1079',
    odo: '0166626',
    amount: 25.0,
    price: 2.18,
    liters: 11.47,
  },
];

export default function App() {
  // State Initialization
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(LS_USERS);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [orders, setOrders] = useState<OrderEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LS_ORDERS);
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [fuel, setFuel] = useState<FuelEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LS_FUEL);
      return saved ? JSON.parse(saved) : INITIAL_FUEL;
    } catch {
      return INITIAL_FUEL;
    }
  });

  const [fuelPrice, setFuelPrice] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LS_PRICE);
      return saved ? parseFloat(saved) : 2.18;
    } catch {
      return 2.18;
    }
  });

  const [lang, setLang] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(LS_LANG);
      return (saved as LanguageCode) || 'en';
    } catch {
      return 'en';
    }
  });

  const [sessionUserId, setSessionUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_SESSION) || 'u-admin-1'; // Default logged in for seamless demo
    } catch {
      return 'u-admin-1';
    }
  });

  const [activeTab, setActiveTab] = useState<'orders' | 'fuel' | 'report' | 'employees'>('orders');

  // Modals
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderEntry | null>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(LS_FUEL, JSON.stringify(fuel));
  }, [fuel]);

  useEffect(() => {
    localStorage.setItem(LS_PRICE, String(fuelPrice));
  }, [fuelPrice]);

  useEffect(() => {
    localStorage.setItem(LS_LANG, lang);
    const langObj = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = langObj?.dir || 'ltr';
  }, [lang]);

  useEffect(() => {
    if (sessionUserId) {
      localStorage.setItem(LS_SESSION, sessionUserId);
    } else {
      localStorage.removeItem(LS_SESSION);
    }
  }, [sessionUserId]);

  const currentUser = users.find((u) => u.id === sessionUserId) || users[0];
  const t = (k: string) => getTranslation(lang, k);

  // Handlers for Orders
  const handleSaveOrder = (orderData: Omit<OrderEntry, 'id' | 'createdAt'>, existingId?: string) => {
    if (existingId) {
      setOrders((prev) =>
        prev.map((o) => (o.id === existingId ? { ...o, ...orderData } : o))
      );
    } else {
      const newEntry: OrderEntry = {
        id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
        ...orderData,
      };
      setOrders((prev) => [newEntry, ...prev]);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
  };

  const handleDeleteAllOrders = () => {
    if (window.confirm('Delete ALL recorded orders from this device? This cannot be undone.')) {
      setOrders([]);
    }
  };

  // Handlers for Fuel
  const handleSaveFuel = (fuelData: Omit<FuelEntry, 'id' | 'createdAt'>, existingId?: string) => {
    if (existingId) {
      setFuel((prev) =>
        prev.map((f) => (f.id === existingId ? { ...f, ...fuelData } : f))
      );
    } else {
      const newEntry: FuelEntry = {
        id: `fuel-${Date.now()}`,
        createdAt: Date.now(),
        ...fuelData,
      };
      setFuel((prev) => [newEntry, ...prev]);
    }
  };

  const handleDeleteFuel = (id: string) => {
    if (window.confirm('Delete this fuel entry?')) {
      setFuel((prev) => prev.filter((f) => f.id !== id));
    }
  };

  // Handlers for Employees
  const handleSaveUser = (userData: Partial<User>, existingId?: string) => {
    if (existingId) {
      setUsers((prev) =>
        prev.map((u) => (u.id === existingId ? { ...u, ...userData } : u))
      );
    } else {
      const nextNo = `EMP-${String(users.length + 1).padStart(3, '0')}`;
      const newUser: User = {
        id: `user-${Date.now()}`,
        empNo: nextNo,
        name: userData.name || '',
        role: userData.role || 'user',
        username: userData.username || '',
        salt: 'salt',
        hash: userData.password || 'password123',
        active: true,
        iqama: userData.iqama || '',
        iqamaExp: userData.iqamaExp || '',
        nation: userData.nation || 'Saudi Arabia',
        phone: userData.phone || '',
        plate: userData.plate || '',
        vtype: userData.vtype || 'motorcycle',
        allowance: userData.allowance || 0,
        joined: getCurrentDate(),
        createdAt: Date.now(),
      };
      setUsers((prev) => [...prev, newUser]);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (users.length <= 1) {
      alert('Cannot delete the last remaining user.');
      return;
    }
    if (window.confirm('Delete this employee account?')) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (sessionUserId === userId) {
        setSessionUserId(users[0]?.id || null);
      }
    }
  };

  // Backup & Restore
  const handleExportBackup = () => {
    const data = {
      app: 'keeta-tracker',
      version: 2,
      exportedAt: new Date().toISOString(),
      orders,
      fuel,
      users,
      fuelPrice,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keeta-backup-${getCurrentDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.orders && Array.isArray(json.orders)) setOrders(json.orders);
        if (json.fuel && Array.isArray(json.fuel)) setFuel(json.fuel);
        if (json.users && Array.isArray(json.users)) setUsers(json.users);
        if (json.fuelPrice) setFuelPrice(Number(json.fuelPrice));
        alert('Backup restored successfully!');
      } catch {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f0] text-[#16181b] flex flex-col font-sans">
      {/* Top Header Navigation - Sticky */}
      <header className="sticky top-0 z-40 bg-[#16181b] text-white shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ffd21f] text-[#16181b] grid place-items-center font-extrabold text-xl shadow-xs">
              K
            </div>
            <div>
              <div className="font-display font-black text-xl tracking-wide flex items-center gap-2">
                <span>KEETA</span>
                <span className="text-[10px] bg-[#ffd21f] text-[#16181b] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Timeline AI
                </span>
              </div>
              <div className="text-[11px] text-gray-400 font-medium">
                {t('app.sub')}
              </div>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#ffd21f] text-[#16181b] shadow-xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('tab.orders')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fuel')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'fuel'
                  ? 'bg-[#ffd21f] text-[#16181b] shadow-xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>{t('tab.fuel')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-[#ffd21f] text-[#16181b] shadow-xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('tab.report')}</span>
            </button>

            {currentUser.role !== 'user' && (
              <button
                type="button"
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'employees'
                    ? 'bg-[#ffd21f] text-[#16181b] shadow-xs'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t('tab.employees')}</span>
              </button>
            )}
          </nav>

          {/* Quick Header Actions: Scan Button & Language & User chip */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#ffd21f] hover:bg-[#ffdb4d] text-[#16181b] font-bold text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">{t('btn.scan')}</span>
            </button>

            {/* Language Picker */}
            <div className="relative flex items-center bg-[#262a2f] rounded-lg px-2 py-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-[#ffd21f] mr-1.5 shrink-0" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#16181b] text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User chip */}
            <div className="hidden sm:flex items-center gap-2 bg-[#262a2f] px-3 py-1.5 rounded-xl">
              <div className="text-right">
                <div className="text-xs font-bold text-white leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-[#ffd21f] uppercase font-mono font-semibold">
                  {currentUser.role}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8">
        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            users={users}
            currentUser={currentUser}
            onOpenScan={() => setIsScanModalOpen(true)}
            onOpenAdd={() => {
              setEditingOrder(null);
              setIsOrderModalOpen(true);
            }}
            onEditOrder={(order) => {
              setEditingOrder(order);
              setIsOrderModalOpen(true);
            }}
            onDeleteOrder={handleDeleteOrder}
            onDeleteAllOrders={currentUser.role === 'admin' ? handleDeleteAllOrders : undefined}
            lang={lang}
          />
        )}

        {activeTab === 'fuel' && (
          <FuelView
            fuel={fuel}
            users={users}
            currentUser={currentUser}
            fuelPrice={fuelPrice}
            onSaveFuel={handleSaveFuel}
            onDeleteFuel={handleDeleteFuel}
            lang={lang}
          />
        )}

        {activeTab === 'report' && (
          <ReportView
            orders={orders}
            fuel={fuel}
            users={users}
            currentUser={currentUser}
            lang={lang}
          />
        )}

        {activeTab === 'employees' && currentUser.role !== 'user' && (
          <EmployeesView
            users={users}
            currentUser={currentUser}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            fuelPrice={fuelPrice}
            onUpdateFuelPrice={setFuelPrice}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
            lang={lang}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#16181b] px-2 py-1.5 flex items-center justify-around shadow-xl no-print">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeTab === 'orders' ? 'text-black' : 'text-gray-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'orders' ? 'bg-[#ffd21f]' : ''}`}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span>{t('tab.orders')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fuel')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeTab === 'fuel' ? 'text-black' : 'text-gray-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'fuel' ? 'bg-[#ffd21f]' : ''}`}>
            <Fuel className="w-5 h-5" />
          </div>
          <span>{t('tab.fuel')}</span>
        </button>

        {/* Floating Scan Button */}
        <button
          type="button"
          onClick={() => setIsScanModalOpen(true)}
          className="-mt-7 w-14 h-14 rounded-full bg-[#16181b] text-[#ffd21f] border-4 border-white shadow-xl flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-90"
        >
          <Camera className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeTab === 'report' ? 'text-black' : 'text-gray-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'report' ? 'bg-[#ffd21f]' : ''}`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <span>{t('tab.report')}</span>
        </button>

        {currentUser.role !== 'user' && (
          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              activeTab === 'employees' ? 'text-black' : 'text-gray-500'
            }`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'employees' ? 'bg-[#ffd21f]' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span>{t('tab.employees')}</span>
          </button>
        )}
      </nav>

      {/* Modals */}
      <ScanCaptureModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onSaveOrder={(orderData, addNext) => {
          handleSaveOrder(orderData);
          if (!addNext) setIsScanModalOpen(false);
        }}
        users={users}
        currentUser={currentUser}
        lang={lang}
      />

      <OrderFormModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        editingOrder={editingOrder}
        users={users}
        currentUser={currentUser}
        existingOrders={orders}
        lang={lang}
      />
    </div>
  );
}
