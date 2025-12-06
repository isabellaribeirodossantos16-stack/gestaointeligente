
import React, { useState, useEffect } from 'react';
import { Client, PaymentStatus, Plan, MessageTemplate } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Edit, Trash2, Calendar, User, Phone, Gift, MessageCircle, X } from 'lucide-react';

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // View States
  const [view, setView] = useState<'list' | 'birthdays'>('list');
  const [birthdayFilter, setBirthdayFilter] = useState<'today' | 'tomorrow' | 'week' | 'month'>('today');

  // Form
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', whatsapp: '', birthDate: '', planId: '', paymentDueDate: '', paymentDueTime: '12:00', planExpiryDate: '', planExpiryTime: '23:59'
  });
  
  // Quick Plan Creation inside Client Modal
  const [showQuickPlan, setShowQuickPlan] = useState(false);
  const [newPlanData, setNewPlanData] = useState({ name: '', value: '' });

  // Message Modal
  const [msgModal, setMsgModal] = useState<{isOpen: boolean, client: Client} | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setClients(storageService.getClients());
    setPlans(storageService.getPlans());
    setTemplates(storageService.getMessages());
  };

  const openModal = (client?: Client) => {
    loadData(); // Ensure plans are fresh
    if (client) {
      setEditingId(client.id);
      setFormData(client);
    } else {
      setEditingId(null);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      
      setFormData({
        name: '', whatsapp: '', birthDate: '', planId: '', 
        status: PaymentStatus.PENDING,
        paymentDueDate: new Date().toISOString().split('T')[0],
        paymentDueTime: '12:00',
        planExpiryDate: nextMonth.toISOString().split('T')[0],
        planExpiryTime: '23:59',
        alertEnabled: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = () => {
    if (!formData.name || !formData.planId) return alert("Preencha os campos obrigatórios");

    const newClients = [...clients];
    
    // If status is changed to PAID manually, reset the balance (debt cleared)
    const isPaid = formData.status === PaymentStatus.PAID;
    
    const clientData: Client = {
      ...(formData as Client),
      id: editingId || Date.now().toString(),
      // Ensure fallbacks if empty
      planExpiryDate: formData.planExpiryDate || '',
      planExpiryTime: formData.planExpiryTime || '23:59',
      balance: isPaid ? undefined : formData.balance
    };

    if (editingId) {
      const idx = newClients.findIndex(c => c.id === editingId);
      newClients[idx] = clientData;
    } else {
      newClients.push(clientData);
    }

    setClients(newClients);
    storageService.saveClients(newClients);
    setIsModalOpen(false);
  };

  const handleQuickPlanSave = () => {
    if (!newPlanData.name || !newPlanData.value) return;
    const newPlan: Plan = {
      id: Date.now().toString(),
      name: newPlanData.name,
      value: parseFloat(newPlanData.value.replace(',', '.')),
      description: 'Criado rápido'
    };
    const updatedPlans = [...plans, newPlan];
    setPlans(updatedPlans);
    storageService.savePlans(updatedPlans);
    setFormData({ ...formData, planId: newPlan.id });
    setShowQuickPlan(false);
    setNewPlanData({name: '', value: ''});
  };

  const handleDelete = (id: string) => {
    if (confirm("Deletar cliente?")) {
      const updated = clients.filter(c => c.id !== id);
      setClients(updated);
      storageService.saveClients(updated);
    }
  };

  // Helper to calculate days until birthday
  const getDaysUntilBirthday = (birthDateString: string) => {
    if (!birthDateString) return 999;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const [y, m, d] = birthDateString.split('-').map(Number);
    const currentYear = today.getFullYear();
    let nextBday = new Date(currentYear, m - 1, d);
    
    if (nextBday < today) {
       nextBday.setFullYear(currentYear + 1);
    }
    
    const diffTime = nextBday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Birthday Logic
  const getBirthdayClients = () => {
    return clients.filter(c => {
      if (!c.birthDate) return false;
      const diffDays = getDaysUntilBirthday(c.birthDate);

      if (birthdayFilter === 'today') return diffDays === 0;
      if (birthdayFilter === 'tomorrow') return diffDays === 1;
      // Use strict greater than 0 to exclude "Today" from Week and Month filters
      if (birthdayFilter === 'week') return diffDays > 0 && diffDays <= 7;
      if (birthdayFilter === 'month') return diffDays > 0 && diffDays <= 30;
      
      return false;
    }).sort((a, b) => {
       return getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate);
    });
  };

  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return '';
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const openMsgModal = (client: Client) => {
    setTemplates(storageService.getMessages());
    setMsgModal({isOpen: true, client});
  };

  const sendWhatsApp = (client: Client, message?: string) => {
    const phone = client.whatsapp.replace(/\D/g, '');
    const text = message ? `&text=${encodeURIComponent(message.replace('{nome}', client.name))}` : '';
    window.open(`https://wa.me/55${phone}?${text}`, '_blank');
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        
        {/* View Toggle */}
        <div className="flex bg-white rounded-lg shadow-sm p-1 border">
           <button 
             onClick={() => setView('list')} 
             className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${view === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
           >
             <User size={16}/> Lista Geral
           </button>
           <button 
             onClick={() => setView('birthdays')} 
             className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${view === 'birthdays' ? 'bg-pink-100 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
           >
             <Gift size={16}/> Aniversariantes
           </button>
        </div>

        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {view === 'birthdays' && (
        <div className="mb-6 animate-fade-in">
           <div className="flex gap-2 overflow-x-auto pb-2">
             {[
               { id: 'today', label: 'Hoje' },
               { id: 'tomorrow', label: 'Amanhã' },
               { id: 'week', label: '7 Dias' },
               { id: 'month', label: '30 Dias' }
             ].map(filter => (
               <button
                 key={filter.id}
                 onClick={() => setBirthdayFilter(filter.id as any)}
                 className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition ${
                   birthdayFilter === filter.id 
                     ? 'bg-pink-600 text-white border-pink-600' 
                     : 'bg-white text-slate-500 border-slate-200 hover:bg-pink-50'
                 }`}
               >
                 {filter.label}
               </button>
             ))}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
             {getBirthdayClients().map(client => {
                const age = calculateAge(client.birthDate);
                const [y, m, d] = client.birthDate.split('-');
                const daysUntil = getDaysUntilBirthday(client.birthDate);

                // Dynamic Styling based on days
                let cardClasses = "bg-white border-pink-100"; // Default (> 7 days)
                let iconClasses = "bg-pink-100 text-pink-500";
                
                if (daysUntil === 0) {
                    cardClasses = "bg-green-50 border-green-500 animate-pulse ring-2 ring-green-200";
                    iconClasses = "bg-green-200 text-green-700";
                } else if (daysUntil === 1) {
                    cardClasses = "bg-orange-50 border-orange-400";
                    iconClasses = "bg-orange-200 text-orange-700";
                } else if (daysUntil >= 2 && daysUntil <= 7) {
                    cardClasses = "bg-yellow-50 border-yellow-400";
                    iconClasses = "bg-yellow-200 text-yellow-700";
                }

                return (
                  <div key={client.id} className={`${cardClasses} p-5 rounded-xl shadow-sm border relative overflow-hidden group transition-all`}>
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Gift size={64} className="text-slate-800" />
                     </div>
                     
                     <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className={`w-12 h-12 rounded-full ${iconClasses} flex items-center justify-center border-2 border-white shadow-sm`}>
                           <Gift size={20}/>
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-800 line-clamp-1">{client.name}</h3>
                           <p className="text-xs text-slate-600 font-medium">
                             {d}/{m} • {age} anos
                             {daysUntil === 0 && <span className="ml-2 px-1.5 py-0.5 bg-green-200 text-green-800 rounded-full text-[10px] uppercase font-bold">Hoje!</span>}
                             {daysUntil === 1 && <span className="ml-2 px-1.5 py-0.5 bg-orange-200 text-orange-800 rounded-full text-[10px] uppercase font-bold">Amanhã</span>}
                             {daysUntil > 1 && daysUntil <= 30 && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] uppercase font-bold">Faltam {daysUntil} dias</span>}
                           </p>
                        </div>
                     </div>

                     {daysUntil === 0 && (
                       <button 
                         onClick={() => openMsgModal(client)}
                         className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-sm relative z-10 transition-colors bg-green-600 text-white hover:bg-green-700 animate-bounce`}
                       >
                         <MessageCircle size={16}/> 
                         Enviar Parabéns Agora!
                       </button>
                     )}
                  </div>
                )
             })}
             
             {getBirthdayClients().length === 0 && (
               <div className="col-span-full py-12 text-center text-slate-400">
                  <Gift size={48} className="mx-auto mb-2 opacity-30"/>
                  <p>Nenhum aniversariante encontrado para este período.</p>
               </div>
             )}
           </div>
        </div>
      )}

      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
          {clients.map(client => {
            const plan = plans.find(p => p.id === client.planId);
            return (
              <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{client.name}</h3>
                      <p className="text-xs text-slate-500">{plan?.name || 'Sem plano'}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${client.status === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {client.status}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2"><Phone size={14}/> {client.whatsapp}</div>
                  {client.status !== PaymentStatus.PAID && (
                      <div className="flex items-center gap-2"><Calendar size={14}/> Pgto: {client.paymentDueDate} {client.paymentDueTime}</div>
                  )}
                  <div className="flex items-center gap-2"><Calendar size={14}/> Plano: {client.planExpiryDate} {client.planExpiryTime}</div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button onClick={() => openModal(client)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto py-10">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <input className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Whatsapp</label>
                <input className="w-full border p-2 rounded" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Nascimento</label>
                <input type="date" className="w-full border p-2 rounded" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
              </div>
            </div>

            {/* Plan Selector with Inline Create */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Plano</label>
                <button onClick={() => setShowQuickPlan(!showQuickPlan)} className="text-xs text-blue-600 hover:underline">
                  {showQuickPlan ? 'Cancelar Novo' : '+ Novo Plano Rápido'}
                </button>
              </div>
              
              {showQuickPlan ? (
                 <div className="flex gap-2 items-end animate-fade-in">
                   <div className="flex-1">
                     <input placeholder="Nome" className="w-full border p-1 rounded text-sm" value={newPlanData.name} onChange={e => setNewPlanData({...newPlanData, name: e.target.value})} />
                   </div>
                   <div className="w-24">
                     <input placeholder="R$" type="number" className="w-full border p-1 rounded text-sm" value={newPlanData.value} onChange={e => setNewPlanData({...newPlanData, value: e.target.value})} />
                   </div>
                   <button onClick={handleQuickPlanSave} className="bg-green-600 text-white p-1.5 rounded text-xs">Salvar</button>
                 </div>
              ) : (
                <select className="w-full border p-2 rounded bg-white" value={formData.planId} onChange={e => setFormData({...formData, planId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.value}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
               <div className="col-span-2">
                  <label className="text-sm font-medium">Status Pagamento</label>
                  <select className="w-full border p-2 rounded" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as PaymentStatus})}>
                    <option value={PaymentStatus.PAID}>{PaymentStatus.PAID}</option>
                    <option value={PaymentStatus.PENDING}>{PaymentStatus.PENDING}</option>
                  </select>
               </div>
               
               {/* Show Payment fields only if NOT PAID */}
               {formData.status !== PaymentStatus.PAID && (
                 <>
                   <div className="col-span-2 text-xs font-bold text-slate-500 uppercase mt-2">Pagamento</div>
                   <div>
                     <label className="text-sm font-medium">Venc. Pagamento</label>
                     <input type="date" className="w-full border p-2 rounded" value={formData.paymentDueDate} onChange={e => setFormData({...formData, paymentDueDate: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-sm font-medium">Hora Pgto</label>
                     <input type="time" className="w-full border p-2 rounded" value={formData.paymentDueTime} onChange={e => setFormData({...formData, paymentDueTime: e.target.value})} />
                   </div>
                 </>
               )}

               <div className="col-span-2 text-xs font-bold text-slate-500 uppercase mt-2">Plano</div>
               <div>
                 <label className="text-sm font-medium">Venc. Plano</label>
                 <input type="date" className="w-full border p-2 rounded" value={formData.planExpiryDate} onChange={e => setFormData({...formData, planExpiryDate: e.target.value})} />
               </div>
               <div>
                 <label className="text-sm font-medium">Hora Plano</label>
                 <input type="time" className="w-full border p-2 rounded" value={formData.planExpiryTime} onChange={e => setFormData({...formData, planExpiryTime: e.target.value})} />
               </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleSaveClient} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar Cliente</button>
            </div>

          </div>
        </div>
      )}

      {/* Message Selector Modal (Reused Logic) */}
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

    </div>
  );
};
