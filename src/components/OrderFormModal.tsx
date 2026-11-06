import React, { useState } from 'react';
import { X, Clock, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { User, OrderEntry, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  calcDurationMinutes,
  calcDeliveryVsExpectedMinutes,
  extractOrderDigits,
  formatMinutes,
  formatVsExpectedBadge,
  getCurrentDate,
  getCurrentTime,
} from '../utils/timeCalculations';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Omit<OrderEntry, 'id' | 'createdAt'>, existingId?: string) => void;
  editingOrder?: OrderEntry | null;
  users: User[];
  currentUser: User;
  existingOrders: OrderEntry[];
  lang: LanguageCode;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingOrder,
  users,
  currentUser,
  existingOrders,
  lang,
}) => {
  const t = (k: string) => getTranslation(lang, k);

  const [date, setDate] = useState<string>(() => editingOrder?.date || getCurrentDate());
  const [employeeId, setEmployeeId] = useState<string>(() => editingOrder?.employeeId || (currentUser.role === 'user' ? currentUser.id : users[0]?.id || currentUser.id));
  const [orderNo, setOrderNo] = useState<string>(() => editingOrder?.orderNo || '');
  const [fullOrderNo, setFullOrderNo] = useState<string>(() => editingOrder?.fullOrderNo || '');
  const [orderAccepted, setOrderAccepted] = useState<string>(() => editingOrder?.orderAccepted || '');
  const [arrivedAtStore, setArrivedAtStore] = useState<string>(() => editingOrder?.arrivedAtStore || '');
  const [orderPickedUp, setOrderPickedUp] = useState<string>(() => editingOrder?.orderPickedUp || '');
  const [atDestination, setAtDestination] = useState<string>(() => editingOrder?.atDestination || '');
  const [arrivedAtCustomer, setArrivedAtCustomer] = useState<string>(() => editingOrder?.arrivedAtCustomer || '');
  const [expectedDeliveryTime, setExpectedDeliveryTime] = useState<string>(() => editingOrder?.expectedDeliveryTime || '');
  const [notes, setNotes] = useState<string>(() => editingOrder?.notes || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOrderNoChange = (raw: string) => {
    const { last4, full } = extractOrderDigits(raw);
    setOrderNo(last4);
    if (!fullOrderNo || full.length > 4) {
      setFullOrderNo(full);
    }
  };

  const setNow = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(getCurrentTime());
  };

  // Calculations
  const acceptToStore = calcDurationMinutes(orderAccepted, arrivedAtStore);
  const storeWait = calcDurationMinutes(arrivedAtStore, orderPickedUp);
  const pickupToDelivery = calcDurationMinutes(orderPickedUp, arrivedAtCustomer);
  const destToCustomer = calcDurationMinutes(atDestination, arrivedAtCustomer);
  const totalTime = calcDurationMinutes(orderAccepted, arrivedAtCustomer);
  const diffExpected = calcDeliveryVsExpectedMinutes(arrivedAtCustomer, expectedDeliveryTime);
  const vsExpectedBadge = formatVsExpectedBadge(diffExpected);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNo = orderNo.trim();
    if (!cleanNo) {
      setErrorMsg('Please enter the last 4 digits of the Order No.');
      return;
    }

    if (!orderAccepted || !arrivedAtCustomer) {
      setErrorMsg('Please provide at least Order Accepted and Arrived at Customer times.');
      return;
    }

    // Check duplicate order no on the same date
    const isDup = existingOrders.some(
      (o) =>
        (!editingOrder || o.id !== editingOrder.id) &&
        o.date === date &&
        o.orderNo.toLowerCase() === cleanNo.toLowerCase()
    );

    if (isDup) {
      setErrorMsg(`Order #${cleanNo} is already recorded on ${date}.`);
      return;
    }

    const orderData: Omit<OrderEntry, 'id' | 'createdAt'> = {
      date,
      employeeId,
      orderNo: cleanNo,
      fullOrderNo: fullOrderNo || cleanNo,
      orderAccepted,
      arrivedAtStore: arrivedAtStore || orderAccepted,
      orderPickedUp: orderPickedUp || arrivedAtStore || orderAccepted,
      atDestination: atDestination || arrivedAtCustomer,
      arrivedAtCustomer,
      expectedDeliveryTime: expectedDeliveryTime || arrivedAtCustomer,
      acceptToStore,
      storeWait,
      pickupToDelivery,
      destinationToCustomer: destToCustomer,
      totalDuration: totalTime,
      deliveryVsExpected: diffExpected,
      notes,
    };

    onSave(orderData, editingOrder?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl border-2 border-[#16181b] w-full max-w-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dfe2dc] bg-[#f7f8f4]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ffd21f] text-[#16181b] grid place-items-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[#16181b] leading-tight">
                {editingOrder ? t('btn.update') : t('btn.addOrder')}
              </h2>
              <p className="text-xs text-[#5d646c]">
                Record order timeline milestones and transit durations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#dfe2dc] hover:border-black flex items-center justify-center text-[#5d646c] hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Details: Order No, Date, Rider */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-[#16181b] uppercase tracking-wider mb-1">
                {t('field.orderNo')} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 1079"
                  className="w-full px-3 py-2 text-lg font-mono font-bold tracking-wider text-[#16181b] bg-white border-2 border-[#16181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd21f]"
                  value={orderNo}
                  onChange={(e) => handleOrderNoChange(e.target.value)}
                  autoFocus
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-amber-800 bg-amber-200 px-1 py-0.5 rounded">
                  4 digits
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16181b] uppercase tracking-wider mb-1">
                {t('field.date')}
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 text-sm bg-white border-1.5 border-[#16181b] rounded-lg"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16181b] uppercase tracking-wider mb-1">
                {t('field.employee')}
              </label>
              <select
                className="w-full px-3 py-2 text-sm bg-white border-1.5 border-[#16181b] rounded-lg"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={currentUser.role === 'user'}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.empNo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeline Milestones with "Now" Buttons */}
          <div className="border border-[#dfe2dc] rounded-xl p-3.5 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#dfe2dc] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16181b] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Timeline Times (24-Hour)
              </span>
              <span className="text-[11px] text-[#5d646c]">Tap "Now" to fill current time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Order Accepted */}
              <div>
                <label className="block text-xs font-bold text-[#5d646c] uppercase mb-1">
                  1. {t('field.orderAccepted')} *
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    required
                    className="flex-1 px-3 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg focus:border-black"
                    value={orderAccepted}
                    onChange={(e) => setOrderAccepted(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setNow(setOrderAccepted)}
                    className="px-2.5 py-1 text-xs font-bold text-[#5d646c] hover:text-black border border-[#dfe2dc] rounded-lg hover:bg-gray-100"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Arrived at Store */}
              <div>
                <label className="block text-xs font-bold text-[#5d646c] uppercase mb-1">
                  2. {t('field.arrivedAtStore')}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    className="flex-1 px-3 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg focus:border-black"
                    value={arrivedAtStore}
                    onChange={(e) => setArrivedAtStore(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setNow(setArrivedAtStore)}
                    className="px-2.5 py-1 text-xs font-bold text-[#5d646c] hover:text-black border border-[#dfe2dc] rounded-lg hover:bg-gray-100"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Order Picked Up */}
              <div>
                <label className="block text-xs font-bold text-[#5d646c] uppercase mb-1">
                  3. {t('field.orderPickedUp')}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    className="flex-1 px-3 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg focus:border-black"
                    value={orderPickedUp}
                    onChange={(e) => setOrderPickedUp(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setNow(setOrderPickedUp)}
                    className="px-2.5 py-1 text-xs font-bold text-[#5d646c] hover:text-black border border-[#dfe2dc] rounded-lg hover:bg-gray-100"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* At Destination */}
              <div>
                <label className="block text-xs font-bold text-[#5d646c] uppercase mb-1">
                  4. {t('field.atDestination')}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    className="flex-1 px-3 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg focus:border-black"
                    value={atDestination}
                    onChange={(e) => setAtDestination(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setNow(setAtDestination)}
                    className="px-2.5 py-1 text-xs font-bold text-[#5d646c] hover:text-black border border-[#dfe2dc] rounded-lg hover:bg-gray-100"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Arrived at Customer */}
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                  5. {t('field.arrivedAtCustomer')} *
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    required
                    className="flex-1 px-3 py-1.5 font-mono text-sm border-2 border-emerald-500 rounded-lg bg-emerald-50 font-bold focus:border-black"
                    value={arrivedAtCustomer}
                    onChange={(e) => setArrivedAtCustomer(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setNow(setArrivedAtCustomer)}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-400 bg-emerald-100 rounded-lg hover:bg-emerald-200"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* Expected Delivery Time */}
              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">
                  {t('field.expectedDelivery')}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    className="flex-1 px-3 py-1.5 font-mono text-sm border-2 border-blue-400 rounded-lg bg-blue-50 font-bold focus:border-black"
                    value={expectedDeliveryTime}
                    onChange={(e) => setExpectedDeliveryTime(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setNow(setExpectedDeliveryTime)}
                    className="px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-400 bg-blue-100 rounded-lg hover:bg-blue-200"
                  >
                    Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Calculated Durations */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-2 border-[#16181b] rounded-xl overflow-hidden bg-white text-center">
            <div className="p-2.5 border-r border-b sm:border-b-0 border-[#16181b]">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                {t('dur.acceptToStore')}
              </span>
              <strong className="text-base font-mono font-bold text-[#16181b]">
                {formatMinutes(acceptToStore)}
              </strong>
            </div>

            <div className="p-2.5 border-r border-b sm:border-b-0 border-[#16181b]">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                {t('dur.pickupToDelivery')}
              </span>
              <strong className="text-base font-mono font-bold text-[#16181b]">
                {formatMinutes(pickupToDelivery)}
              </strong>
            </div>

            <div className="p-2.5 border-r border-[#16181b] bg-amber-50">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                {t('dur.deliveryVsExpected')}
              </span>
              <div className="mt-0.5">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${vsExpectedBadge.badgeClass}`}>
                  {vsExpectedBadge.text}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-[#ffd21f]/20">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                {t('dur.totalTime')}
              </span>
              <strong className="text-base font-mono font-bold text-[#16181b]">
                {formatMinutes(totalTime)}
              </strong>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-[#5d646c] uppercase mb-1">
              {t('field.notes')}
            </label>
            <input
              type="text"
              placeholder="e.g. Traffic delay, customer requested gate drop"
              className="w-full px-3 py-2 text-xs border border-[#dfe2dc] rounded-lg"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#dfe2dc] bg-[#f7f8f4] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#5d646c] hover:text-black rounded-lg border border-[#dfe2dc] bg-white hover:bg-gray-50 transition-colors"
          >
            {t('btn.cancel')}
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-bold text-[#16181b] rounded-lg border-1.5 border-[#16181b] bg-[#ffd21f] hover:bg-[#ffdb4d] transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> {editingOrder ? t('btn.update') : t('btn.save')}
          </button>
        </div>
      </form>
    </div>
  );
};
