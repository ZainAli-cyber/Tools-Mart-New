export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
export type SubStatus = 'active' | 'expired' | 'suspended' | 'renewed' | 'cancelled';
export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'paypal' | 'binance' | 'bank' | 'whatsapp';

export interface Customer {
  id: string; name: string; email: string; phone: string; country: string; city: string;
  totalOrders: number; totalSpend: number; joinDate: string; status: 'active' | 'blocked';
  avatar: string; tools: string[];
}
export interface Order {
  id: string; invoiceNo: string; orderDate: string; customer: Customer;
  tool: string; duration: number; amount: number; discount: number; finalAmount: number;
  status: OrderStatus; paymentMethod: PaymentMethod; paymentStatus: 'paid' | 'pending' | 'failed';
  transactionId: string; whatsapp: string; notes: string; adminNotes: string;
  subStatus: SubStatus; activationDate: string; expiryDate: string; daysLeft: number;
}
export interface Notification {
  id: string; type: 'order' | 'payment' | 'expiry' | 'message' | 'refund' | 'ticket';
  title: string; message: string; time: string; read: boolean;
}
export interface Tool {
  id: string; name: string; category: string; price: number; status: 'active' | 'disabled';
  sales: number; revenue: number; favicon: string; featured: boolean; badge?: string;
}
export interface SupportTicket {
  id: string; customer: Customer; subject: string; message: string;
  status: 'open' | 'resolved' | 'closed'; priority: 'low' | 'medium' | 'high';
  createdAt: string; replies: { from: 'customer' | 'admin'; message: string; time: string }[];
}
export interface Coupon {
  id: string; code: string; type: 'percent' | 'flat'; value: number;
  usageLimit: number; usedCount: number; expiry: string; active: boolean; minPurchase: number;
}

const NAMES = ['Ayesha Malik','Usman Khan','Sara Tariq','Ahmed Raza','Fatima Naqvi','Hassan Bilal','Maryam Nasir','Bilal Ahmed','Zara Sheikh','Omar Farooq','Hina Qureshi','Tariq Mehmood','Nadia Rahman','Imran Hussain','Layla Khurram','Asad Javed','Rabia Ghani','Faisal Yaqoob','Amna Siddiqui','Kamran Dar'];
const CITIES = ['Lahore','Karachi','Islamabad','Rawalpindi','Multan','Faisalabad','Peshawar','Quetta','Sialkot','Gujranwala'];
const TOOL_NAMES = ['Semrush','Canva Pro','ChatGPT Plus','Envato Elements','CapCut Pro','Grammarly','Jasper AI','Helium 10','Udemy','vidIQ Boost'];
const TOOL_DOMAINS = ['semrush.com','canva.com','openai.com','envato.com','capcut.com','grammarly.com','jasper.ai','helium10.com','udemy.com','vidiq.com'];

