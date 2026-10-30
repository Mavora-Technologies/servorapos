'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Clock, Coffee, Utensils, Printer, CheckCircle, X, Layers, ShoppingCart } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  image?: string;
}

interface CartItem extends MenuItem {
  cartItemId: string;
  quantity: number;
}

type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';
type PaymentMethod = 'Cash' | 'M-Pesa' | 'Card' | 'Both';
type MobileTab = 'menu' | 'cart';

export default function POSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('Dine-In');
  const [isLoading, setIsLoading] = useState(true);

  // Mobile view toggle state ('menu' or 'cart')
  const [mobileTab, setMobileTab] = useState<MobileTab>('menu');

  // Payment & Receipt Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashAmount, setCashAmount] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Completed Order Receipt State
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const token = localStorage.getItem('servora_token');
        const res = await fetch('http://localhost:8000/api/v1/menu/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Menu API pending');
        
        const result = await res.json();
        setMenuItems(result.data.items);
        setCategories(['All', ...result.data.categories]);
      } catch (error) {
        console.warn('POS: Awaiting backend menu configuration.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, cartItemId: crypto.randomUUID(), quantity: 1 }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear the current order?')) {
      setCart([]);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.16;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setCashAmount(total.toFixed(2));
    setMpesaAmount('0');
    setIsPaymentModalOpen(true);
  };

  const handleCompleteCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const token = localStorage.getItem('servora_token');
      const response = await fetch('http://localhost:8000/api/v1/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          orderType,
          subtotal,
          tax,
          total,
          paymentMethod,
          items: cart
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Checkout failed');

      setCompletedOrder({
        ...result.data,
        items: [...cart],
        subtotal,
        tax,
        total,
        paymentMethod,
        timestamp: new Date().toLocaleString()
      });

      setCart([]);
      setIsPaymentModalOpen(false);
      setMobileTab('menu');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] gap-4">
      
      {/* Mobile Tab Switcher (Visible only on mobile/tablet) */}
      <div className="flex lg:hidden bg-white p-1 rounded-xl border border-gray-100 shadow-sm shrink-0">
        <button
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
            mobileTab === 'menu' ? 'bg-servora-navy text-white' : 'text-gray-500 hover:text-servora-navy'
          }`}
        >
          <Layers size={16} /> Menu Catalog
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors relative ${
            mobileTab === 'cart' ? 'bg-servora-navy text-white' : 'text-gray-500 hover:text-servora-navy'
          }`}
        >
          <ShoppingCart size={16} /> Current Order
          {totalItemsCount > 0 && (
            <span className="bg-servora-core text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        
        {/* LEFT PANEL: Menu & Search (Hidden on mobile if 'cart' tab is active) */}
        <div className={`flex-1 flex-col min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${
          mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="p-4 border-b border-gray-100 space-y-3 shrink-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search menu items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat ? 'bg-servora-navy text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-servora-deepTeal">Loading menu...</div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <Utensils size={48} className="mb-4 opacity-20" />
                <p className="text-base font-medium text-servora-navy">No menu items found</p>
                <p className="text-sm mt-1">Please configure your menu in the Management tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      addToCart(item);
                      // Optional: on small screens, give a subtle feedback or keep them on menu to add more
                    }}
                    className="flex flex-col text-left bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-servora-core/30 transition-all active:scale-95 h-32"
                  >
                    <span className="text-[11px] font-semibold text-servora-teal uppercase tracking-wider mb-1 line-clamp-1">{item.category}</span>
                    <span className="text-sm font-semibold text-servora-navy line-clamp-2 leading-tight flex-1">{item.name}</span>
                    <span className="text-sm font-bold text-servora-core mt-auto">KES {item.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Cart & Checkout (Hidden on mobile if 'menu' tab is active) */}
        <div className={`w-full lg:w-[400px] flex-col bg-white rounded-xl shadow-sm border border-gray-100 shrink-0 overflow-hidden h-full ${
          mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          <div className="flex p-2 bg-gray-50 border-b border-gray-100 shrink-0">
            {(['Dine-In', 'Takeaway', 'Delivery'] as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                  orderType === type ? 'bg-white text-servora-navy shadow-sm border border-gray-200' : 'text-gray-500 hover:text-servora-navy hover:bg-gray-100'
                }`}
              >
                {type === 'Dine-In' && <Coffee size={13} />}
                {type === 'Takeaway' && <ShoppingBag size={13} />}
                {type === 'Delivery' && <Clock size={13} />}
                {type}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.cartItemId} className="flex items-start justify-between bg-white border border-gray-100 p-3 rounded-lg shadow-sm">
                  <div className="flex-1 pr-3">
                    <h4 className="text-sm font-semibold text-servora-navy line-clamp-2 leading-tight">{item.name}</h4>
                    <p className="text-xs text-servora-core font-medium mt-1">KES {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                    <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-white rounded-md transition-colors">
                      {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                    </button>
                    <span className="text-xs font-semibold text-servora-navy w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1.5 text-gray-500 hover:text-servora-core hover:bg-white rounded-md transition-colors">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>VAT (16%)</span>
                <span>KES {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-servora-navy pt-1.5 border-t border-gray-200">
                <span>Total</span>
                <span>KES {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={clearCart}
                disabled={cart.length === 0}
                className="py-2.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                Clear
              </button>
              <button 
                onClick={handleOpenPayment}
                disabled={cart.length === 0}
                className="py-2.5 text-xs font-medium text-white bg-servora-core rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CreditCard size={16} />
                Charge
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* PAYMENT METHOD MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-servora-navy">Select Payment Method</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-servora-pale p-4 rounded-xl flex justify-between items-center">
              <span className="text-sm font-medium text-servora-navy">Amount Due</span>
              <span className="text-xl font-bold text-servora-core">KES {total.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(['Cash', 'M-Pesa', 'Card', 'Both'] as PaymentMethod[]).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${
                    paymentMethod === method 
                      ? 'border-servora-core bg-blue-50/50 text-servora-core shadow-sm' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {method === 'Both' ? 'Split (Cash + M-Pesa)' : method}
                </button>
              ))}
            </div>

            {paymentMethod === 'Both' && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cash Amount (KES)</label>
                  <input 
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">M-Pesa Amount (KES)</label>
                  <input 
                    type="number"
                    value={mpesaAmount}
                    onChange={(e) => setMpesaAmount(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}

            <button 
              onClick={handleCompleteCheckout}
              disabled={isCheckingOut}
              className="w-full py-3 bg-servora-core hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 text-sm"
            >
              {isCheckingOut ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Complete Payment & Print Receipt
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW & PRINT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 print:shadow-none print:border-none print:w-full print:max-w-none">
            
            <div className="text-center border-b border-dashed border-gray-300 pb-4">
              <h2 className="text-lg font-bold text-servora-navy">SERVORA RESTAURANT</h2>
              <p className="text-[11px] text-gray-500">Mavora Technologies Branch</p>
              <p className="text-[11px] text-gray-500">Nairobi, Kenya</p>
              <div className="mt-3 font-mono text-xs font-semibold text-servora-core">
                {completedOrder.orderNumber} ({completedOrder.orderType})
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{completedOrder.timestamp}</p>
            </div>

            <div className="space-y-2 border-b border-dashed border-gray-300 pb-4 max-h-48 overflow-y-auto font-mono text-xs">
              {completedOrder.items.map((i: any) => (
                <div key={i.cartItemId} className="flex justify-between">
                  <span>{i.quantity}x {i.name}</span>
                  <span>{(i.price * i.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 font-mono text-xs border-b border-dashed border-gray-300 pb-4">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>KES {completedOrder.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT (16%)</span>
                <span>KES {completedOrder.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-servora-navy pt-1">
                <span>TOTAL</span>
                <span>KES {completedOrder.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] text-servora-teal pt-1">
                <span>Paid via:</span>
                <span className="font-semibold uppercase">{completedOrder.paymentMethod}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-400">
              <p>Thank you for dining with us!</p>
              <p>Simplify Service. Grow Smarter.</p>
            </div>

            <div className="flex gap-2 pt-2 print:hidden">
              <button 
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-servora-navy text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button 
                onClick={() => setCompletedOrder(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}