import React, { useState, useEffect } from 'react';
import { Plan } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Edit, Trash2, X, Check } from 'lucide-react';

export const PlanList: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', value: '', description: '' });

  useEffect(() => {
    setPlans(storageService.getPlans());
  }, []);

  const handleSave = () => {
    if (!formData.name || !formData.value) return alert("Nome e Valor são obrigatórios");

    const newPlans = [...plans];
    const planValue = parseFloat(formData.value.replace(',', '.'));

    if (editingPlan) {
      const index = newPlans.findIndex(p => p.id === editingPlan.id);
      newPlans[index] = { ...editingPlan, name: formData.name, value: planValue, description: formData.description };
    } else {
      newPlans.push({
        id: Date.now().toString(),
        name: formData.name,
        value: planValue,
        description: formData.description
      });
    }

    setPlans(newPlans);
    storageService.savePlans(newPlans);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano?')) {
      const updated = plans.filter(p => p.id !== id);
      setPlans(updated);
      storageService.savePlans(updated);
    }
  };

  const openModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({ name: plan.name, value: plan.value.toString(), description: plan.description });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', value: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Planos</h2>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-slate-800">{plan.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => openModal(plan)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={16} /></button>
                <button onClick={() => handleDelete(plan.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-2">
              R$ {plan.value.toFixed(2)}
            </p>
            <p className="text-slate-500 text-sm">{plan.description}</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nome do Plano</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
