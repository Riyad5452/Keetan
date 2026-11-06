import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Check, AlertCircle, Loader2, X, RefreshCw, Clock } from 'lucide-react';
import { User, OrderEntry, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  calcDurationMinutes,
  calcDeliveryVsExpectedMinutes,
  extractOrderDigits,
  formatMinutes,
  formatVsExpectedBadge,
  getCurrentDate,
} from '../utils/timeCalculations';

interface ScanCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOrder: (order: Omit<OrderEntry, 'id' | 'createdAt'>, addNext?: boolean) => void;
  users: User[];
  currentUser: User;
  lang: LanguageCode;
}

export const ScanCaptureModal: React.FC<ScanCaptureModalProps> = ({
  isOpen,
  onClose,
  onSaveOrder,
  users,
  currentUser,
  lang,
}) => {
  const t = (k: string) => getTranslation(lang, k);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    date: string;
    employeeId: string;
    orderNo: string;
    fullOrderNo: string;
    orderAccepted: string;
    arrivedAtStore: string;
    orderPickedUp: string;
    atDestination: string;
    arrivedAtCustomer: string;
    expectedDeliveryTime: string;
    notes: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelected = async (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      await analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSample = async () => {
    setErrorMsg(null);
    try {
      setIsAnalyzing(true);
      // Fetch the sample image sent by user in workspace
      const response = await fetch('/assets/aistudio/IMG-20261104-WA0095_7389e22b.jpg');
      if (!response.ok) {
        throw new Error('Failed to load sample image');
      }
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setImagePreview(base64);
        await analyzeImage(base64);
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setIsAnalyzing(false);
      setErrorMsg('Could not load sample image: ' + (err.message || 'Error'));
    }
  };

  const analyzeImage = async (base64String: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/scan-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64String }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || t('scan.error'));
      }

      const d = json.data || {};
      const { last4, full } = extractOrderDigits(d.last4Digits || d.fullOrderNo || '');

      setExtractedData({
        date: d.orderDate || getCurrentDate(),
        employeeId: currentUser.role === 'user' ? currentUser.id : (users[0]?.id || currentUser.id),
        orderNo: last4,
        fullOrderNo: full || d.fullOrderNo || '',
        orderAccepted: d.orderAccepted || '',
        arrivedAtStore: d.arrivedAtStore || '',
        orderPickedUp: d.orderPickedUp || '',
        atDestination: d.atDestination || '',
        arrivedAtCustomer: d.arrivedAtCustomer || '',
        expectedDeliveryTime: d.expectedDeliveryTime || '',
        notes: '',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t('scan.error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFieldChange = (field: string, val: string) => {
    if (!extractedData) return;
    if (field === 'orderNo') {
      const { last4, full } = extractOrderDigits(val);
      setExtractedData((prev) => prev ? { ...prev, orderNo: last4, fullOrderNo: full || prev.fullOrderNo } : null);
    } else {
      setExtractedData((prev) => prev ? { ...prev, [field]: val } : null);
    }
  };

  // Calculations
  const acceptToStore = extractedData ? calcDurationMinutes(extractedData.orderAccepted, extractedData.arrivedAtStore) : 0;
  const storeWait = extractedData ? calcDurationMinutes(extractedData.arrivedAtStore, extractedData.orderPickedUp) : 0;
  const pickupToDelivery = extractedData ? calcDurationMinutes(extractedData.orderPickedUp, extractedData.arrivedAtCustomer) : 0;
  const destToCustomer = extractedData ? calcDurationMinutes(extractedData.atDestination, extractedData.arrivedAtCustomer) : 0;
  const totalTime = extractedData ? calcDurationMinutes(extractedData.orderAccepted, extractedData.arrivedAtCustomer) : 0;
  const diffExpected = extractedData ? calcDeliveryVsExpectedMinutes(extractedData.arrivedAtCustomer, extractedData.expectedDeliveryTime) : 0;
  const vsExpectedBadge = formatVsExpectedBadge(diffExpected);

  const handleSave = (addAnother: boolean = false) => {
    if (!extractedData) return;
    if (!extractedData.orderNo) {
      setErrorMsg('Please enter or verify the last 4 digits of the Order No.');
      return;
    }

    const newOrder: Omit<OrderEntry, 'id' | 'createdAt'> = {
      date: extractedData.date || getCurrentDate(),
      employeeId: extractedData.employeeId,
      orderNo: extractedData.orderNo,
      fullOrderNo: extractedData.fullOrderNo,
      orderAccepted: extractedData.orderAccepted,
      arrivedAtStore: extractedData.arrivedAtStore,
      orderPickedUp: extractedData.orderPickedUp,
      atDestination: extractedData.atDestination,
      arrivedAtCustomer: extractedData.arrivedAtCustomer,
      expectedDeliveryTime: extractedData.expectedDeliveryTime,
      acceptToStore,
      storeWait,
      pickupToDelivery,
      destinationToCustomer: destToCustomer,
      totalDuration: totalTime,
      deliveryVsExpected: diffExpected,
      notes: extractedData.notes,
    };

    onSaveOrder(newOrder, addAnother);
    if (addAnother) {
      setExtractedData(null);
      setImagePreview(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#16181b] w-full max-w-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dfe2dc] bg-[#f7f8f4]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#ffd21f] text-[#16181b] grid place-items-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[#16181b] leading-tight">
                {t('scan.modalTitle')}
              </h2>
              <p className="text-xs text-[#5d646c]">
                {t('scan.hint')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#dfe2dc] hover:border-black flex items-center justify-center text-[#5d646c] hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Action buttons */}
          {!imagePreview && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 rounded-xl border-2 border-dashed border-[#16181b] bg-[#fff6c7] hover:bg-[#ffed8d] flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
                >
                  <Camera className="w-8 h-8 text-[#16181b] group-hover:scale-110 transition-transform" />
                  <span className="font-display font-bold text-sm text-[#16181b]">
                    {t('scan.takePhoto')}
                  </span>
                  <span className="text-xs text-[#5d646c]">Camera capture on mobile</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-xl border-2 border-dashed border-[#16181b] bg-[#fff6c7] hover:bg-[#ffed8d] flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group"
                >
                  <Upload className="w-8 h-8 text-[#16181b] group-hover:scale-110 transition-transform" />
                  <span className="font-display font-bold text-sm text-[#16181b]">
                    {t('scan.uploadPhoto')}
                  </span>
                  <span className="text-xs text-[#5d646c]">Select screenshot from device</span>
                </button>
              </div>

              {/* Sample screenshot loader button */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-900 font-medium">
                    Have the rider screenshot from Keeta? Test instant 1-click scanning:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 text-xs font-bold bg-[#ffd21f] hover:bg-[#ffdb4d] text-black rounded-lg border border-black shadow-xs shrink-0 cursor-pointer"
                >
                  {t('scan.useSample')}
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageSelected(e.target.files[0])}
              />
            </div>
          )}

          {/* Analyzing state */}
          {isAnalyzing && (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-10 h-10 text-[#ffd21f] animate-spin" />
              <div className="font-display font-bold text-base text-[#16181b]">
                {t('scan.reading')}
              </div>
              <p className="text-xs text-[#5d646c] max-w-sm">
                Extracting Order No. (last 4 digits), Accept, Store Arrival, Pickup, Destination, Arrived at Customer, and Expected Delivery times...
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Extracted Details & Review Form */}
          {extractedData && !isAnalyzing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('scan.reviewDesc')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExtractedData(null);
                    setImagePreview(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-emerald-900 underline hover:no-underline font-bold"
                >
                  <RefreshCw className="w-3 h-3" /> Rescan image
                </button>
              </div>

              {/* Order No & Rider Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-[#16181b] uppercase tracking-wider mb-1">
                    {t('field.orderNo')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={4}
                      className="w-full px-3 py-2 text-xl font-mono font-bold tracking-widest text-[#16181b] bg-white border-2 border-[#16181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd21f]"
                      value={extractedData.orderNo}
                      onChange={(e) => handleFieldChange('orderNo', e.target.value)}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      4 Digits Only
                    </span>
                  </div>
                  {extractedData.fullOrderNo && (
                    <div className="text-[11px] text-[#5d646c] mt-1 font-mono">
                      Full raw number: {extractedData.fullOrderNo}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16181b] uppercase tracking-wider mb-1">
                    {t('field.employee')}
                  </label>
                  <select
                    className="w-full px-3 py-2.5 text-sm bg-white border-1.5 border-[#16181b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd21f]"
                    value={extractedData.employeeId}
                    onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.empNo}) {u.plate ? `• ${u.plate}` : ''}
                      </option>
                    ))}
                  </select>

                  <label className="block text-xs font-bold text-[#16181b] uppercase tracking-wider mt-2 mb-1">
                    {t('field.date')}
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#dfe2dc] rounded-lg"
                    value={extractedData.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                  />
                </div>
              </div>

              {/* Milestones Grid */}
              <div className="border border-[#dfe2dc] rounded-xl p-3 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-[#dfe2dc] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5d646c] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Timeline Milestones
                  </span>
                  <span className="text-[11px] text-[#5d646c]">Format: 24-Hour (HH:mm)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#5d646c] uppercase mb-1">
                      {t('field.orderAccepted')}
                    </label>
                    <input
                      type="time"
                      className="w-full px-2.5 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg bg-[#fcfcf9]"
                      value={extractedData.orderAccepted}
                      onChange={(e) => handleFieldChange('orderAccepted', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5d646c] uppercase mb-1">
                      {t('field.arrivedAtStore')}
                    </label>
                    <input
                      type="time"
                      className="w-full px-2.5 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg bg-[#fcfcf9]"
                      value={extractedData.arrivedAtStore}
                      onChange={(e) => handleFieldChange('arrivedAtStore', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5d646c] uppercase mb-1">
                      {t('field.orderPickedUp')}
                    </label>
                    <input
                      type="time"
                      className="w-full px-2.5 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg bg-[#fcfcf9]"
                      value={extractedData.orderPickedUp}
                      onChange={(e) => handleFieldChange('orderPickedUp', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5d646c] uppercase mb-1">
                      {t('field.atDestination')}
                    </label>
                    <input
                      type="time"
                      className="w-full px-2.5 py-1.5 font-mono text-sm border border-[#dfe2dc] rounded-lg bg-[#fcfcf9]"
                      value={extractedData.atDestination}
                      onChange={(e) => handleFieldChange('atDestination', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                      {t('field.arrivedAtCustomer')}
                    </label>
                    <input
                      type="time"
                      className="w-full px-2.5 py-1.5 font-mono text-sm border-2 border-emerald-500 rounded-lg bg-emerald-50 font-bold"
                      value={extractedData.arrivedAtCustomer}
                      onChange={(e) => handleFieldChange('arrivedAtCustomer', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                      {t('field.expectedDelivery')}
                    </label>
                    <input
                      type="time"
                      className="w-full px-2.5 py-1.5 font-mono text-sm border-2 border-blue-400 rounded-lg bg-blue-50 font-bold"
                      value={extractedData.expectedDeliveryTime}
                      onChange={(e) => handleFieldChange('expectedDeliveryTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Performance Analytics preview */}
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

              {/* Small thumbnail toggle */}
              {imagePreview && (
                <details className="text-xs text-[#5d646c] bg-gray-50 p-2 rounded-lg border border-[#dfe2dc]">
                  <summary className="cursor-pointer font-medium hover:text-black">
                    View Scanned Screenshot Image
                  </summary>
                  <div className="mt-2 flex justify-center">
                    <img
                      src={imagePreview}
                      alt="Uploaded timeline"
                      className="max-h-48 rounded-lg border border-[#dfe2dc] object-contain shadow-xs"
                    />
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#dfe2dc] bg-[#f7f8f4] flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#5d646c] hover:text-black rounded-lg border border-[#dfe2dc] bg-white hover:bg-gray-50 transition-colors"
          >
            {t('btn.cancel')}
          </button>

          {extractedData && (
            <>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="px-4 py-2 text-sm font-semibold text-[#16181b] rounded-lg border border-[#16181b] bg-white hover:bg-gray-100 transition-colors"
              >
                {t('btn.saveAndNext')}
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="px-5 py-2 text-sm font-bold text-[#16181b] rounded-lg border-1.5 border-[#16181b] bg-[#ffd21f] hover:bg-[#ffdb4d] transition-colors shadow-xs"
              >
                {t('btn.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
