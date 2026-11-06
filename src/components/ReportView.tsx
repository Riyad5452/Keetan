import React, { useState, useMemo } from 'react';
import { Printer, Calendar, User as UserIcon, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { User, OrderEntry, FuelEntry, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  formatMinutes,
  formatVsExpectedBadge,
  formatTime12h,
  getCurrentDate,
} from '../utils/timeCalculations';

interface ReportViewProps {
  orders: OrderEntry[];
  fuel: FuelEntry[];
  users: User[];
  currentUser: User;
  lang: LanguageCode;
}

export const ReportView: React.FC<ReportViewProps> = ({
  orders,
  fuel,
  users,
  currentUser,
  lang,
}) => {
  const t = (k: string) => getTranslation(lang, k);
  const isStaff = currentUser.role !== 'user';

  // State
  const [reportType, setReportType] = useState<'orders' | 'fuel'>('orders');
  const [mode, setMode] = useState<'both' | 'details' | 'summary'>('both');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [toDate, setToDate] = useState(() => getCurrentDate());
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>(isStaff ? 'all' : currentUser.id);

  // Quick filters
  const applyQuickFilter = (type: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = getCurrentDate();
    if (type === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (type === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setFromDate(yStr);
      setToDate(yStr);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const wStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setFromDate(wStr);
      setToDate(today);
    } else if (type === 'month') {
      const d = new Date();
      d.setDate(1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setFromDate(mStr);
      setToDate(today);
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  // Scope filter for Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!isStaff && o.employeeId !== currentUser.id) return false;
      if (filterEmployeeId !== 'all' && o.employeeId !== filterEmployeeId) return false;
      if (fromDate && o.date < fromDate) return false;
      if (toDate && o.date > toDate) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || a.orderAccepted.localeCompare(b.orderAccepted));
  }, [orders, isStaff, currentUser, filterEmployeeId, fromDate, toDate]);

  // Scope filter for Fuel
  const filteredFuel = useMemo(() => {
    return fuel.filter((f) => {
      if (!isStaff && f.employeeId !== currentUser.id) return false;
      if (filterEmployeeId !== 'all' && f.employeeId !== filterEmployeeId) return false;
      if (fromDate && f.date < fromDate) return false;
      if (toDate && f.date > toDate) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [fuel, isStaff, currentUser, filterEmployeeId, fromDate, toDate]);

  // Overall Orders Statistics and Averages
  const orderStats = useMemo(() => {
    if (!filteredOrders.length) {
      return {
        count: 0,
        avgAcceptToStore: 0,
        avgStoreWait: 0,
        avgPickupToDelivery: 0,
        avgDeliveryVsExpected: 0,
        avgTotalDuration: 0,
        totalTime: 0,
        earlyCount: 0,
        onTimeRate: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }
    const count = filteredOrders.length;
    const sumAcceptToStore = filteredOrders.reduce((acc, o) => acc + (o.acceptToStore || 0), 0);
    const sumStoreWait = filteredOrders.reduce((acc, o) => acc + (o.storeWait || 0), 0);
    const sumPickupToDelivery = filteredOrders.reduce((acc, o) => acc + (o.pickupToDelivery || 0), 0);
    const sumVsExpected = filteredOrders.reduce((acc, o) => acc + (o.deliveryVsExpected || 0), 0);
    const sumTotalTime = filteredOrders.reduce((acc, o) => acc + (o.totalDuration || 0), 0);
    const earlyCount = filteredOrders.filter((o) => (o.deliveryVsExpected || 0) <= 0).length;

    const durations = filteredOrders.map((o) => o.totalDuration || 0);

    return {
      count,
      avgAcceptToStore: sumAcceptToStore / count,
      avgStoreWait: sumStoreWait / count,
      avgPickupToDelivery: sumPickupToDelivery / count,
      avgDeliveryVsExpected: sumVsExpected / count,
      avgTotalDuration: sumTotalTime / count,
      totalTime: sumTotalTime,
      earlyCount,
      onTimeRate: Math.round((earlyCount / count) * 100),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }, [filteredOrders]);

  // Date-wise grouping
  const dateGroups = useMemo(() => {
    const map = new Map<string, OrderEntry[]>();
    filteredOrders.forEach((o) => {
      const list = map.get(o.date) || [];
      list.push(o);
      map.set(o.date, list);
    });

    return Array.from(map.entries())
      .map(([dateStr, items]) => {
        const count = items.length;
        const sumAcceptToStore = items.reduce((acc, o) => acc + (o.acceptToStore || 0), 0);
        const sumStoreWait = items.reduce((acc, o) => acc + (o.storeWait || 0), 0);
        const sumPickupToDelivery = items.reduce((acc, o) => acc + (o.pickupToDelivery || 0), 0);
        const sumVsExpected = items.reduce((acc, o) => acc + (o.deliveryVsExpected || 0), 0);
        const sumTotal = items.reduce((acc, o) => acc + (o.totalDuration || 0), 0);
        const durations = items.map((o) => o.totalDuration || 0);
        const earlyCount = items.filter((o) => (o.deliveryVsExpected || 0) <= 0).length;

        return {
          date: dateStr,
          items,
          count,
          avgAcceptToStore: sumAcceptToStore / count,
          avgStoreWait: sumStoreWait / count,
          avgPickupToDelivery: sumPickupToDelivery / count,
          avgDeliveryVsExpected: sumVsExpected / count,
          avgTotalDuration: sumTotal / count,
          totalDuration: sumTotal,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          onTimeRate: Math.round((earlyCount / count) * 100),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders]);

  // Rider-wise grouping
  const riderGroups = useMemo(() => {
    const map = new Map<string, OrderEntry[]>();
    filteredOrders.forEach((o) => {
      const list = map.get(o.employeeId) || [];
      list.push(o);
      map.set(o.employeeId, list);
    });

    return Array.from(map.entries()).map(([empId, items]) => {
      const u = users.find((x) => x.id === empId);
      const count = items.length;
      const sumAcceptToStore = items.reduce((acc, o) => acc + (o.acceptToStore || 0), 0);
      const sumPickupToDelivery = items.reduce((acc, o) => acc + (o.pickupToDelivery || 0), 0);
      const sumVsExpected = items.reduce((acc, o) => acc + (o.deliveryVsExpected || 0), 0);
      const sumTotal = items.reduce((acc, o) => acc + (o.totalDuration || 0), 0);
      const earlyCount = items.filter((o) => (o.deliveryVsExpected || 0) <= 0).length;

      return {
        empId,
        name: u ? u.name : 'Unknown',
        empNo: u ? u.empNo : '—',
        plate: u ? u.plate : '—',
        count,
        avgAcceptToStore: sumAcceptToStore / count,
        avgPickupToDelivery: sumPickupToDelivery / count,
        avgDeliveryVsExpected: sumVsExpected / count,
        avgTotalDuration: sumTotal / count,
        onTimeRate: Math.round((earlyCount / count) * 100),
      };
    });
  }, [filteredOrders, users]);

  const getUserName = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name : '—';
  };

  const handlePrint = () => {
    window.print();
  };

  const periodLabel = useMemo(() => {
    if (!fromDate && !toDate) return 'All Recorded Dates';
    if (fromDate && toDate) {
      return fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`;
    }
    return fromDate ? `From ${fromDate}` : `Up to ${toDate}`;
  }, [fromDate, toDate]);

  const selectedUserName = filterEmployeeId === 'all' ? 'All Employees / Riders' : getUserName(filterEmployeeId);

  return (
    <div className="space-y-4">
      {/* Controls Bar - Hidden when printing */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 no-print">
        {/* Row 1: Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isStaff && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#5d646c]">Rider:</span>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#f8f9fa] border border-[#dfe2dc] rounded-lg font-medium text-xs"
                >
                  <option value="all">All Riders</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.empNo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#5d646c]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 bg-[#f8f9fa] border border-[#dfe2dc] rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#5d646c]">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 bg-[#f8f9fa] border border-[#dfe2dc] rounded-lg text-xs"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyQuickFilter('today')}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[#16181b] font-medium text-[11px]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyQuickFilter('yesterday')}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[#16181b] font-medium text-[11px]"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => applyQuickFilter('week')}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[#16181b] font-medium text-[11px]"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => applyQuickFilter('month')}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[#16181b] font-medium text-[11px]"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyQuickFilter('all')}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[#16181b] font-medium text-[11px]"
              >
                All
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold bg-[#ffd21f] hover:bg-[#ffdb4d] text-[#16181b] rounded-xl border-1.5 border-[#16181b] shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{t('btn.print')}</span>
          </button>
        </div>

        {/* Row 2: Mode and Type Segments */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#dfe2dc]">
          <div className="inline-flex rounded-xl border border-[#16181b] overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setReportType('orders')}
              className={`px-3.5 py-1.5 font-bold transition-colors ${
                reportType === 'orders' ? 'bg-[#16181b] text-white' : 'bg-white text-[#16181b] hover:bg-gray-50'
              }`}
            >
              {t('rep.typeOrders')}
            </button>
            <button
              type="button"
              onClick={() => setReportType('fuel')}
              className={`px-3.5 py-1.5 font-bold transition-colors border-l border-[#16181b] ${
                reportType === 'fuel' ? 'bg-[#16181b] text-white' : 'bg-white text-[#16181b] hover:bg-gray-50'
              }`}
            >
              {t('rep.typeFuel')}
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-[#dfe2dc] overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMode('both')}
              className={`px-3 py-1 font-semibold transition-colors ${
                mode === 'both' ? 'bg-[#ffd21f] text-[#16181b] font-bold' : 'bg-white text-[#5d646c] hover:bg-gray-50'
              }`}
            >
              {t('rep.viewBoth')}
            </button>
            <button
              type="button"
              onClick={() => setMode('details')}
              className={`px-3 py-1 font-semibold transition-colors border-l border-[#dfe2dc] ${
                mode === 'details' ? 'bg-[#ffd21f] text-[#16181b] font-bold' : 'bg-white text-[#5d646c] hover:bg-gray-50'
              }`}
            >
              {t('rep.viewDetails')}
            </button>
            <button
              type="button"
              onClick={() => setMode('summary')}
              className={`px-3 py-1 font-semibold transition-colors border-l border-[#dfe2dc] ${
                mode === 'summary' ? 'bg-[#ffd21f] text-[#16181b] font-bold' : 'bg-white text-[#5d646c] hover:bg-gray-50'
              }`}
            >
              {t('rep.viewSummary')}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl p-6 sm:p-8 shadow-xs sheet-print space-y-6">
        {/* Printable Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#16181b] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#ffd21f] text-[#16181b] grid place-items-center font-extrabold text-xl border border-black shadow-xs">
              K
            </div>
            <div>
              <h1 className="font-display font-extrabold text-2xl text-[#16181b] leading-tight">
                Keeta Delivery Performance Report
              </h1>
              <p className="text-xs text-[#5d646c]">
                {reportType === 'orders' ? 'Order Transit Milestones & Delivery Time Analytics' : 'Fuel Log & Efficiency Report'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-[#5d646c] space-y-0.5">
            <div><span className="font-bold text-[#16181b]">Rider:</span> {selectedUserName}</div>
            <div><span className="font-bold text-[#16181b]">Period:</span> {periodLabel}</div>
            <div><span className="font-bold text-[#16181b]">Generated:</span> {getCurrentDate()}</div>
          </div>
        </div>

        {/* Empty State */}
        {reportType === 'orders' && filteredOrders.length === 0 && (
          <div className="py-12 text-center text-[#5d646c] text-sm">
            No delivery records found for this period. Try adjusting your dates or scan new order screenshots.
          </div>
        )}

        {/* Key KPI summary boxes */}
        {reportType === 'orders' && filteredOrders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-2 border-[#16181b] rounded-xl p-3 bg-amber-50/30 text-center">
            <div className="p-2 border-r border-[#16181b]">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                Total Orders
              </span>
              <strong className="text-xl font-mono font-bold text-[#16181b]">
                {orderStats.count}
              </strong>
            </div>

            <div className="p-2 border-r border-[#16181b]">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                Avg Accept → Store
              </span>
              <strong className="text-xl font-mono font-bold text-[#16181b]">
                {formatMinutes(orderStats.avgAcceptToStore)}
              </strong>
            </div>

            <div className="p-2 border-r border-[#16181b]">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                Avg Pickup → Customer
              </span>
              <strong className="text-xl font-mono font-bold text-emerald-800">
                {formatMinutes(orderStats.avgPickupToDelivery)}
              </strong>
            </div>

            <div className="p-2 border-r border-[#16181b]">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                Avg Delivery vs Expected
              </span>
              <strong className="text-xl font-mono font-bold text-[#16181b]">
                {orderStats.avgDeliveryVsExpected <= 0
                  ? `${Math.abs(Math.round(orderStats.avgDeliveryVsExpected))}m early`
                  : `+${Math.round(orderStats.avgDeliveryVsExpected)}m late`}
              </strong>
            </div>

            <div className="p-2 bg-[#ffd21f]/20 rounded-lg">
              <span className="block text-[10px] font-bold uppercase text-[#5d646c]">
                Avg Total Order Time
              </span>
              <strong className="text-xl font-mono font-bold text-[#16181b]">
                {formatMinutes(orderStats.avgTotalDuration)}
              </strong>
            </div>
          </div>
        )}

        {/* SECTION 1: DETAILED ORDER-BY-ORDER BREAKDOWN */}
        {reportType === 'orders' && filteredOrders.length > 0 && mode !== 'summary' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#dfe2dc] pb-1.5">
              <h2 className="font-display font-bold text-base text-[#16181b] uppercase tracking-wide">
                Detailed Order Milestones &amp; Durations
              </h2>
              <span className="text-xs text-[#5d646c]">{filteredOrders.length} records</span>
            </div>

            <div className="overflow-x-auto border border-[#16181b] rounded-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#f7f8f4] border-b border-[#16181b] text-[#5d646c] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Sl</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Order No (4-Digit)</th>
                    {isStaff && <th className="py-2.5 px-3">Rider</th>}
                    <th className="py-2.5 px-3">Accept</th>
                    <th className="py-2.5 px-3">Store Arrival</th>
                    <th className="py-2.5 px-3 bg-amber-50 font-extrabold text-black">Accept → Store</th>
                    <th className="py-2.5 px-3">Store Wait</th>
                    <th className="py-2.5 px-3">Pickup</th>
                    <th className="py-2.5 px-3 bg-emerald-50 font-extrabold text-emerald-950">Pickup → Delivery</th>
                    <th className="py-2.5 px-3">Arrived Customer</th>
                    <th className="py-2.5 px-3">Expected Time</th>
                    <th className="py-2.5 px-3 bg-blue-50 font-extrabold text-blue-950">vs Expected</th>
                    <th className="py-2.5 px-3 bg-[#ffd21f]/30 font-extrabold text-black">Total Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((o, idx) => {
                    const vsExp = formatVsExpectedBadge(o.deliveryVsExpected);
                    return (
                      <tr key={o.id} className="hover:bg-amber-50/20">
                        <td className="py-2 px-3 font-mono text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium">{o.date}</td>
                        <td className="py-2 px-3 font-mono font-bold text-sm">
                          #{o.orderNo}
                        </td>
                        {isStaff && <td className="py-2 px-3">{getUserName(o.employeeId)}</td>}
                        <td className="py-2 px-3 font-mono">{formatTime12h(o.orderAccepted)}</td>
                        <td className="py-2 px-3 font-mono">{formatTime12h(o.arrivedAtStore)}</td>

                        {/* Accept -> Store Duration */}
                        <td className="py-2 px-3 font-mono font-bold bg-amber-50/60 text-[#16181b]">
                          {formatMinutes(o.acceptToStore)}
                        </td>

                        <td className="py-2 px-3 font-mono text-gray-700">
                          {formatMinutes(o.storeWait)}
                        </td>

                        <td className="py-2 px-3 font-mono">{formatTime12h(o.orderPickedUp)}</td>

                        {/* Pickup -> Delivery Duration */}
                        <td className="py-2 px-3 font-mono font-bold bg-emerald-50 text-emerald-900">
                          {formatMinutes(o.pickupToDelivery)}
                        </td>

                        <td className="py-2 px-3 font-mono font-semibold">{formatTime12h(o.arrivedAtCustomer)}</td>
                        <td className="py-2 px-3 font-mono text-gray-600">{formatTime12h(o.expectedDeliveryTime)}</td>

                        {/* vs Expected Difference */}
                        <td className="py-2 px-3 bg-blue-50/60">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${vsExp.badgeClass}`}>
                            {vsExp.text}
                          </span>
                        </td>

                        {/* Total Duration */}
                        <td className="py-2 px-3 font-mono font-extrabold bg-[#ffd21f]/20 text-black">
                          {formatMinutes(o.totalDuration)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Grand Averages Footer */}
                <tfoot className="bg-[#16181b] text-white font-mono text-xs font-bold">
                  <tr>
                    <td colSpan={isStaff ? 4 : 3} className="py-2.5 px-3">
                      OVERALL AVERAGES ({orderStats.count} ORDERS)
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-2.5 px-3 text-[#ffd21f]">
                      {formatMinutes(orderStats.avgAcceptToStore)}
                    </td>
                    <td className="py-2.5 px-3">
                      {formatMinutes(orderStats.avgStoreWait)}
                    </td>
                    <td></td>
                    <td className="py-2.5 px-3 text-[#ffd21f]">
                      {formatMinutes(orderStats.avgPickupToDelivery)}
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-2.5 px-3 text-emerald-300">
                      {orderStats.avgDeliveryVsExpected <= 0
                        ? `${Math.abs(Math.round(orderStats.avgDeliveryVsExpected))}m early`
                        : `+${Math.round(orderStats.avgDeliveryVsExpected)}m late`}
                    </td>
                    <td className="py-2.5 px-3 text-[#ffd21f]">
                      {formatMinutes(orderStats.avgTotalDuration)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: DATE-WISE SUMMARY WITH AVERAGES */}
        {reportType === 'orders' && dateGroups.length > 0 && mode !== 'details' && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between border-b border-[#dfe2dc] pb-1.5">
              <h2 className="font-display font-bold text-base text-[#16181b] uppercase tracking-wide">
                Date-wise Performance &amp; Average Transit Times
              </h2>
              <span className="text-xs text-[#5d646c]">{dateGroups.length} days</span>
            </div>

            <div className="overflow-x-auto border border-[#16181b] rounded-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#f7f8f4] border-b border-[#16181b] text-[#5d646c] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Orders</th>
                    <th className="py-2.5 px-3">Avg Accept → Store</th>
                    <th className="py-2.5 px-3">Avg Store Wait</th>
                    <th className="py-2.5 px-3">Avg Pickup → Delivery</th>
                    <th className="py-2.5 px-3">Avg vs Expected</th>
                    <th className="py-2.5 px-3">Avg Total Time</th>
                    <th className="py-2.5 px-3">Fastest Order</th>
                    <th className="py-2.5 px-3">Slowest Order</th>
                    <th className="py-2.5 px-3">On-Time %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dateGroups.map((dg) => (
                    <tr key={dg.date} className="hover:bg-amber-50/20 font-mono">
                      <td className="py-2.5 px-3 font-medium text-black">{dg.date}</td>
                      <td className="py-2.5 px-3 font-bold">{dg.count}</td>
                      <td className="py-2.5 px-3 font-bold text-[#16181b]">{formatMinutes(dg.avgAcceptToStore)}</td>
                      <td className="py-2.5 px-3 text-gray-700">{formatMinutes(dg.avgStoreWait)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800">{formatMinutes(dg.avgPickupToDelivery)}</td>
                      <td className="py-2.5 px-3 font-bold">
                        {dg.avgDeliveryVsExpected <= 0
                          ? `${Math.abs(Math.round(dg.avgDeliveryVsExpected))}m early`
                          : `+${Math.round(dg.avgDeliveryVsExpected)}m late`}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-[#16181b]">{formatMinutes(dg.avgTotalDuration)}</td>
                      <td className="py-2.5 px-3 text-emerald-700">{formatMinutes(dg.minDuration)}</td>
                      <td className="py-2.5 px-3 text-red-700">{formatMinutes(dg.maxDuration)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800">{dg.onTimeRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: RIDER-WISE SUMMARY (When All Riders are viewed) */}
        {reportType === 'orders' && isStaff && filterEmployeeId === 'all' && riderGroups.length > 1 && mode !== 'details' && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between border-b border-[#dfe2dc] pb-1.5">
              <h2 className="font-display font-bold text-base text-[#16181b] uppercase tracking-wide">
                Rider Performance &amp; Efficiency Breakdown
              </h2>
              <span className="text-xs text-[#5d646c]">{riderGroups.length} riders</span>
            </div>

            <div className="overflow-x-auto border border-[#16181b] rounded-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#f7f8f4] border-b border-[#16181b] text-[#5d646c] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Rider Name</th>
                    <th className="py-2.5 px-3">Emp No</th>
                    <th className="py-2.5 px-3">Vehicle Plate</th>
                    <th className="py-2.5 px-3">Orders</th>
                    <th className="py-2.5 px-3">Avg Accept → Store</th>
                    <th className="py-2.5 px-3">Avg Pickup → Delivery</th>
                    <th className="py-2.5 px-3">Avg Delivery vs Expected</th>
                    <th className="py-2.5 px-3">Avg Total Time</th>
                    <th className="py-2.5 px-3">On-Time %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono">
                  {riderGroups.map((rg) => (
                    <tr key={rg.empId} className="hover:bg-amber-50/20">
                      <td className="py-2.5 px-3 font-sans font-bold text-black">{rg.name}</td>
                      <td className="py-2.5 px-3 text-gray-500">{rg.empNo}</td>
                      <td className="py-2.5 px-3 font-semibold">{rg.plate}</td>
                      <td className="py-2.5 px-3 font-bold">{rg.count}</td>
                      <td className="py-2.5 px-3 text-[#16181b]">{formatMinutes(rg.avgAcceptToStore)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800">{formatMinutes(rg.avgPickupToDelivery)}</td>
                      <td className="py-2.5 px-3 font-bold">
                        {rg.avgDeliveryVsExpected <= 0
                          ? `${Math.abs(Math.round(rg.avgDeliveryVsExpected))}m early`
                          : `+${Math.round(rg.avgDeliveryVsExpected)}m late`}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-black">{formatMinutes(rg.avgTotalDuration)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-800">{rg.onTimeRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FUEL REPORT SECTION */}
        {reportType === 'fuel' && (
          <div className="space-y-3">
            <h2 className="font-display font-bold text-base text-[#16181b] uppercase tracking-wide">
              Fuel Logs &amp; Refuel Details
            </h2>
            {filteredFuel.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No fuel logs recorded in this period.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#16181b] rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#f7f8f4] border-b border-[#16181b] text-[#5d646c] uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Rider</th>
                      <th className="py-2.5 px-3">Vehicle Plate</th>
                      <th className="py-2.5 px-3">Odometer (KM)</th>
                      <th className="py-2.5 px-3">Amount (SAR)</th>
                      <th className="py-2.5 px-3">Liters</th>
                      <th className="py-2.5 px-3">Distance</th>
                      <th className="py-2.5 px-3">Mileage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {filteredFuel.map((f) => (
                      <tr key={f.id} className="hover:bg-amber-50/20">
                        <td className="py-2.5 px-3 font-medium">{f.date}</td>
                        <td className="py-2.5 px-3">{f.time}</td>
                        <td className="py-2.5 px-3 font-sans font-medium">{getUserName(f.employeeId)}</td>
                        <td className="py-2.5 px-3 font-semibold">{f.vehicle || '—'}</td>
                        <td className="py-2.5 px-3 font-bold">{f.odo} km</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-800">{f.amount.toFixed(2)} SAR</td>
                        <td className="py-2.5 px-3">{f.liters.toFixed(2)} L</td>
                        <td className="py-2.5 px-3">{f.distance ? `${f.distance} km` : '—'}</td>
                        <td className="py-2.5 px-3 font-bold">{f.kmpl ? `${f.kmpl.toFixed(2)} km/L` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Signature lines for printed document */}
        <div className="pt-12 mt-12 border-t border-[#dfe2dc] flex justify-between items-center text-xs text-[#5d646c] font-medium">
          <div className="w-56 text-center border-t-2 border-[#16181b] pt-2">
            <span>{t('rep.signEmployee')}</span>
          </div>
          <div className="w-56 text-center border-t-2 border-[#16181b] pt-2">
            <span>{t('rep.signSupervisor')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
