import React, { useState, useMemo } from 'react';
import {
  Camera,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { User, OrderEntry, LanguageCode } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  formatMinutes,
  formatVsExpectedBadge,
  formatTime12h,
} from '../utils/timeCalculations';

interface OrdersViewProps {
  orders: OrderEntry[];
  users: User[];
  currentUser: User;
  onOpenScan: () => void;
  onOpenAdd: () => void;
  onEditOrder: (order: OrderEntry) => void;
  onDeleteOrder: (orderId: string) => void;
  onDeleteAllOrders?: () => void;
  lang: LanguageCode;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  users,
  currentUser,
  onOpenScan,
  onOpenAdd,
  onEditOrder,
  onDeleteOrder,
  onDeleteAllOrders,
  lang,
}) => {
  const t = (k: string) => getTranslation(lang, k);
  const isStaff = currentUser.role !== 'user';
  const isAdmin = currentUser.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter scoped orders
  const visibleOrders = useMemo(() => {
    return orders.filter((o) => {
      // User can only see own orders unless supervisor or admin
      if (!isStaff && o.employeeId !== currentUser.id) return false;
      if (filterEmployeeId !== 'all' && o.employeeId !== filterEmployeeId) return false;
      if (fromDate && o.date < fromDate) return false;
      if (toDate && o.date > toDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = users.find((u) => u.id === o.employeeId);
        const empName = emp ? emp.name.toLowerCase() : '';
        const empNo = emp ? emp.empNo.toLowerCase() : '';
        const matchNo = o.orderNo.toLowerCase().includes(q) || (o.fullOrderNo && o.fullOrderNo.toLowerCase().includes(q));
        const matchDate = o.date.includes(q);
        return matchNo || matchDate || empName.includes(q) || empNo.includes(q);
      }
      return true;
    });
  }, [orders, isStaff, currentUser, filterEmployeeId, fromDate, toDate, searchQuery, users]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!visibleOrders.length) {
      return {
        count: 0,
        avgAcceptToStore: 0,
        avgStoreWait: 0,
        avgPickupToDelivery: 0,
        avgDeliveryVsExpected: 0,
        avgTotalTime: 0,
        earlyOrOnTimeCount: 0,
        onTimeRate: 0,
      };
    }
    const count = visibleOrders.length;
    const sumAcceptToStore = visibleOrders.reduce((acc, o) => acc + (o.acceptToStore || 0), 0);
    const sumStoreWait = visibleOrders.reduce((acc, o) => acc + (o.storeWait || 0), 0);
    const sumPickupToDelivery = visibleOrders.reduce((acc, o) => acc + (o.pickupToDelivery || 0), 0);
    const sumTotalTime = visibleOrders.reduce((acc, o) => acc + (o.totalDuration || 0), 0);
    const sumVsExpected = visibleOrders.reduce((acc, o) => acc + (o.deliveryVsExpected || 0), 0);
    const earlyOrOnTimeCount = visibleOrders.filter((o) => (o.deliveryVsExpected || 0) <= 0).length;

    return {
      count,
      avgAcceptToStore: sumAcceptToStore / count,
      avgStoreWait: sumStoreWait / count,
      avgPickupToDelivery: sumPickupToDelivery / count,
      avgDeliveryVsExpected: sumVsExpected / count,
      avgTotalTime: sumTotalTime / count,
      earlyOrOnTimeCount,
      onTimeRate: Math.round((earlyOrOnTimeCount / count) * 100),
    };
  }, [visibleOrders]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const pageIndex = Math.min(currentPage, totalPages);
  const pagedOrders = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return visibleOrders.slice(start, start + pageSize);
  }, [visibleOrders, pageIndex, pageSize]);

  const getUserName = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name : '—';
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#16181b]">
              {t('tab.orders')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fff6c7] border border-[#ffd21f] text-xs font-mono font-bold text-[#16181b]">
              {orders.length} saved
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5d646c] mt-0.5">
            Capture order screenshots, extract last 4 digits, and track all transit stages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenScan}
            className="px-4 py-2 text-sm font-bold bg-[#ffd21f] hover:bg-[#ffdb4d] text-[#16181b] rounded-xl border-1.5 border-[#16181b] shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>{t('btn.scan')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdd}
            className="px-4 py-2 text-sm font-bold bg-white hover:bg-gray-50 text-[#16181b] rounded-xl border-1.5 border-[#16181b] shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btn.addOrder')}</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      {visibleOrders.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Total Orders */}
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs">
            <span className="block text-xs font-bold text-[#5d646c] uppercase tracking-wider">
              {t('stat.totalOrders')}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-mono font-bold text-[#16181b]">
                {stats.count}
              </strong>
              <span className="text-xs text-emerald-700 font-semibold">
                {stats.onTimeRate}% on-time
              </span>
            </div>
          </div>

          {/* Card 2: Avg Accept to Store */}
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs">
            <span className="block text-xs font-bold text-[#5d646c] uppercase tracking-wider">
              {t('stat.avgAcceptToStore')}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-2xl font-mono font-bold text-[#16181b]">
                {formatMinutes(stats.avgAcceptToStore)}
              </strong>
              <span className="text-[11px] text-[#5d646c]">to store</span>
            </div>
          </div>

          {/* Card 3: Avg Store Wait */}
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs">
            <span className="block text-xs font-bold text-[#5d646c] uppercase tracking-wider">
              {t('stat.avgStoreWait')}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-2xl font-mono font-bold text-[#16181b]">
                {formatMinutes(stats.avgStoreWait)}
              </strong>
              <span className="text-[11px] text-[#5d646c]">store wait</span>
            </div>
          </div>

          {/* Card 4: Avg Pickup to Delivery */}
          <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs">
            <span className="block text-xs font-bold text-[#5d646c] uppercase tracking-wider">
              {t('stat.avgPickupToDelivery')}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-2xl font-mono font-bold text-emerald-800">
                {formatMinutes(stats.avgPickupToDelivery)}
              </strong>
              <span className="text-[11px] text-[#5d646c]">transit</span>
            </div>
          </div>

          {/* Card 5: Avg vs Expected */}
          <div className="bg-white border-2 border-amber-300 bg-amber-50/40 rounded-xl p-3.5 shadow-xs col-span-2 lg:col-span-1">
            <span className="block text-xs font-bold text-[#5d646c] uppercase tracking-wider">
              {t('stat.avgDeliveryVsExpected')}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-2xl font-mono font-bold text-[#16181b]">
                {stats.avgDeliveryVsExpected <= 0
                  ? `${Math.abs(Math.round(stats.avgDeliveryVsExpected))}m early`
                  : `+${Math.round(stats.avgDeliveryVsExpected)}m late`}
              </strong>
              <span className="text-[11px] text-emerald-700 font-semibold">avg</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-[#dfe2dc] rounded-xl p-3.5 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-[#5d646c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search by 4-digit Order No, date, or rider..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#dfe2dc] rounded-lg focus:outline-none focus:border-black"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isStaff && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#5d646c] font-bold">Rider:</span>
            <select
              className="px-2 py-1.5 bg-[#f8f9fa] border border-[#dfe2dc] rounded-lg text-xs"
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
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

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#5d646c] font-bold">From:</span>
          <input
            type="date"
            className="px-2 py-1 bg-[#f8f9fa] border border-[#dfe2dc] rounded-lg text-xs"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#5d646c] font-bold">To:</span>
          <input
            type="date"
            className="px-2 py-1 bg-[#f8f9fa] border border-[#dfe2dc] rounded-lg text-xs"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {(searchQuery || fromDate || toDate || filterEmployeeId !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFromDate('');
              setToDate('');
              setFilterEmployeeId('all');
            }}
            className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 underline cursor-pointer"
          >
            Clear filters
          </button>
        )}

        {isAdmin && orders.length > 0 && onDeleteAllOrders && (
          <button
            type="button"
            onClick={onDeleteAllOrders}
            className="ml-auto text-xs text-[#5d646c] hover:text-red-600 font-medium px-2 py-1 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete all
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#dfe2dc] rounded-2xl shadow-xs overflow-hidden">
        {pagedOrders.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#fff6c7] text-[#16181b] mx-auto flex items-center justify-center font-bold">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#16181b]">
              No orders found
            </h3>
            <p className="text-xs sm:text-sm text-[#5d646c] max-w-md mx-auto">
              Scan your rider order screenshot or use the sample attached image to extract Order No. (last 4 digits), timeline times, and durations.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={onOpenScan}
                className="px-4 py-2 text-xs font-bold bg-[#ffd21f] text-[#16181b] rounded-xl border border-black shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Scan Screenshot
              </button>
              <button
                type="button"
                onClick={onOpenAdd}
                className="px-4 py-2 text-xs font-bold bg-white text-[#16181b] rounded-xl border border-[#dfe2dc]"
              >
                Add Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#f7f8f4] border-b border-[#dfe2dc] text-[#5d646c] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-3.5">Sl</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Order No. (4 Digits)</th>
                  {isStaff && <th className="py-3 px-3.5">Rider</th>}
                  <th className="py-3 px-3.5">Accept</th>
                  <th className="py-3 px-3.5">Store Arrival</th>
                  <th className="py-3 px-3.5">Accept → Store</th>
                  <th className="py-3 px-3.5">Pickup</th>
                  <th className="py-3 px-3.5">Pickup → Delivery</th>
                  <th className="py-3 px-3.5">Arrived Customer</th>
                  <th className="py-3 px-3.5">Expected Time</th>
                  <th className="py-3 px-3.5">vs Expected</th>
                  <th className="py-3 px-3.5">Total Time</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe2dc]">
                {pagedOrders.map((o, index) => {
                  const vsExp = formatVsExpectedBadge(o.deliveryVsExpected);
                  const sl = (pageIndex - 1) * pageSize + index + 1;
                  return (
                    <tr key={o.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-[#5d646c]">
                        {sl}
                      </td>

                      <td className="py-3 px-3.5 font-medium text-[#16181b]">
                        {o.date}
                      </td>

                      {/* Order No - strictly last 4 digits */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#fff3b8] text-[#16181b] border border-[#e9d26a] font-mono font-bold text-sm tracking-wider">
                            #{o.orderNo}
                          </span>
                        </div>
                      </td>

                      {isStaff && (
                        <td className="py-3 px-3.5 font-medium text-[#16181b]">
                          {getUserName(o.employeeId)}
                        </td>
                      )}

                      <td className="py-3 px-3.5 font-mono text-[#16181b]">
                        {formatTime12h(o.orderAccepted)}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-[#16181b]">
                        {formatTime12h(o.arrivedAtStore)}
                      </td>

                      {/* Accept -> Store Duration */}
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[#16181b] font-mono font-semibold text-xs">
                          {formatMinutes(o.acceptToStore)}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-[#16181b]">
                        {formatTime12h(o.orderPickedUp)}
                      </td>

                      {/* Pickup -> Delivery Transit */}
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                          {formatMinutes(o.pickupToDelivery)}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 font-mono font-bold text-emerald-950">
                        {formatTime12h(o.arrivedAtCustomer)}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-blue-900 font-semibold">
                        {formatTime12h(o.expectedDeliveryTime)}
                      </td>

                      {/* Delivery vs Expected Pill */}
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${vsExp.badgeClass}`}>
                          {vsExp.text}
                        </span>
                      </td>

                      {/* Total Duration */}
                      <td className="py-3 px-3.5 font-mono font-extrabold text-sm text-[#16181b]">
                        {formatMinutes(o.totalDuration)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEditOrder(o)}
                            className="p-1.5 rounded-lg border border-[#dfe2dc] hover:border-black text-[#5d646c] hover:text-black transition-colors"
                            title="Edit Order"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteOrder(o.id)}
                            className="p-1.5 rounded-lg border border-[#dfe2dc] hover:border-red-600 text-[#5d646c] hover:text-red-600 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer / Pager */}
        {visibleOrders.length > 0 && (
          <div className="px-4 py-3 bg-[#f7f8f4] border-t border-[#dfe2dc] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5d646c]">
            <div className="flex items-center gap-2">
              <span>Showing {pagedOrders.length} of {visibleOrders.length} orders</span>
              <span>•</span>
              <label className="flex items-center gap-1">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-[#dfe2dc] rounded px-1.5 py-0.5"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageIndex <= 1}
                onClick={() => setCurrentPage(pageIndex - 1)}
                className="px-2.5 py-1 rounded border border-[#dfe2dc] bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono">
                Page {pageIndex} of {totalPages}
              </span>
              <button
                type="button"
                disabled={pageIndex >= totalPages}
                onClick={() => setCurrentPage(pageIndex + 1)}
                className="px-2.5 py-1 rounded border border-[#dfe2dc] bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
