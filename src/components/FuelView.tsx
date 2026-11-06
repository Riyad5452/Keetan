import React, { useState, useMemo } from 'react';
import { Fuel, Plus, Trash2, Edit2, AlertTriangle, Check, X } from 'lucide-react';
import { User, FuelEntry, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import { getCurrentDate, getCurrentTime } from '../utils/timeCalculations';

interface FuelViewProps {
  fuel: FuelEntry[];
  users: User[];
  currentUser: User;
  fuelPrice: number;
  onSaveFuel: (entry: Omit<FuelEntry, 'id' | 'createdAt'>, existingId?: string) => void;
  onDeleteFuel: (id: string) => void;
  lang: LanguageCode;
}

export const FuelView: React.FC<FuelViewProps> = ({
  fuel,
  users,
  currentUser,
  fuelPrice,
  onSaveFuel,
  onDeleteFuel,
  lang,
}) => {
  const t = (k: string) => getTranslation(lang, k);
  const isStaff = currentUser.role !== 'user';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [employeeId, setEmployeeId] = useState<string>(currentUser.role === 'user' ? currentUser.id : users[0]?.id || currentUser.id);
  const [date, setDate] = useState<string>(getCurrentDate());
  const [time, setTime] = useState<string>(getCurrentTime());
  const [odo, setOdo] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === employeeId);
  const userPlate = selectedUser?.plate || '';

  // Calculations for fuel entries (distance and mileage)
  const sortedAndEnrichedFuel = useMemo(() => {
    const list = [...fuel].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const lastOdoByVehicle: Record<string, number> = {};

    return list.map((entry) => {
      const vKey = (entry.vehicle || '').trim().toUpperCase();
      const currentOdo = parseInt(entry.odo, 10);
      let distance: number | null = null;
      let kmpl: number | null = null;

      if (!isNaN(currentOdo) && vKey) {
        if (lastOdoByVehicle[vKey] !== undefined) {
          const d = currentOdo - lastOdoByVehicle[vKey];
          if (d >= 0) {
            distance = d;
            if (entry.liters > 0) {
              kmpl = d / entry.liters;
            }
          }
        }
        lastOdoByVehicle[vKey] = currentOdo;
      }

      return {
        ...entry,
        distance,
        kmpl,
      };
    }).reverse(); // Most recent first
  }, [fuel]);

  // Overall totals
  const totals = useMemo(() => {
    const count = sortedAndEnrichedFuel.length;
    const totalAmount = sortedAndEnrichedFuel.reduce((acc, f) => acc + (f.amount || 0), 0);
    const totalLiters = sortedAndEnrichedFuel.reduce((acc, f) => acc + (f.liters || 0), 0);
    const totalDistance = sortedAndEnrichedFuel.reduce((acc, f) => acc + (f.distance || 0), 0);
    const avgKmpl = totalLiters > 0 && totalDistance > 0 ? totalDistance / totalLiters : 0;

    return {
      count,
      totalAmount,
      totalLiters,
      totalDistance,
      avgKmpl,
    };
  }, [sortedAndEnrichedFuel]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setEmployeeId(currentUser.role === 'user' ? currentUser.id : users[0]?.id || currentUser.id);
    setDate(getCurrentDate());
    setTime(getCurrentTime());
    setOdo('');
    setAmount('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: FuelEntry) => {
    setEditingId(entry.id);
    setEmployeeId(entry.employeeId);
    setDate(entry.date);
    setTime(entry.time);
    setOdo(entry.odo);
    setAmount(String(entry.amount));
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const amountNum = parseFloat(amount) || 0;
  const calculatedLiters = amountNum > 0 && fuelPrice > 0 ? Math.round((amountNum / fuelPrice) * 100) / 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!userPlate) {
      setErrorMsg('This employee has no vehicle plate set. Please assign one in Employees first.');
      return;
    }

    if (!odo || !amountNum) {
      setErrorMsg('Please enter valid meter KM and fuel amount.');
      return;
    }

    onSaveFuel(
      {
        employeeId,
        date,
        time,
        vehicle: userPlate,
        odo: odo.trim(),
        amount: amountNum,
        price: fuelPrice,
        liters: calculatedLiters,
      },
      editingId || undefined
    );

    setIsModalOpen(false);
  };

  const getUserName = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name : '—';
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#16181b]">
              {t('fuel.title')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fff6c7] border border-[#ffd21f] text-xs font-mono font-bold text-[#16181b]">
              {fuel.length} fills
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5d646c] mt-0.5">
            Log odometer readings, monitor fuel cost in SAR, and track vehicle mileage (km/L)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 text-sm font-bold bg-[#ffd21f] hover:bg-[#ffdb4d] text-[#16181b] rounded-xl border-1.5 border-[#16181b] shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('btn.addFuel')}</span>
        </button>
      </div>

      {/* KPI Stats */}
      {sortedAndEnrichedFuel.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs">
            <span className="block text-xs font-bold text-[#5d646c] uppercase">Total Fills</span>
            <strong className="text-2xl font-mono font-bold text-[#16181b]">{totals.count}</strong>
          </div>
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs">
            <span className="block text-xs font-bold text-[#5d646c] uppercase">Total Spent</span>
            <strong className="text-2xl font-mono font-bold text-[#16181b]">{totals.totalAmount.toFixed(2)} SAR</strong>
          </div>
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs">
            <span className="block text-xs font-bold text-[#5d646c] uppercase">Total Liters</span>
            <strong className="text-2xl font-mono font-bold text-[#16181b]">{totals.totalLiters.toFixed(2)} L</strong>
          </div>
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs bg-emerald-50/40">
            <span className="block text-xs font-bold text-[#5d646c] uppercase">Average Mileage</span>
            <strong className="text-2xl font-mono font-bold text-emerald-800">
              {totals.avgKmpl > 0 ? `${totals.avgKmpl.toFixed(2)} km/L` : '—'}
            </strong>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl shadow-xs overflow-hidden">
        {sortedAndEnrichedFuel.length === 0 ? (
          <div className="py-16 text-center text-[#5d646c] text-sm">
            No fuel logs recorded yet. Tap "Add Fuel" to log your first refill.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#f7f8f4] border-b border-[#dfe2dc] text-[#5d646c] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Time</th>
                  <th className="py-3 px-3.5">Rider</th>
                  <th className="py-3 px-3.5">Vehicle Plate</th>
                  <th className="py-3 px-3.5">Meter KM</th>
                  <th className="py-3 px-3.5">Amount (SAR)</th>
                  <th className="py-3 px-3.5">Liters</th>
                  <th className="py-3 px-3.5">Distance (KM)</th>
                  <th className="py-3 px-3.5">Mileage (KM/L)</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe2dc] font-mono">
                {sortedAndEnrichedFuel.map((entry) => (
                  <tr key={entry.id} className="hover:bg-amber-50/30">
                    <td className="py-3 px-3.5 font-sans font-medium">{entry.date}</td>
                    <td className="py-3 px-3.5">{entry.time}</td>
                    <td className="py-3 px-3.5 font-sans font-semibold">{getUserName(entry.employeeId)}</td>
                    <td className="py-3 px-3.5 font-bold">{entry.vehicle}</td>
                    <td className="py-3 px-3.5 font-bold">{entry.odo} km</td>
                    <td className="py-3 px-3.5 font-bold text-emerald-800">{entry.amount.toFixed(2)} SAR</td>
                    <td className="py-3 px-3.5">{entry.liters.toFixed(2)} L</td>
                    <td className="py-3 px-3.5">{entry.distance !== null ? `${entry.distance} km` : '—'}</td>
                    <td className="py-3 px-3.5 font-bold text-emerald-900">
                      {entry.kmpl !== null ? `${entry.kmpl.toFixed(2)} km/L` : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-sans">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(entry)}
                          className="p-1.5 rounded-lg border border-[#dfe2dc] hover:border-black text-[#5d646c]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteFuel(entry.id)}
                          className="p-1.5 rounded-lg border border-[#dfe2dc] hover:border-red-600 text-[#5d646c] hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fuel Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl border-2 border-[#16181b] w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dfe2dc] bg-[#f7f8f4]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ffd21f] text-black grid place-items-center font-bold">
                  <Fuel className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-base text-[#16181b]">
                  {editingId ? 'Edit Fuel Entry' : 'New Fuel Entry'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-[#dfe2dc] flex items-center justify-center text-[#5d646c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Rider / Employee</label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    disabled={currentUser.role === 'user'}
                    className="w-full px-3 py-2 bg-white border border-[#16181b] rounded-lg text-sm"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.empNo}) {u.plate ? `• ${u.plate}` : '(No plate)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    readOnly
                    value={userPlate || 'No Plate Configured'}
                    className="w-full px-3 py-2 bg-gray-100 border border-[#dfe2dc] rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Meter KM (Odometer)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0166626"
                    value={odo}
                    onChange={(e) => setOdo(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-[#16181b] rounded-lg font-mono font-bold text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Fuel Amount (SAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 24.50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#16181b] rounded-lg font-mono font-bold text-base"
                  />
                </div>
              </div>

              {/* Calculated Liters Card */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] font-bold text-amber-900 uppercase">Calculated Liters</span>
                  <span className="text-[11px] text-amber-700">At {fuelPrice.toFixed(2)} SAR/L</span>
                </div>
                <strong className="text-xl font-mono font-bold text-amber-950">
                  {calculatedLiters.toFixed(2)} L
                </strong>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#dfe2dc] bg-[#f7f8f4] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold border rounded-lg bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-[#ffd21f] text-black border border-black rounded-lg"
              >
                Save Refuel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
