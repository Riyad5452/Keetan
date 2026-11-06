import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, AlertTriangle, Check, X, Download, Upload } from 'lucide-react';
import { User, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import { getCurrentDate } from '../utils/timeCalculations';

interface EmployeesViewProps {
  users: User[];
  currentUser: User;
  onSaveUser: (userData: Partial<User>, existingId?: string) => void;
  onDeleteUser: (userId: string) => void;
  fuelPrice: number;
  onUpdateFuelPrice: (newPrice: number) => void;
  onExportBackup: () => void;
  onRestoreBackup: (file: File) => void;
  lang: LanguageCode;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  fuelPrice,
  onUpdateFuelPrice,
  onExportBackup,
  onRestoreBackup,
  lang,
}) => {
  const t = (k: string) => getTranslation(lang, k);
  const isAdmin = currentUser.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'user'>('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [iqama, setIqama] = useState('');
  const [iqamaExp, setIqamaExp] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [vtype, setVtype] = useState<'motorcycle' | 'car' | 'van'>('motorcycle');
  const [allowance, setAllowance] = useState('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fuel price input state
  const [tempPrice, setTempPrice] = useState(String(fuelPrice));
  const [priceSuccess, setPriceSuccess] = useState(false);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setRole('user');
    setUsername('');
    setPassword('');
    setIqama('');
    setIqamaExp('');
    setPhone('');
    setPlate('');
    setVtype('motorcycle');
    setAllowance('0');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setRole(u.role);
    setUsername(u.username);
    setPassword('');
    setIqama(u.iqama || '');
    setIqamaExp(u.iqamaExp || '');
    setPhone(u.phone || '');
    setPlate(u.plate || '');
    setVtype(u.vtype || 'motorcycle');
    setAllowance(String(u.allowance || 0));
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !username.trim()) {
      setErrorMsg('Name and username are required.');
      return;
    }

    if (!editingUser && !password.trim()) {
      setErrorMsg('Password is required for new employees.');
      return;
    }

    onSaveUser(
      {
        name: name.trim(),
        role,
        username: username.trim(),
        password: password.trim() || undefined,
        iqama: iqama.trim(),
        iqamaExp,
        phone: phone.trim(),
        plate: plate.trim().toUpperCase(),
        vtype,
        allowance: parseFloat(allowance) || 0,
      },
      editingUser?.id
    );

    setIsModalOpen(false);
  };

  const handleSavePrice = () => {
    const p = parseFloat(tempPrice);
    if (p > 0) {
      onUpdateFuelPrice(p);
      setPriceSuccess(true);
      setTimeout(() => setPriceSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#16181b]">
              {t('emp.title')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fff6c7] border border-[#ffd21f] text-xs font-mono font-bold text-[#16181b]">
              {users.length} riders
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5d646c] mt-0.5">
            Manage riders, assign vehicle plates, track Iqama validity, and set fuel limits
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-sm font-bold bg-[#ffd21f] hover:bg-[#ffdb4d] text-[#16181b] rounded-xl border-1.5 border-[#16181b] shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btn.addEmployee')}</span>
          </button>
        )}
      </div>

      {/* Admin Settings: Fuel Price & Backup */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#dfe2dc] rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="font-display font-bold text-sm text-[#16181b]">
              Fuel Rate Setting
            </h3>
            <p className="text-xs text-[#5d646c]">
              Current price per liter in SAR used to automatically calculate liters from receipt amounts.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                className="w-32 px-3 py-1.5 border border-[#16181b] rounded-lg font-mono font-bold text-sm"
                value={tempPrice}
                onChange={(e) => setTempPrice(e.target.value)}
              />
              <span className="text-xs font-bold text-[#5d646c]">SAR / Liter</span>
              <button
                type="button"
                onClick={handleSavePrice}
                className="px-3.5 py-1.5 text-xs font-bold bg-[#ffd21f] rounded-lg border border-black cursor-pointer"
              >
                Save
              </button>
              {priceSuccess && <span className="text-xs text-emerald-600 font-bold">Saved!</span>}
            </div>
          </div>

          <div className="bg-white border border-[#dfe2dc] rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="font-display font-bold text-sm text-[#16181b]">
              Backup &amp; Restore
            </h3>
            <p className="text-xs text-[#5d646c]">
              Export full records (orders, fuel logs, and employees) to a backup JSON file or restore anytime.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="px-3.5 py-1.5 text-xs font-bold bg-white hover:bg-gray-50 border border-[#16181b] rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Backup
              </button>
              <label className="px-3.5 py-1.5 text-xs font-bold bg-white hover:bg-gray-50 border border-[#16181b] rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Restore
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onRestoreBackup(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#f7f8f4] border-b border-[#dfe2dc] text-[#5d646c] uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-3.5">Emp No</th>
                <th className="py-3 px-3.5">Name</th>
                <th className="py-3 px-3.5">Role</th>
                <th className="py-3 px-3.5">Vehicle Plate</th>
                <th className="py-3 px-3.5">Vehicle Type</th>
                <th className="py-3 px-3.5">Iqama No</th>
                <th className="py-3 px-3.5">Iqama Expiry</th>
                <th className="py-3 px-3.5">Fuel Limit (SAR)</th>
                {isAdmin && <th className="py-3 px-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe2dc]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-amber-50/20">
                  <td className="py-3 px-3.5 font-mono font-bold text-[#16181b]">{u.empNo}</td>
                  <td className="py-3 px-3.5 font-semibold text-black">
                    {u.name}
                    <span className="block text-[11px] font-mono text-[#5d646c]">@{u.username}</span>
                  </td>
                  <td className="py-3 px-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-black text-white'
                          : u.role === 'supervisor'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 font-mono font-bold text-[#16181b]">{u.plate || '—'}</td>
                  <td className="py-3 px-3.5 capitalize text-[#5d646c]">{u.vtype || 'motorcycle'}</td>
                  <td className="py-3 px-3.5 font-mono">{u.iqama || '—'}</td>
                  <td className="py-3 px-3.5 font-mono">{u.iqamaExp || '—'}</td>
                  <td className="py-3 px-3.5 font-mono font-semibold">
                    {u.allowance > 0 ? `${u.allowance} SAR` : 'No Limit'}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg border border-[#dfe2dc] hover:border-black text-[#5d646c]"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => onDeleteUser(u.id)}
                            className="p-1.5 rounded-lg border border-[#dfe2dc] hover:border-red-600 text-[#5d646c] hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl border-2 border-[#16181b] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dfe2dc] bg-[#f7f8f4]">
              <h3 className="font-display font-bold text-base text-[#16181b]">
                {editingUser ? 'Edit Employee' : 'Add Employee'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg border border-[#dfe2dc] flex items-center justify-center text-[#5d646c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#16181b] rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#dfe2dc] rounded-lg"
                  >
                    <option value="user">User / Rider</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC 1234"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Vehicle Type</label>
                  <select
                    value={vtype}
                    onChange={(e) => setVtype(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#dfe2dc] rounded-lg"
                  >
                    <option value="motorcycle">Motorcycle</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Monthly Fuel Limit (SAR)</label>
                  <input
                    type="number"
                    value={allowance}
                    onChange={(e) => setAllowance(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Iqama No</label>
                  <input
                    type="text"
                    placeholder="10 digits"
                    value={iqama}
                    onChange={(e) => setIqama(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Iqama Expiry</label>
                  <input
                    type="date"
                    value={iqamaExp}
                    onChange={(e) => setIqamaExp(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d646c] uppercase mb-1">
                    {editingUser ? 'Password (Leave empty to keep)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2dc] rounded-lg"
                  />
                </div>
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
                Save Employee
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
