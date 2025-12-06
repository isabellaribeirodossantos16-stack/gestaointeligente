
import React, { useState, useEffect } from 'react';
import { MessageTemplate } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Edit, Trash2, MessageCircle, Save } from 'lucide-react';

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-slate-500'
];

export const MessageTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    color: 'bg-blue-500'
  });
  
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setTemplates(storageService.getMessages());
  }, []);

  const getUniqueCategories = () => {
    const cats = new Set(templates.map(t => t.category));
    return Array.from(cats);
  };

  const openModal = (template?: MessageTemplate) => {
    if (template) {
      setEditingId(template.id);
      setFormData({
        title: template.title,
        category: template.category,
        content: template.content,
        color: template.color
      });
      setIsNewCategory(false);
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        category: getUniqueCategories()[0] || 'Geral',
        content: '',
        color: 'bg-blue-500'
      });
      setIsNewCategory(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) return alert("Título e mensagem são obrigatórios");
    
    const finalCategory = isNewCategory ? newCategoryName : formData.category;
    if (!finalCategory) return alert("Categoria obrigatória");

    const newTemplates = [...templates];
    const data: MessageTemplate = {
      id: editingId || Date.now().toString(),
      title: formData.title,
      category: finalCategory,
      content: formData.content,
      color: formData.color
    };

    if (editingId) {
      const idx = newTemplates.findIndex(t => t.id === editingId);
      newTemplates[idx] = data;
    } else {
      newTemplates.push(data);
    }

    setTemplates(newTemplates);
    storageService.saveMessages(newTemplates);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Excluir modelo de mensagem?")) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      storageService.saveMessages(updated);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mensagens Prontas</h2>
          <p className="text-sm text-slate-500">Crie modelos para agilizar seu atendimento</p>
        </div>
        <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Novo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
             <div className={`h-2 ${t.color}`}></div>
             <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                   <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${t.color} bg-opacity-80`}>
                     {t.category}
                   </span>
                   <div className="flex gap-1">
                      <button onClick={() => openModal(t)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-slate-100 rounded text-red-500"><Trash2 size={16}/></button>
                   </div>
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{t.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded italic">"{t.content}"</p>
             </div>
          </div>
        ))}
        {templates.length === 0 && (
           <div className="col-span-full py-12 text-center text-slate-400">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-30"/>
              <p>Nenhum modelo de mensagem criado.</p>
           </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
              <h3 className="text-xl font-bold mb-4">{editingId ? 'Editar Modelo' : 'Novo Modelo'}</h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-sm font-medium text-slate-700">Nome da Mensagem</label>
                    <input 
                      className="w-full border p-2 rounded mt-1" 
                      placeholder="Ex: Cobrança Amigável"
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                 </div>

                 <div className="bg-slate-50 p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-700">Modelo / Categoria</label>
                      <button 
                        onClick={() => { setIsNewCategory(!isNewCategory); setNewCategoryName(''); }}
                        className="text-xs text-blue-600 hover:underline font-bold"
                      >
                        {isNewCategory ? 'Selecionar Existente' : '+ Novo Modelo'}
                      </button>
                    </div>
                    
                    {isNewCategory ? (
                      <input 
                        className="w-full border p-2 rounded bg-white" 
                        placeholder="Nome da nova categoria..."
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <select 
                        className="w-full border p-2 rounded bg-white"
                        value={formData.category}
                        onChange={e => {
                           const cat = e.target.value;
                           // Try to find color associated with this category from other templates
                           const existing = templates.find(t => t.category === cat);
                           setFormData({
                             ...formData, 
                             category: cat,
                             color: existing ? existing.color : formData.color
                           });
                        }}
                      >
                        {getUniqueCategories().length > 0 ? (
                           getUniqueCategories().map(c => <option key={c} value={c}>{c}</option>)
                        ) : (
                           <option value="Geral">Geral</option>
                        )}
                      </select>
                    )}
                 </div>

                 <div>
                    <label className="text-sm font-medium text-slate-700">Mensagem</label>
                    <textarea 
                      className="w-full border p-2 rounded mt-1 h-32" 
                      placeholder="Digite a mensagem aqui... Use {nome} para substituir pelo nome do cliente."
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})}
                    />
                    <p className="text-xs text-slate-400 mt-1">Dica: Use <strong>{'{nome}'}</strong> para inserir o nome do cliente automaticamente.</p>
                 </div>

                 <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Cor do Card</label>
                    <div className="flex gap-2 flex-wrap">
                       {COLORS.map(c => (
                         <button 
                           key={c}
                           onClick={() => setFormData({...formData, color: c})}
                           className={`w-8 h-8 rounded-full ${c} ${formData.color === c ? 'ring-4 ring-offset-1 ring-slate-300' : ''}`}
                         />
                       ))}
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                   <Save size={18}/> Salvar Modelo
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
