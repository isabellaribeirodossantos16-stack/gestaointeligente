
import React, { useState, useEffect } from 'react';
import { Client, PaymentStatus, Payable, Transaction, TransactionType, MessageTemplate } from '../types';
import { storageService } from '../services/storageService';
import { QrCode, AlertCircle, Calendar, DollarSign, History, X, MessageCircle, RefreshCw, CheckCircle, Clock } from 'lucide-react';

// Helper Component for Live Countdowns
const CountdownLabel = ({ dateStr, timeStr, type, isPaid }: { dateStr: string, timeStr?: string, type: 'precise' | 'simple', isPaid: boolean }) => {
  const [label, setLabel] = useState<string | null>(null);
  const [styleClass, setStyleClass] = useState('');

  useEffect(() => {
    if (isPaid || !dateStr) {
      setLabel(null);
      return;
    }

    const tick = () => {
       const now = new Date();
       const [y, m, d] = dateStr.split('-').map(Number);
       
       // Default time to end of day if not provided
       const [hours, minutes] = (timeStr || '23:59').split(':').map(Number);
       
       // Target for precise calc
       const target = new Date(y, m - 1, d, hours, minutes, 59);
       const diff = target.getTime() - now.getTime();

       if (type === 'simple') {
         // Logic for Payables (Day based)
         const today = new Date(); 
         today.setHours(0,0,0,0);
         const targetDay = new Date(y, m - 1, d);
         targetDay.setHours(0,0,0,0);
         
         const dayDiff = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

         if (dayDiff < 0) {
            setLabel('Vencida');
            setStyleClass('text-red-600 font-bold uppercase');
         } else if (dayDiff === 0) {
            setLabel('Vencendo Hoje');
             setStyleClass('text-orange-600 font-bold uppercase animate-pulse');
         } else if (dayDiff > 0 && dayDiff <= 30) {
            setLabel(`Vence em ${dayDiff} dias`);
            setStyleClass('text-slate-500 font-medium');
         } else {
            setLabel(null);
         }
       } else {
         // Logic for Clients/Plans (Precise Time)
         if (diff < 0) {
            setLabel('Vencido');
            setStyleClass('text-red-600 font-bold uppercase');
         } else if (diff < 24 * 60 * 60 * 1000) {
            // Less than 24h - Show precise timer
            const h = Math.floor(diff / (1000 * 60 * 60));
            const min = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setLabel(`Vence em ${String(h).padStart(2,'0')}h:${String(min).padStart(2,'0')}m:${String(s).padStart(2,'0')}s`);
            setStyleClass('text-orange-600 font-mono font-bold');
         } else if (diff < 30 * 24 * 60 * 60 * 1000) {
            // More than 24h - Show Calendar Days
            // Calculate difference based on midnight to midnight to ensure "Tomorrow" is always "1 day"
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            
            const targetStart = new Date(y, m - 1, d);
            targetStart.setHours(0,0,0,0);
            
            const days = Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

            setLabel(`Vence em ${days} dia${days > 1 ? 's' : ''}`);
            setStyleClass('text-blue-600 font-medium');
         } else {
            setLabel(null); 
         }
       }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr, type, isPaid]);

  if (!label) return null;

  return (
    <div className={`text-xs mt-1 px-2 py-0.5 rounded bg-white/50 border border-transparent w-fit ${styleClass}`}>
      {label}
    </div>
  );
};

export const Financials: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [view, setView] = useState<'receivables' | 'plans' | 'payables'>('receivables');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  
  // Payment Modal
  const [selectedItem, setSelectedItem] = useState<{type: 'client' | 'payable', data: any, currentValue: number} | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'total' | 'partial'>('total');
  
  // QR Modal
  const [qrModal, setQrModal] = useState<{isOpen: boolean, data: any, value: number} | null>(null);

  // History Modal
  const [historyModal, setHistoryModal] = useState<{isOpen: boolean, id: string, name: string} | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Message Modal
  const [msgModal, setMsgModal] = useState<{isOpen: boolean, client: Client} | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  // Renew Modal
  const [renewModal, setRenewModal] = useState<{isOpen: boolean, client: Client, planValue: number} | null>(null);
  const [renewPaymentStatus, setRenewPaymentStatus] = useState<'PAID' | 'PENDING' | null>(null);
  const [manualDate, setManualDate] = useState('');

  useEffect(() => {
    loadData();
    // Interval to refresh alerts visually
    const interval = setInterval(() => {
      setClients(prev => [...prev]); // Force re-render for time checks
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setClients(storageService.getClients());
    setPayables(storageService.getPayables());
    setTransactions(storageService.getTransactions());
    setTemplates(storageService.getMessages());
  };

  // Helper to determine alert status based on a specific date/time
  const getDateStatusColor = (dateStr: string, timeStr: string, isAlertEnabled: boolean, isPaidOrCompleted: boolean) => {
    if (isPaidOrCompleted) return 'border-green-500 bg-green-50';
    
    if (!dateStr) return 'border-slate-200 bg-white';

    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    
    // Add time if provided, otherwise end of day for comparison
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      due.setHours(hours, minutes, 0, 0);
    } else {
      due.setHours(23, 59, 59, 999);
    }

    const diffMs = due.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      // Overdue/Expired
      return isAlertEnabled ? 'border-red-500 animate-blink-red bg-red-50' : 'border-red-300 bg-red-50';
    } else if (diffHours <= 24) {
      // Upcoming < 24h
      return isAlertEnabled ? 'border-orange-500 animate-blink-orange bg-orange-50' : 'border-orange-300 bg-orange-50';
    }
    return 'border-slate-200 bg-white';
  };

  const getFilteredItems = (items: any[], dateField: string, statusField: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return items.filter(item => {
      if (!item[dateField]) return false;

      // Parse date manually to avoid UTC conversion issues
      const [y, m, d] = item[dateField].split('-').map(Number);
      const due = new Date(y, m - 1, d);
      due.setHours(0,0,0,0);
      
      const isPaid = view === 'plans' ? false : item[statusField] === PaymentStatus.PAID;
      
      if (filter === 'all') return true;
      if (filter === 'overdue') return !isPaid && due < today;
      if (filter === 'today') return !isPaid && due.getTime() === today.getTime();
      if (filter === 'upcoming') return !isPaid && due > today;
      return true;
    });
  };

  const handlePayment = () => {
    if (!selectedItem) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return alert("Valor inválido");

    const transaction: Transaction = {
      id: Date.now().toString(),
      description: selectedItem.type === 'client' ? `Pagamento - ${selectedItem.data.name}` : selectedItem.data.description,
      value: amount,
      date: new Date().toISOString().split('T')[0],
      type: selectedItem.type === 'client' ? TransactionType.INCOME : TransactionType.EXPENSE,
      clientId: selectedItem.type === 'client' ? selectedItem.data.id : undefined,
      payableId: selectedItem.type === 'payable' ? selectedItem.data.id : undefined,
    };

    // Save transaction
    const newTransactions = [...transactions, transaction];
    setTransactions(newTransactions);
    storageService.saveTransactions(newTransactions);

    // Calculate New Balance / Status
    const currentDebt = selectedItem.currentValue;
    const remaining = currentDebt - amount;
    
    const isFullyPaid = paymentType === 'total' || remaining <= 0.01;
    const newStatus = isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING;
    const newBalance = isFullyPaid ? undefined : remaining;

    if (selectedItem.type === 'client') {
      const updatedClients = clients.map(c => {
        if (c.id === selectedItem.data.id) {
          return { 
            ...c, 
            status: newStatus,
            balance: newBalance 
          };
        }
        return c;
      });
      setClients(updatedClients);
      storageService.saveClients(updatedClients);
    } else {
      const updatedPayables = payables.map(p => {
        if (p.id === selectedItem.data.id) {
          return { 
            ...p, 
            status: newStatus,
            balance: newBalance
          };
        }
        return p;
      });
      setPayables(updatedPayables);
      storageService.savePayables(updatedPayables);
    }

    setSelectedItem(null);
    setPaymentAmount('');
  };

  const toggleAlert = (type: 'client' | 'payable', id: string) => {
    if (type === 'client') {
      const updated = clients.map(c => c.id === id ? { ...c, alertEnabled: !c.alertEnabled } : c);
      setClients(updated);
      storageService.saveClients(updated);
    } else {
      const updated = payables.map(p => p.id === id ? { ...p, alertEnabled: !p.alertEnabled } : p);
      setPayables(updated);
      storageService.savePayables(updated);
    }
  };

  const openPaymentModal = (type: 'client' | 'payable', item: any, totalValue: number) => {
    const currentDebt = item.balance !== undefined ? item.balance : totalValue;
    setSelectedItem({ type, data: item, currentValue: currentDebt });
    setPaymentType('total');
    setPaymentAmount(currentDebt.toString());
  };

  const handleRenewal = (daysToAdd: number, multiplier: number, specificDate?: string) => {
    if (!renewModal) return;
    if (!renewPaymentStatus) {
      alert("Por favor, selecione se a renovação é 'Paga' ou 'A Prazo' antes de confirmar.");
      return;
    }

    const { client, planValue } = renewModal;

    let newDateStr = '';

    if (specificDate) {
      newDateStr = specificDate;
    } else {
      // Logic: Add days to current expiry date
      const baseDateStr = client.planExpiryDate || new Date().toISOString().split('T')[0];
      const [y, m, d] = baseDateStr.split('-').map(Number);
      const baseDate = new Date(y, m - 1, d);
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      
      const ny = baseDate.getFullYear();
      const nm = String(baseDate.getMonth() + 1).padStart(2, '0');
      const nd = String(baseDate.getDate()).padStart(2, '0');
      newDateStr = `${ny}-${nm}-${nd}`;
    }

    // Debt Calculation Logic
    let newBalance = client.balance !== undefined ? client.balance : 0;
    
    // Initializing current debt if it was undefined (implicit Paid)
    if (client.status === PaymentStatus.PAID && client.balance === undefined) {
       newBalance = 0;
    } else if (client.balance === undefined) {
       newBalance = planValue; // Default debt if PENDING but no balance field
    }

    // Only add value if status is PENDING (A Prazo)
    if (renewPaymentStatus === 'PENDING') {
      const addedValue = planValue * multiplier;
      // If manual date (multiplier 0), we don't automatically add value unless specified, 
      // but logic here implies multiplier=0 for manual. 
      // If the user wants to add debt for manual date, we'd need another input, 
      // but usually manual adjustment is just date. 
      // For the +30/+60 buttons, multiplier is set.
      newBalance += addedValue;
    }

    const updatedClients = clients.map(c => {
      if (c.id === client.id) {
        return { 
          ...c, 
          planExpiryDate: newDateStr,
          balance: newBalance > 0 ? newBalance : undefined, // Clean up balance if 0
          // If adding debt (PENDING), force status to A PAGAR. 
          // If PAID renewal, we don't change status (if they had debt, they keep it. If they were paid, they stay paid).
          status: renewPaymentStatus === 'PENDING' ? PaymentStatus.PENDING : (newBalance > 0 ? PaymentStatus.PENDING : PaymentStatus.PAID)
        };
      }
      return c;
    });

    setClients(updatedClients);
    storageService.saveClients(updatedClients);
    setRenewModal(null);
    setRenewPaymentStatus(null);
    setManualDate('');
  };

  const getHistoryTransactions = () => {
    if (!historyModal) return [];
    return transactions.filter(t => 
      t.clientId === historyModal.id || t.payableId === historyModal.id
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const generatePixQr = (value: number, name: string) => {
    const settings = storageService.getSettings();
    const pixKey = settings.pixKey || 'admin@gestor.com';
    const qrData = `Pagar R$ ${value.toFixed(2)} para ${name} (Chave: ${pixKey})`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  };

  const sendWhatsApp = (client: Client, message?: string) => {
    const phone = client.whatsapp.replace(/\D/g, '');
    const text = message ? `&text=${encodeURIComponent(message.replace('{nome}', client.name))}` : '';
    window.open(`https://wa.me/55${phone}?${text}`, '_blank');
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Vencimentos</h2>
        <div className="flex bg-white rounded-lg shadow-sm p-1 border overflow-x-auto max-w-full">
          <button 
            onClick={() => setView('receivables')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${view === 'receivables' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Clientes
          </button>
          <button 
            onClick={() => setView('plans')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${view === 'plans' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Planos
          </button>
          <button 
            onClick={() => setView('payables')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${view === 'payables' ? 'bg-red-100 text-red-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Contas (Pagar)
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'overdue', 'today', 'upcoming'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              filter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'overdue' ? 'Vencidos' : f === 'today' ? 'Vence Hoje' : 'A Vencer'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {view === 'receivables' && (
          getFilteredItems(clients, 'paymentDueDate', 'status').map(client => {
             const plans = storageService.getPlans();
             const plan = plans.find(p => p.id === client.planId);
             const originalValue = plan ? plan.value : 0;
             const currentValue = client.balance !== undefined ? client.balance : originalValue;

             const cardClass = getDateStatusColor(client.paymentDueDate, client.paymentDueTime, client.alertEnabled, client.status === PaymentStatus.PAID);
             
             return (
              <div key={client.id} className={`border-l-4 rounded-lg shadow-sm p-4 relative transition-all ${cardClass}`}>
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <h3 className="font-bold text-slate-800">{client.name}</h3>
                      <span className="text-xs text-slate-500">{client.whatsapp}</span>
                      {/* Countdown Label for Client Payment */}
                      <CountdownLabel 
                        dateStr={client.paymentDueDate} 
                        timeStr={client.paymentDueTime} 
                        type="precise" 
                        isPaid={client.status === PaymentStatus.PAID} 
                      />
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="font-bold text-lg">R$ {currentValue.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${client.status === PaymentStatus.PAID ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                        {client.status}
                      </span>
                   </div>
                </div>
                
                <div className="text-sm text-slate-600 mb-4 space-y-1 mt-2">
                  <div className="flex items-center gap-1 font-medium"><Calendar size={14} className="text-slate-400"/> Pgto: {client.paymentDueDate} {client.paymentDueTime}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400"><Calendar size={14} className="text-slate-300"/> Plano: {client.planExpiryDate || '---'}</div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => openPaymentModal('client', client, originalValue)}
                    className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700"
                  >
                    Pagar
                  </button>
                  <button 
                    onClick={() => setMsgModal({isOpen: true, client})}
                    className="px-3 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-bold"
                    title="Enviar Mensagem"
                  >
                    <MessageCircle size={18} />
                  </button>
                  <button 
                    onClick={() => setQrModal({isOpen: true, data: client, value: currentValue})}
                    className="px-3 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                  >
                    <QrCode size={18}/>
                  </button>
                  <button 
                    onClick={() => setHistoryModal({isOpen: true, id: client.id, name: client.name})}
                    className="px-3 bg-green-100 text-green-700 rounded hover:bg-green-200 font-bold"
                    title="Histórico de Pagamentos"
                  >
                    <DollarSign size={18}/>
                  </button>
                  <button 
                    onClick={() => toggleAlert('client', client.id)}
                    className={`px-3 rounded border ${client.alertEnabled ? 'text-orange-500 border-orange-200 bg-orange-50' : 'text-slate-400 border-slate-200'}`}
                  >
                    <AlertCircle size={18}/>
                  </button>
                </div>
              </div>
             );
          })
        )}

        {view === 'plans' && (
           getFilteredItems(clients, 'planExpiryDate', 'status').map(client => {
              const plans = storageService.getPlans();
              const plan = plans.find(p => p.id === client.planId);
              
              // Status Logic for PLANS uses planExpiryDate
              const cardClass = getDateStatusColor(client.planExpiryDate, client.planExpiryTime, client.alertEnabled, false); // Always false for "Paid" because plans expire by date

              return (
               <div key={`plan-${client.id}`} className={`border-l-4 rounded-lg shadow-sm p-4 relative transition-all ${cardClass}`}>
                 <div className="flex justify-between items-start mb-2">
                    <div>
                       <h3 className="font-bold text-slate-800">{client.name}</h3>
                       <span className="text-xs text-slate-500">{plan?.name || 'Sem Plano'}</span>
                       {/* Countdown Label for Plans */}
                       <CountdownLabel 
                         dateStr={client.planExpiryDate} 
                         timeStr={client.planExpiryTime} 
                         type="precise" 
                         isPaid={false} 
                       />
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="font-bold text-lg text-slate-700">Plano</span>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600`}>
                         {client.planExpiryDate}
                       </span>
                    </div>
                 </div>
                 
                 <div className="text-sm text-slate-600 mb-4 space-y-1 mt-2">
                   <div className="flex items-center gap-1 font-bold text-slate-700">
                      <Calendar size={14} className="text-slate-500"/> Venc. Plano: {client.planExpiryDate} {client.planExpiryTime}
                   </div>
                   <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar size={14} className="text-slate-300"/> Pgto: {client.paymentDueDate} (Status: {client.status})
                   </div>
                 </div>
 
                 <div className="flex gap-2 mt-2">
                   <button 
                     onClick={() => setMsgModal({isOpen: true, client})}
                     className="flex-1 bg-indigo-100 text-indigo-700 py-1.5 rounded text-sm hover:bg-indigo-200 font-bold flex items-center justify-center gap-2"
                   >
                     <MessageCircle size={18} /> Avisar
                   </button>
                   <button 
                     onClick={() => {
                        setRenewModal({isOpen: true, client, planValue: plan ? plan.value : 0});
                        setRenewPaymentStatus(null);
                        setManualDate('');
                     }}
                     className="px-4 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold flex items-center gap-2 text-sm"
                     title="Renovar Plano"
                   >
                     <RefreshCw size={16}/> Renovar
                   </button>
                   <button 
                     onClick={() => toggleAlert('client', client.id)}
                     className={`px-3 rounded border ${client.alertEnabled ? 'text-orange-500 border-orange-200 bg-orange-50' : 'text-slate-400 border-slate-200'}`}
                     title="Alertas Visuais"
                   >
                     <AlertCircle size={18}/>
                   </button>
                 </div>
               </div>
              );
           })
        )}

        {view === 'payables' && (
          getFilteredItems(payables, 'dueDate', 'status').map(payable => {
            const originalValue = payable.value;
            const currentValue = payable.balance !== undefined ? payable.balance : originalValue;
            const cardClass = getDateStatusColor(payable.dueDate, '23:59', payable.alertEnabled, payable.status === PaymentStatus.PAID);
            
            return (
              <div key={payable.id} className={`border-l-4 rounded-lg shadow-sm p-4 relative transition-all ${cardClass}`}>
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <h3 className="font-bold text-slate-800">{payable.description}</h3>
                       {/* Countdown Label for Payables (Simple Status) */}
                       <CountdownLabel 
                         dateStr={payable.dueDate} 
                         timeStr="23:59"
                         type="simple" 
                         isPaid={payable.status === PaymentStatus.PAID} 
                       />
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="font-bold text-lg">R$ {currentValue.toFixed(2)}</span>
                      {payable.balance !== undefined && payable.status !== PaymentStatus.PAID && (
                        <span className="text-[10px] text-slate-500">Restante de R$ {originalValue.toFixed(2)}</span>
                      )}
                   </div>
                </div>
                <div className="text-sm text-slate-600 mb-4 mt-2">
                  <div className="flex items-center gap-1"><Calendar size={14}/> Vencimento: {payable.dueDate.split('-').reverse().join('/')}</div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button 
                     onClick={() => openPaymentModal('payable', payable, originalValue)}
                     className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700"
                  >
                    Baixar (Pagar)
                  </button>
                  <button 
                    onClick={() => setHistoryModal({isOpen: true, id: payable.id, name: payable.description})}
                    className="px-3 bg-green-100 text-green-700 rounded hover:bg-green-200 font-bold"
                    title="Histórico de Pagamentos"
                  >
                    <DollarSign size={18}/>
                  </button>
                  <button 
                    onClick={() => toggleAlert('payable', payable.id)}
                    className={`px-3 rounded border ${payable.alertEnabled ? 'text-orange-500 border-orange-200 bg-orange-50' : 'text-slate-400 border-slate-200'}`}
                  >
                    <AlertCircle size={18}/>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Registrar Pagamento</h3>
            <p className="mb-2 text-sm text-slate-600">
              {selectedItem.type === 'client' ? selectedItem.data.name : selectedItem.data.description}
            </p>
            <p className="text-2xl font-bold mb-4 text-slate-800">
               <span className="text-xs text-slate-500 block">Valor a pagar</span>
               R$ {selectedItem.currentValue.toFixed(2)}
            </p>
            
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => { setPaymentType('total'); setPaymentAmount(selectedItem.currentValue.toString()); }}
                className={`flex-1 py-2 text-sm rounded-lg border ${paymentType === 'total' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}
              >
                Total
              </button>
              <button 
                onClick={() => { setPaymentType('partial'); setPaymentAmount(''); }}
                className={`flex-1 py-2 text-sm rounded-lg border ${paymentType === 'partial' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}
              >
                Parcial
              </button>
            </div>

            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Valor do Pagamento</label>
            <input 
              type="number"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              className="w-full p-2 border rounded-lg text-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0.00"
            />

            <div className="flex gap-2">
              <button onClick={() => setSelectedItem(null)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handlePayment} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center">
            <h3 className="text-lg font-bold mb-1">Pagamento via Pix</h3>
            <p className="text-sm text-slate-500 mb-4">{qrModal.data.name}</p>
            
            <div className="bg-white p-2 border rounded-xl shadow-inner mb-4">
              <img src={generatePixQr(qrModal.value, qrModal.data.name)} alt="QR Code" className="w-48 h-48 object-contain" />
            </div>
            
            <p className="text-2xl font-bold text-slate-800 mb-6">R$ {qrModal.value.toFixed(2)}</p>
            
            <div className="flex flex-col w-full gap-2">
              <button 
                 onClick={() => {
                   navigator.clipboard.writeText(storageService.getSettings().pixKey || "Chave não configurada");
                   alert("Código Copiado!");
                 }}
                 className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
              >
                Copiar Código Pix
              </button>
              <button onClick={() => setQrModal(null)} className="w-full py-2 text-red-500 hover:bg-red-50 rounded-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {historyModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
             <div className="p-4 border-b flex justify-between items-center">
               <div>
                 <h3 className="font-bold text-lg">Histórico de Pagamentos</h3>
                 <p className="text-xs text-slate-500">{historyModal.name}</p>
               </div>
               <button onClick={() => setHistoryModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4">
               {getHistoryTransactions().length === 0 ? (
                 <p className="text-center text-slate-400 py-4">Nenhum pagamento registrado.</p>
               ) : (
                 <div className="space-y-3">
                   {getHistoryTransactions().map(t => (
                     <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                           <p className="text-sm font-medium text-slate-700">{t.description}</p>
                           <p className="text-xs text-slate-400">{t.date}</p>
                        </div>
                        <span className="font-bold text-green-600">+ R$ {t.value.toFixed(2)}</span>
                     </div>
                   ))}
                 </div>
               )}
             </div>
             
             <div className="p-4 border-t bg-slate-50 rounded-b-xl">
                <div className="flex justify-between items-center">
                   <span className="text-sm font-bold text-slate-600">Total Pago</span>
                   <span className="text-lg font-bold text-slate-800">
                      R$ {getHistoryTransactions().reduce((acc, t) => acc + t.value, 0).toFixed(2)}
                   </span>
                </div>
             </div>
           </div>
         </div>
      )}

      {/* Message Selector Modal */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                 <h3 className="font-bold text-indigo-900">Enviar Mensagem</h3>
                 <button onClick={() => setMsgModal(null)} className="text-indigo-400 hover:text-indigo-600"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-3">
                 <p className="text-sm text-slate-600 mb-2">Enviar para: <strong>{msgModal.client.name}</strong></p>
                 
                 <button 
                   onClick={() => { sendWhatsApp(msgModal.client); setMsgModal(null); }}
                   className="w-full py-3 px-4 rounded-lg bg-white border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-3 transition"
                 >
                    <MessageCircle size={20} className="text-green-500"/>
                    Escrever Mensagem Personalizada
                 </button>

                 <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                       <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                       <span className="bg-white px-2 text-slate-500">Ou use um modelo</span>
                    </div>
                 </div>

                 {templates.length > 0 ? (
                   <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                     {templates.map(t => (
                        <button 
                          key={t.id}
                          onClick={() => { sendWhatsApp(msgModal.client, t.content); setMsgModal(null); }}
                          className={`w-full text-left p-3 rounded-lg border hover:brightness-95 transition flex items-center gap-3 bg-white`}
                          style={{ borderLeftWidth: '4px', borderLeftColor: t.color.replace('bg-', '') }} // Hacky but works for tailwind colors if hex, otherwise just uses class logic
                        >
                           <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                           <div>
                              <div className="font-bold text-sm text-slate-800">{t.title}</div>
                              <div className="text-[10px] text-slate-500 uppercase">{t.category}</div>
                           </div>
                        </button>
                     ))}
                   </div>
                 ) : (
                   <p className="text-center text-sm text-slate-400 py-2 italic">Nenhum modelo cadastrado.</p>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Plan Renewal Modal */}
      {renewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                 <h3 className="font-bold text-purple-900">Renovar Plano</h3>
                 <button onClick={() => setRenewModal(null)} className="text-purple-400 hover:text-purple-600"><X size={20}/></button>
              </div>
              <div className="p-6">
                 <p className="text-sm text-slate-600 mb-4 text-center">
                   Renovando plano de <strong>{renewModal.client.name}</strong>.<br/>
                   Valor do plano: <strong>R$ {renewModal.planValue.toFixed(2)}</strong>
                 </p>

                 {/* Step 1: Status Selection */}
                 <div className="mb-6">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase text-center">1. Como será o pagamento?</p>
                    <div className="flex gap-3">
                       <button 
                         onClick={() => setRenewPaymentStatus('PAID')}
                         className={`flex-1 py-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${renewPaymentStatus === 'PAID' ? 'bg-green-50 border-green-500 text-green-700' : 'border-slate-100 hover:bg-slate-50 text-slate-400'}`}
                       >
                          <CheckCircle size={20} className="mb-1"/>
                          <span className="text-xs font-bold">Já Pago</span>
                       </button>
                       <button 
                         onClick={() => setRenewPaymentStatus('PENDING')}
                         className={`flex-1 py-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${renewPaymentStatus === 'PENDING' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-100 hover:bg-slate-50 text-slate-400'}`}
                       >
                          <Clock size={20} className="mb-1"/>
                          <span className="text-xs font-bold">A Prazo / Na Conta</span>
                       </button>
                    </div>
                 </div>

                 {/* Step 2: Duration */}
                 <div className={`space-y-3 transition-opacity ${!renewPaymentStatus ? 'opacity-50 pointer-events-none' : ''}`}>
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase text-center">2. Selecione o período</p>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleRenewal(30, 1)}
                         className="flex-1 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-bold border border-purple-200"
                       >
                         +30 Dias<br/><span className="text-xs font-normal">(+1x Valor)</span>
                       </button>
                       <button 
                         onClick={() => handleRenewal(60, 2)}
                         className="flex-1 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-bold border border-purple-200"
                       >
                         +60 Dias<br/><span className="text-xs font-normal">(+2x Valor)</span>
                       </button>
                       <button 
                         onClick={() => handleRenewal(90, 3)}
                         className="flex-1 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-bold border border-purple-200"
                       >
                         +90 Dias<br/><span className="text-xs font-normal">(+3x Valor)</span>
                       </button>
                    </div>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                           <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                           <span className="bg-white px-2 text-slate-500">Ou selecione data</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                       <input 
                         type="date" 
                         className="flex-1 border p-2 rounded-lg"
                         value={manualDate}
                         onChange={e => setManualDate(e.target.value)}
                       />
                       <button 
                         onClick={() => manualDate && handleRenewal(0, 0, manualDate)} 
                         className="px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                         disabled={!manualDate}
                       >
                         Confirmar
                       </button>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                       Nota: A seleção manual de data altera o vencimento. O valor será adicionado apenas se "A Prazo" estiver selecionado.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
