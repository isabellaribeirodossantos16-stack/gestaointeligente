

import React, { useState, useRef, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { AppSettings, LicenseState, LicensePlan } from '../types';
import { Save, Download, Upload, Shield, CreditCard, MessageCircle, Settings as SettingsIcon, Clock, CheckCircle, XCircle, Image as ImageIcon, Trash2, Lock } from 'lucide-react';
import { DAILY_KEYS, YEARLY_KEYS, VITAL_KEYS, SPECIAL_KEY } from '../services/licenseData';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [license, setLicense] = useState<LicenseState>(storageService.getLicense());
  const [licenseTimeLeft, setLicenseTimeLeft] = useState<string>('');
  const [keyInput, setKeyInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Timer to update license countdown
    const updateTimer = () => {
      let targetDate = 0;
      
      if (license.planType === 'TRIAL') {
        targetDate = license.trialStartDate + (3 * 24 * 60 * 60 * 1000); // 3 Days
      } else if (license.activationDate) {
         if (license.planType === 'MENSAL') targetDate = license.activationDate + (30 * 24 * 60 * 60 * 1000);
         if (license.planType === 'ANUAL') targetDate = license.activationDate + (365 * 24 * 60 * 60 * 1000);
         if (license.planType === 'VITALICIO') targetDate = 0; // Infinity
      }

      if (targetDate === 0 && license.planType === 'VITALICIO') {
        setLicenseTimeLeft('Vitalício (Sem vencimento)');
        return;
      }

      if (targetDate > 0) {
        const now = Date.now();
        const diff = targetDate - now;

        if (diff <= 0) {
          setLicenseTimeLeft('EXPIRADO');
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setLicenseTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
      } else {
         setLicenseTimeLeft('---');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [license]);

  const saveSettings = () => {
    storageService.saveSettings(settings);
    alert("Configurações salvas!");
  };

  const handleBackup = () => {
    const data = storageService.createBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestorpro_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (storageService.restoreBackup(content)) {
        alert("Backup restaurado com sucesso! A página será recarregada.");
        window.location.reload();
      } else {
        alert("Erro ao restaurar backup.");
      }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size limit (e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettings({...settings, logo: base64});
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSettings({...settings, logo: ''});
  };

  const updateLicenseKey = () => {
    const key = keyInput.trim().toUpperCase();
    if (!key) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDayMonth = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); // "DD/MM"

    let newPlan: LicensePlan = 'TRIAL';
    let isValid = false;
    let errorMessage = '';

    // Check Key History
    if (license.keyHistory && license.keyHistory[key] === currentYear) {
      alert(`Esta chave já foi utilizada no ano de ${currentYear}.`);
      return;
    }

    // Special 30-day Key Check
    if (key === SPECIAL_KEY) {
        isValid = true;
        newPlan = 'MENSAL';
    }

    // Validation Logic
    
    // 1. Check Daily Keys (MENSAL)
    if (!isValid) {
        // Find the date associated with this key (Reverse lookup)
        const dailyEntry = Object.entries(DAILY_KEYS).find(([date, k]) => k === key);
        if (dailyEntry) {
          const [dateStr] = dailyEntry;
          if (dateStr === currentDayMonth) {
             isValid = true;
             newPlan = 'MENSAL';
          } else {
             errorMessage = `Esta chave é válida apenas para ativação no dia ${dateStr}.`;
          }
        }
    }

    // 2. Check Yearly Keys (ANUAL)
    if (!isValid) {
      const yearlyEntry = Object.entries(YEARLY_KEYS).find(([year, k]) => k === key);
      if (yearlyEntry) {
         const [yearStr] = yearlyEntry;
         if (parseInt(yearStr) === currentYear) {
            isValid = true;
            newPlan = 'ANUAL';
         } else {
            errorMessage = `Esta chave é válida apenas para ativação no ano de ${yearStr}.`;
         }
      }
    }

    // 3. Check Vital Keys (VITALICIO)
    if (!isValid) {
      const vitalEntry = Object.entries(VITAL_KEYS).find(([year, k]) => k === key);
      if (vitalEntry) {
         const [yearStr] = vitalEntry;
         if (parseInt(yearStr) === currentYear) {
            isValid = true;
            newPlan = 'VITALICIO';
         } else {
            errorMessage = `Esta chave é válida apenas para ativação no ano de ${yearStr}.`;
         }
      }
    }

    if (isValid) {
      // Calculate remaining time from previous license if valid
      let remainingTime = 0;
      if (license.isActive && license.activationDate && license.planType !== 'VITALICIO' && license.planType !== 'TRIAL') {
         const durationMap: Record<string, number> = { 'MENSAL': 30, 'ANUAL': 365 };
         const days = durationMap[license.planType] || 0;
         const currentExpiration = license.activationDate + (days * 24 * 60 * 60 * 1000);
         const diff = currentExpiration - Date.now();
         if (diff > 0) {
            remainingTime = diff;
         }
      }

      // New Activation Date = Now + Remaining Time
      // This works because the useEffect logic adds the *new* duration to the *new* activation date.
      // So NewExpiration = (Now + Remaining) + NewDuration.
      const newActivationDate = Date.now() + remainingTime;

      const updated: LicenseState = { 
        ...license, 
        licenseKey: key, 
        isActive: true, 
        isTrial: false,
        planType: newPlan,
        activationDate: newActivationDate,
        keyHistory: { ...license.keyHistory, [key]: currentYear }
      };
      
      setLicense(updated);
      storageService.saveLicense(updated);
      setKeyInput('');
      const message = remainingTime > 0 
        ? `Licença ${newPlan} ativada! O tempo restante anterior foi acumulado.` 
        : `Licença ${newPlan} ativada com sucesso!`;
      alert(message);
    } else {
      alert(errorMessage || "Chave de licença inválida.");
    }
  };

  const getStatusLabel = () => {
    if (license.planType === 'TRIAL') {
       return license.isActive ? 'Ativo para teste' : 'Teste Expirado';
    }
    return `Ativo ${license.planType.charAt(0) + license.planType.slice(1).toLowerCase()}`;
  };

  const isPro = license.planType !== 'TRIAL' && license.isActive;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <SettingsIcon className="text-slate-400"/> Configurações
      </h2>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Menu */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-sm border h-fit">
          {[
            { id: 'company', label: 'Empresa & Pix', icon: CreditCard },
            { id: 'dashboard', label: 'Dashboard', icon: SettingsIcon },
            { id: 'backup', label: 'Backup & Dados', icon: Download },
            { id: 'support', label: 'Suporte', icon: MessageCircle },
            { id: 'license', label: 'Licença', icon: Shield },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-4 py-3 border-l-4 flex items-center gap-3 transition ${
                activeTab === item.id 
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' 
                : 'border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon size={18}/> {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border p-6">
          
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg mb-4 border-b pb-2">Perfil da Empresa</h3>
              
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-6">
                 {/* Logo Upload Section */}
                 <div className="flex flex-col items-center gap-2">
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                       {settings.logo ? (
                          <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                       ) : (
                          <div className="text-slate-400 flex flex-col items-center">
                             <ImageIcon size={32}/>
                             <span className="text-xs mt-1">Logo</span>
                          </div>
                       )}
                    </div>
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => logoInputRef.current?.click()} 
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium"
                      >
                        {settings.logo ? 'Alterar' : 'Enviar Logo'}
                      </button>
                      {settings.logo && (
                        <button 
                          onClick={removeLogo} 
                          className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100"
                        >
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                 </div>

                 {/* Company Fields */}
                 <div className="flex-1 w-full grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nome da Empresa</label>
                      <input className="w-full border p-2 rounded" value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})}/>
                    </div>
                    <div>
                      <label className="text-sm font-medium">CPF/CNPJ</label>
                      <input className="w-full border p-2 rounded" value={settings.cpfCnpj} onChange={e => setSettings({...settings, cpfCnpj: e.target.value})}/>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input className="w-full border p-2 rounded" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})}/>
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <input className="w-full border p-2 rounded" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})}/>
                </div>
              </div>

              <h3 className="font-bold text-lg mt-6 mb-4 border-b pb-2">Configuração Pix</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium">Tipo de Chave</label>
                    <select className="w-full border p-2 rounded" value={settings.pixKeyType} onChange={e => setSettings({...settings, pixKeyType: e.target.value})}>
                      <option>CPF</option>
                      <option>CNPJ</option>
                      <option>Email</option>
                      <option>Telefone</option>
                      <option>Aleatória</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-sm font-medium">Chave Pix</label>
                    <input className="w-full border p-2 rounded" value={settings.pixKey} onChange={e => setSettings({...settings, pixKey: e.target.value})}/>
                 </div>
              </div>
              <button onClick={saveSettings} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Save size={18}/> Salvar</button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg mb-4 border-b pb-2">Personalizar Dashboard</h3>
              <div className="space-y-2">
                 {Object.entries(settings.dashboardCards).map(([key, val]) => (
                   <label key={key} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded">
                     <input 
                       type="checkbox" 
                       checked={val} 
                       onChange={() => setSettings({
                         ...settings, 
                         dashboardCards: {...settings.dashboardCards, [key]: !val}
                       })}
                       className="rounded text-blue-600 focus:ring-blue-500"
                     />
                     <span className="capitalize">{
                        key === 'salesCount' ? 'Quantidade Vendas' : 
                        key === 'birthdays' ? 'Aniversariantes' : 
                        key === 'expenses' ? 'Contas no Período' :
                        key.replace(/([A-Z])/g, ' $1')
                     } Card</span>
                   </label>
                 ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.alertsEnabled}
                    onChange={() => setSettings({...settings, alertsEnabled: !settings.alertsEnabled})}
                  />
                  <span>Ativar Alertas Visuais (Piscar cards)</span>
                </label>
              </div>
              <button onClick={saveSettings} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"><Save size={18}/> Salvar</button>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg border-b pb-2">Backup & Restauração</h3>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-2">Fazer Backup</h4>
                <p className="text-sm text-blue-600 mb-4">Baixe um arquivo contendo todos os seus clientes, planos e histórico financeiro.</p>
                <button onClick={handleBackup} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                  <Download size={18}/> Download Backup
                </button>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <h4 className="font-bold text-orange-800 mb-2">Restaurar Dados</h4>
                <p className="text-sm text-orange-600 mb-4">Importe um arquivo de backup. Cuidado: Isso substituirá os dados atuais.</p>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  onChange={handleRestore}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-orange-100 file:text-orange-700
                    hover:file:bg-orange-200
                  "
                />
              </div>

              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between">
                   <div>
                     <h4 className="font-bold text-slate-800">Backup Automático</h4>
                     <p className="text-sm text-slate-500">Salvar cópia de segurança automaticamente ao realizar alterações.</p>
                   </div>
                   
                   {isPro ? (
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.autoBackup} 
                          onChange={() => {
                            const newSettings = {...settings, autoBackup: !settings.autoBackup};
                            setSettings(newSettings);
                            storageService.saveSettings(newSettings);
                          }} 
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                     </label>
                   ) : (
                      <div className="flex items-center gap-2 text-slate-400 bg-slate-100 px-3 py-2 rounded border border-slate-200">
                         <Lock size={16}/>
                         <span className="text-xs font-bold uppercase">Recurso Premium</span>
                      </div>
                   )}
                </div>
                {!isPro && (
                  <p className="text-xs text-red-400 mt-2">Disponível apenas para planos pagos (Mensal, Anual ou Vitalício).</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <MessageCircle size={40} className="text-blue-600"/>
              </div>
              <h3 className="text-xl font-bold mb-2">Maicon Coutinho dos Santos</h3>
              <p className="text-slate-500 mb-6">Suporte Técnico Especializado</p>
              
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <a href="https://wa.me/5541988192359" target="_blank" rel="noreferrer" className="bg-green-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600">
                   WhatsApp (41) 98819 2359
                </a>
                <a href="mailto:mcn.coutinho@gmail.com" className="bg-slate-800 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-900">
                   mcn.coutinho@gmail.com
                </a>
              </div>
            </div>
          )}

          {activeTab === 'license' && (
            <div>
              <h3 className="font-bold text-lg mb-6 border-b pb-2">Licenciamento</h3>
              
              {/* Status Display */}
              <div className={`mb-8 p-6 rounded-xl border-2 flex flex-col md:flex-row items-center justify-between gap-4 ${license.isActive ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                <div>
                   <div className="flex items-center gap-2 mb-2">
                     {license.isActive ? <CheckCircle className="text-green-600" size={24}/> : <XCircle className="text-red-600" size={24}/>}
                     <span className="font-bold text-xl uppercase text-slate-700">{getStatusLabel()}</span>
                   </div>
                   <div className="flex items-center gap-2 text-slate-600">
                     <Clock size={16}/>
                     <span>Vence em: <strong className="font-mono text-lg">{licenseTimeLeft}</strong></span>
                   </div>
                </div>
                {license.planType !== 'TRIAL' && (
                   <div className="px-4 py-2 bg-white rounded-lg border shadow-sm text-center min-w-[120px]">
                      <div className="text-xs text-slate-500 uppercase font-bold">Plano Atual</div>
                      <div className="font-bold text-blue-600">{license.planType}</div>
                   </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { title: 'Mensal', price: 'R$ 3,49', color: 'bg-slate-100' },
                  { title: 'Anual', price: 'R$ 19,90', color: 'bg-blue-50 border-blue-200' },
                  { title: 'Vitalício', price: 'R$ 49,90', color: 'bg-yellow-50 border-yellow-200' },
                ].map((plan, i) => (
                  <div key={i} className={`p-4 rounded-xl border text-center ${plan.color}`}>
                    <h4 className="font-bold text-lg mb-1">{plan.title}</h4>
                    <p className="text-2xl font-bold text-slate-800 mb-4">{plan.price}</p>
                    <a href="https://wa.me/5541988192359?text=Quero%20adquirir%20licença" target="_blank" rel="noreferrer" className="block w-full bg-white border border-slate-300 py-2 rounded hover:bg-slate-50 text-sm font-medium">
                      Adquirir Agora
                    </a>
                  </div>
                ))}
              </div>

              {license.planType !== 'VITALICIO' && (
                <div className="bg-slate-800 text-white p-6 rounded-xl">
                  <h4 className="font-bold mb-2">Ativar Produto</h4>
                  <p className="text-sm text-slate-300 mb-4">Insira sua chave de ativação para desbloquear todos os recursos.</p>
                  <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="Insira sua chave aqui..." 
                       className="flex-1 p-2 rounded text-slate-800 outline-none"
                       value={keyInput}
                       onChange={(e) => setKeyInput(e.target.value)}
                     />
                     <button 
                       onClick={updateLicenseKey}
                       className="bg-green-500 px-6 rounded font-bold hover:bg-green-400"
                     >
                       ATIVAR
                     </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 italic">Atenção: As chaves diárias só funcionam na data específica.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
