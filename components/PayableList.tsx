
import React, { useState, useEffect } from 'react';
import { Payable, PaymentStatus } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Edit, Trash2, Calendar, DollarSign, AlertCircle } from 'lucide-react';

export const PayableList: React.FC = () => {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Payable>>({
    description: '',
    value: 0,
    dueDate: '',
    status: PaymentStatus.PENDING,
    alertEnabled: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPayables(storageService.getPayables());
  };

  const openModal = (payable?: Payable) => {
    if (payable) {
      setEditingId(payable.id);
      setFormData(payable);
    } else {
      setEditingId(null);
      setFormData({
        description: '',
        value: 0,
        dueDate: new Date().toISOString().split('T')[0],
        status: PaymentStatus.PENDING,
        alertEnabled: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.description || !formData.value || !formData.dueDate) return alert("Preencha todos os campos obrigatórios");

    const newPayables = [...payables];
    
    // If manually marked PAID, reset balance
    const isPaid = formData.status === PaymentStatus.PAID;

    const data: Payable = {
      ...(formData as Payable),
      id: editingId || Date.now().toString(),
      value: typeof formData.value === 'string' ? parseFloat((formData.value as string).replace(',', '.')) : formData.value || 0,
      balance: isPaid ? undefined : formData.balance // Keep existing balance if editing not paid, or reset
    };

    if (editingId) {
      const index = newPayables.findIndex(p => p.id === editingId);
      newPayables[index] = data;
    } else {
      newPayables.push(data);
    }

    setPayables(newPayables);
    storageService.savePayables(newPayables);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      const updated = payables.filter(p => p.id !== id);
      setPayables(updated);
      storageService.savePayables(updated);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contas a Pagar</h2>
          <p className="text-sm text-slate-500">Cadastre suas despesas aqui para gerenciar no Financeiro</p>
        </div>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {payables.map(payable => {
          const originalValue = payable.value;
          const currentValue = payable.balance !== undefined ? payable.balance : originalValue;

          return (
            <div key={payable.id} className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative ${payable.status === PaymentStatus.PAID ? 'opacity-75' : ''}`}>
               
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{payable.description}</h3>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${payable.status === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {payable.status}
                </div>
              </div>

              <div className="flex flex-col mb-4">
                 <div className="flex items-center gap-2">
                    <DollarSign size={20} className="text-slate-400"/>
                    <span className="text-2xl font-bold text-slate-700">R$ {currentValue.toFixed(2)}</span>
                 </div>
                 {payable.balance !== undefined && payable.status !== PaymentStatus.PAID && (
                    <span className="text-xs text-slate-500 ml-7">Restante de R$ {originalValue.toFixed(2)}</span>
                 )}
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 bg-slate-50 p-2 rounded">
                <Calendar size={16}/> Vencimento: {payable.dueDate.split('-').reverse().join('/')}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={() => openModal(payable)} className="text-blue-500 hover:bg-blue-50 p-2 rounded flex items-center gap-1 text-sm font-medium">
                  <Edit size={16} /> Editar
                </button>
                <button onClick={() => handleDelete(payable.id)} className="text-red-500 hover:bg-red-50 p-2 rounded flex items-center gap-1 text-sm font-medium">
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            </div>
          );
        })}
        
        {payables.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign size={24}/>
            </div>
            <p>Nenhuma conta cadastrada.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Editar Conta' : 'Nova Conta a Pagar'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Descrição</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Aluguel, Luz, Internet"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})}
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Vencimento</label>
                  <input 
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700">Status Inicial</label>
                 <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as PaymentStatus})}
                    className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                 >
                    <option value={PaymentStatus.PENDING}>A PAGAR</option>
                    <option value={PaymentStatus.PAID}>PAGO</option>
                 </select>
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <input 
                   type="checkbox" 
                   id="alertCheck"
                   checked={formData.alertEnabled}
                   onChange={e => setFormData({...formData, alertEnabled: e.target.checked})}
                   className="w-4 h-4 text-blue-600 rounded"
                 />
                 <label htmlFor="alertCheck" className="text-sm text-slate-600">Ativar alerta de vencimento no Financeiro</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar Conta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
