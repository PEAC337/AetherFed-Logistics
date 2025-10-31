// FIX: Removed self-import of `OrderStatus` which was causing a conflict.
export enum OrderStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled'
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderHistory {
  status: OrderStatus;
  date: string;
  notes?: string;
}

export interface Order {
  id: string;
  customerName: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  shippingDetails: {
    address: string;
    carrier: string;
    trackingNumber: string;
  };
  history: OrderHistory[];
}

export enum DroneStatus {
    Idle = 'Idle',
    InTransit = 'In-Transit',
    Delivering = 'Delivering',
    Returning = 'Returning',
    Charging = 'Charging',
    Maintenance = 'Maintenance',
    Patrolling = 'Patrolling'
}

export interface Drone {
    id: string;
    model: string;
    status: DroneStatus;
    battery: number;
    health: number; // New: Overall condition percentage
    estimatedFlightTime: number; // New: In minutes
    position: {
        x: number;
        y: number;
    };
    payload: number;
    orderId?: string; // New: Link to a specific order
    telemetry: {
      signalStrength: number; // New: 0-100%
      temperature: number; // New: In Celsius
      altitude: number; // New: In meters
    }
    telemetryHistory?: {
        time: number;
        signal: number;
        temp: number;
        alt: number;
    }[];
    missionType?: 'Delivery' | 'Patrol';
    patrolPath?: { x: number; y: number }[];
    currentPatrolWaypoint?: number;
    flightHours: number;
    nextMaintenance: string;
    destination?: { x: number; y: number };
}

export interface FeedbackItem {
    id: string;
    customerName: string;
    date: string;
    comment: string;
    rating: number;
}

export interface AnalyzedFeedback {
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    summary: string;
    keywords: string[];
}

export enum InvoiceStatus {
    Paid = 'Paid',
    Due = 'Due',
    Overdue = 'Overdue'
}

export interface InvoiceItem {
    invoiceId: string;
    date: string;
    serviceDescription: string;
    droneId?: string;
    durationHours?: number;
    rate?: number;
    amount: number;
    status: InvoiceStatus;
}

export enum MaintenanceStatus {
    Scheduled = 'Scheduled',
    InProgress = 'In Progress',
    Completed = 'Completed'
}

export enum MaintenanceType {
    Routine = 'Routine Check-up',
    Repair = 'Component Repair',
    Software = 'Software Update'
}

export interface MaintenanceEvent {
    id: string;
    droneId: string;
    scheduledDate: string;
    type: MaintenanceType;
    status: MaintenanceStatus;
    notes: string;
}