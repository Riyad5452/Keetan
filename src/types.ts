export type Role = 'admin' | 'supervisor' | 'user';
export type VehicleType = 'motorcycle' | 'car' | 'van';

export interface User {
  id: string;
  empNo: string;
  name: string;
  role: Role;
  username: string;
  salt: string;
  hash: string;
  active: boolean;
  iqama: string;
  iqamaExp: string;
  nation: string;
  phone: string;
  plate: string;
  vtype: VehicleType;
  allowance: number; // Monthly fuel limit in SAR (0 = no limit)
  joined: string;
  defaultPw?: boolean;
  password?: string;
  createdAt: number;
}

export interface OrderEntry {
  id: string;
  createdAt: number;
  employeeId: string;
  date: string; // YYYY-MM-DD
  orderNo: string; // Strictly last 4 digits (e.g. "1079")
  fullOrderNo?: string; // Full raw order number if scanned (e.g. "5736823099441079")
  orderAccepted: string; // HH:mm
  arrivedAtStore: string; // HH:mm
  orderPickedUp: string; // HH:mm
  atDestination: string; // HH:mm
  arrivedAtCustomer: string; // HH:mm
  expectedDeliveryTime: string; // HH:mm
  // Calculated durations in minutes:
  acceptToStore: number; // orderAccepted -> arrivedAtStore
  storeWait: number; // arrivedAtStore -> orderPickedUp
  pickupToDelivery: number; // orderPickedUp -> arrivedAtCustomer
  destinationToCustomer: number; // atDestination -> arrivedAtCustomer
  totalDuration: number; // orderAccepted -> arrivedAtCustomer
  deliveryVsExpected: number; // arrivedAtCustomer minus expectedDeliveryTime (negative = early, positive = late)
  notes?: string;
}

export interface FuelEntry {
  id: string;
  createdAt: number;
  employeeId: string;
  date: string;
  time: string;
  vehicle: string;
  odo: string;
  amount: number;
  price: number;
  liters: number;
  distance?: number | null;
  kmpl?: number | null;
}

export type LanguageCode = 'en' | 'ar' | 'bn' | 'ur';