export const MOCK_CUSTOMERS: Customer[] = NAMES.map((name, i) => ({
  id: `C${String(i+1).padStart(3,'0')}`, name,
  email: `${name.toLowerCase().replace(/ /g,'.')}@gmail.com`,
  phone: `+9230${String(10000000+i*7654321).slice(0,8)}`,
  country: 'Pakistan', city: CITIES[i%CITIES.length],
  totalOrders: 1+Math.floor(i*0.6), totalSpend: 556+(i*1234),
  joinDate: `2026-0${(i%9)+1}-${String((i%28)+1).padStart(2,'0')}`,
  status: i===5?'blocked':'active',
  avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=cc1a1a`,
  tools: [TOOL_NAMES[i%10], TOOL_NAMES[(i+3)%10]],
}));

const STATUS_LIST: OrderStatus[] = ['approved','approved','approved','pending','rejected','refunded','cancelled'];
const PM_LIST: PaymentMethod[] = ['easypaisa','jazzcash','paypal','binance','bank','whatsapp','easypaisa'];

export const MOCK_ORDERS: Order[] = MOCK_CUSTOMERS.slice(0,15).map((c, i) => {
  const daysLeft = Math.max(0, 30 - i*2);
  const am = 556 + i*200;
  return {
    id: `ORD${String(i+1).padStart(4,'0')}`, invoiceNo: `INV-${String(100+i).padStart(3,'0')}`,
    orderDate: `2026-07-${String(28-i>0?28-i:1).padStart(2,'0')}`,
    customer: c, tool: TOOL_NAMES[i%10], duration: [1,3,6,12][i%4],
    amount: am, discount: Math.floor(am*0.1), finalAmount: Math.floor(am*0.9),
    status: STATUS_LIST[i%STATUS_LIST.length], paymentMethod: PM_LIST[i%PM_LIST.length],
    paymentStatus: i%5===3?'pending':i%5===4?'failed':'paid',
    transactionId: `TXN${(1000000+i*987654).toString(16).toUpperCase().slice(0,8)}`,
    whatsapp: c.phone, notes:'', adminNotes:'',
    subStatus: daysLeft>7?'active':daysLeft>0?'active':'expired',
    activationDate: '2026-07-01',
    expiryDate: `2026-08-${String(Math.max(1,28-i)).padStart(2,'0')}`,
    daysLeft,
  };
});

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id:'n1', type:'order', title:'New Order', message:'Ayesha Malik ordered Canva Pro (1 Month)', time:'2 min ago', read:false },
  { id:'n2', type:'payment', title:'Payment Screenshot', message:'Usman Khan uploaded payment SS for Semrush', time:'5 min ago', read:false },
  { id:'n3', type:'expiry', title:'Subscription Expiring', message:'Sara Tariq — ChatGPT Plus expires in 2 days', time:'1 hr ago', read:false },
  { id:'n4', type:'message', title:'Customer Message', message:'Ahmed Raza sent a support message', time:'2 hr ago', read:true },
  { id:'n5', type:'refund', title:'Refund Request', message:'Fatima Naqvi requested refund for vidIQ', time:'3 hr ago', read:true },
  { id:'n6', type:'order', title:'New Order', message:'Hassan Bilal ordered Udemy (3 Months)', time:'5 hr ago', read:true },
];

export const MOCK_TOOLS: Tool[] = TOOL_NAMES.map((name, i) => ({
  id: `T${i+1}`, name,
  category: ['SEO','Design','AI','Design','Video','Writing','AI','SEO','Learning','YouTube'][i],
  price: [556,556,1668,556,1390,556,556,973,1390,973][i],
  status: 'active', sales: 15+(i*13), revenue: 8000+(i*9500),
  favicon: `https://www.google.com/s2/favicons?sz=128&domain=${TOOL_DOMAINS[i]}`,
  featured: i<3, badge: i===0?'Best Seller':i===1?'Popular':i===2?'Trending':undefined,
}));

export const MOCK_TICKETS: SupportTicket[] = [
  { id:'T001', customer: MOCK_CUSTOMERS[0], subject:'Cannot access Canva Pro', message:'I purchased but cannot login. Please help urgently.', status:'open', priority:'high', createdAt:'2026-07-30', replies:[] },
  { id:'T002', customer: MOCK_CUSTOMERS[1], subject:'Semrush showing limited data', message:'My Semrush account shows restricted access.', status:'open', priority:'medium', createdAt:'2026-07-29', replies:[{from:'admin',message:'We are looking into this.',time:'2026-07-29'}] },
  { id:'T003', customer: MOCK_CUSTOMERS[2], subject:'Payment not confirmed', message:'I sent payment 2 hours ago, still no access.', status:'resolved', priority:'high', createdAt:'2026-07-28', replies:[{from:'admin',message:'Access granted. Apologies for delay.',time:'2026-07-28'}] },
];

export const MOCK_COUPONS: Coupon[] = [
  { id:'CPN001', code:'SAVE20', type:'percent', value:20, usageLimit:100, usedCount:45, expiry:'2026-08-31', active:true, minPurchase:500 },
  { id:'CPN002', code:'FLAT200', type:'flat', value:200, usageLimit:50, usedCount:12, expiry:'2026-09-15', active:true, minPurchase:1000 },
  { id:'CPN003', code:'WELCOME10', type:'percent', value:10, usageLimit:200, usedCount:198, expiry:'2026-07-31', active:false, minPurchase:0 },
];

export const MONTHLY_REVENUE = [
  {month:'Jan',revenue:45000,orders:32},{month:'Feb',revenue:52000,orders:38},{month:'Mar',revenue:61000,orders:45},
  {month:'Apr',revenue:58000,orders:42},{month:'May',revenue:72000,orders:55},{month:'Jun',revenue:85000,orders:63},
  {month:'Jul',revenue:91000,orders:71},{month:'Aug',revenue:78000,orders:58},{month:'Sep',revenue:95000,orders:74},
  {month:'Oct',revenue:102000,orders:81},{month:'Nov',revenue:118000,orders:92},{month:'Dec',revenue:134000,orders:105},
];

export const TOOL_REVENUE = MOCK_TOOLS.map(t => ({ name: t.name, revenue: t.revenue, sales: t.sales }));
export const PAYMENT_BREAKDOWN = [
  {name:'EasyPaisa',value:35},{name:'JazzCash',value:28},{name:'PayPal',value:18},{name:'Binance',value:12},{name:'Bank',value:7},
];
