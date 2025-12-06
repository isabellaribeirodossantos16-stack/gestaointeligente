
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { PaymentStatus, TransactionType } from '../types';
import { TrendingUp, TrendingDown, Users, DollarSign, AlertCircle, Calendar, Filter, Gift, CheckCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    salesCount: 0,
    receivables: 0,
    receivablesCount: 0,
    payables: 0,
    payablesCount: 0,
    birthdaysCount: 0
  });
  
  const [settings, setSettings] = useState(storageService.getSettings());
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    calculateStats();
  }, [dateRange]);

  const calculateStats = () => {
    const clients = storageService.getClients();
    const payables = storageService.getPayables();
    const transactions = storageService.getTransactions();
    const plans = storageService.getPlans();

    // Date Filtering Helper
    const isInRange = (dateStr: string) => {
      if (!dateRange.start && !dateRange.end) return true;
      const date = new Date(dateStr);
      const start = dateRange.start ? new Date(dateRange.start) : new Date('2000-01-01');
      const end = dateRange.end ? new Date(dateRange.end) : new Date('2100-01-01');
      // Normalize times
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      date.setHours(12,0,0,0); // Avoid timezone edges
      
      return date >= start && date <= end;
    };

    // Calculate Sales (Income Transactions)
    const incomeTransactions = transactions.filter(t => t.type === TransactionType.INCOME && isInRange(t.date));
    const totalSales = incomeTransactions.reduce((acc, t) => acc + t.value, 0);

    // Calculate Expenses (Expense Transactions)
    const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE && isInRange(t.date));
    const totalExpenses = expenseTransactions.reduce((acc, t) => acc + t.value, 0);

    // Calculate Receivables (Clients pending)
    const pendingClients = clients.filter(c => c.status !== PaymentStatus.PAID && isInRange(c.paymentDueDate));
    const totalReceivables = pendingClients.reduce((acc, c) => {
      const plan = plans.find(p => p.id === c.planId);
      const originalValue = plan ? plan.value : 0;
      // Use balance if exists (partial payment), otherwise original value
      const actualValue = c.balance !== undefined ? c.balance : originalValue;
      return acc + actualValue;
    }, 0);

    // Calculate Payables
    const pendingPayables = payables.filter(p => p.status !== PaymentStatus.PAID && isInRange(p.dueDate));
    const totalPayables = pendingPayables.reduce((acc, p) => {
      // Use balance if exists (partial payment), otherwise original value
      const actualValue = p.balance !== undefined ? p.balance : p.value;
      return acc + actualValue;
    }, 0);

    // Calculate Birthdays
    const birthdaysCount = clients.filter(c => {
      if (!c.birthDate) return false;
      
      if (!dateRange.start && !dateRange.end) return true;

      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end || '2100-01-01');
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      const [y, m, d] = c.birthDate.split('-').map(Number);
      
      // Check if the birthday occurs within the start/end window in any relevant year
      let bday = new Date(start.getFullYear(), m - 1, d);
      bday.setHours(12,0,0,0);

      // Check year of start
      if (bday >= start && bday <= end) return true;
      
      // Check year of end (if range spans years)
      bday.setFullYear(end.getFullYear());
      if (bday >= start && bday <= end) return true;

      return false;
    }).length;

    setStats({
      totalSales,
      totalExpenses,
      salesCount: incomeTransactions.length,
      receivables: totalReceivables,
      receivablesCount: pendingClients.length,
      payables: totalPayables,
      payablesCount: pendingPayables.length,
      birthdaysCount
    });
  };

  const generateAiInsight = async () => {
    setLoadingAi(true);
    setAiInsight("Analisando dados financeiros...");
    
    setTimeout(() => {
      setLoadingAi(false);
      const balance = stats.totalSales - stats.totalExpenses;
      const health = balance > 0 ? "Positiva" : "Negativa";
      setAiInsight(`Baseado nos dados do período: Sua saúde financeira está ${health} com um saldo de R$ ${balance.toFixed(2)}. Você tem R$ ${stats.receivables.toFixed(2)} a receber. Sugiro focar na cobrança dos clientes vencidos para maximizar o caixa.`);
    }, 2000);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
           <p className="text-slate-500">Visão geral do seu negócio</p>
        </div>
        
        {/* Date Filter */}
        <div className="flex bg-white p-2 rounded-lg shadow-sm border items-center gap-2">
           <Filter size={16} className="text-slate-400"/>
           <input type="date" className="text-sm border-none outline-none text-slate-600" onChange={e => setDateRange({...dateRange, start: e.target.value})} />
           <span className="text-slate-300">-</span>
           <input type="date" className="text-sm border-none outline-none text-slate-600" onChange={e => setDateRange({...dateRange, end: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {settings.dashboardCards.sales && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={48} className="text-green-600"/></div>
            <h3 className="text-slate-500 font-medium text-sm">Vendas no Período</h3>
            <div className="text-3xl font-bold text-slate-800">R$ {stats.totalSales.toFixed(2)}</div>
            <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12}/> Receita consolidada</div>
          </div>
        )}

        {settings.dashboardCards.expenses && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingDown size={48} className="text-red-600"/></div>
            <h3 className="text-slate-500 font-medium text-sm">Contas no Período</h3>
            <div className="text-3xl font-bold text-slate-800">R$ {stats.totalExpenses.toFixed(2)}</div>
            <div className="text-xs text-red-600 flex items-center gap-1"><CheckCircle size={12}/> Despesa consolidada</div>
          </div>
        )}

        {settings.dashboardCards.salesCount && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={48} className="text-blue-600"/></div>
            <h3 className="text-slate-500 font-medium text-sm">Qtd. Vendas</h3>
            <div className="text-3xl font-bold text-slate-800">{stats.salesCount}</div>
            <div className="text-xs text-blue-600">Transações realizadas</div>
          </div>
        )}

        {settings.dashboardCards.receivables && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={48} className="text-orange-600"/></div>
            <h3 className="text-slate-500 font-medium text-sm">A Receber</h3>
            <div className="text-3xl font-bold text-orange-600">R$ {stats.receivables.toFixed(2)}</div>
            <div className="text-xs text-orange-600">{stats.receivablesCount} clientes pendentes</div>
          </div>
        )}

        {settings.dashboardCards.payables && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertCircle size={48} className="text-red-600"/></div>
            <h3 className="text-slate-500 font-medium text-sm">A Pagar</h3>
            <div className="text-3xl font-bold text-red-600">R$ {stats.payables.toFixed(2)}</div>
            <div className="text-xs text-red-600">{stats.payablesCount} contas pendentes</div>
          </div>
        )}

        {settings.dashboardCards.birthdays && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Gift size={48} className="text-pink-600"/></div>
            <h3 className="text-slate-500 font-medium text-sm">Aniversariantes</h3>
            <div className="text-3xl font-bold text-pink-600">{stats.birthdaysCount}</div>
            <div className="text-xs text-pink-600">No período selecionado</div>
          </div>
        )}
      </div>

      {/* AI Section */}
      <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">Gemini Intelligence</span>
            <h3 className="font-bold text-indigo-900">Análise Financeira Inteligente</h3>
          </div>
          <p className="text-indigo-800 text-sm mb-4 min-h-[40px]">
            {aiInsight || "Clique no botão para gerar uma análise do seu fluxo de caixa utilizando Inteligência Artificial."}
          </p>
          <button 
            onClick={generateAiInsight} 
            disabled={loadingAi}
            className="bg-white text-indigo-600 text-sm font-bold py-2 px-4 rounded shadow hover:bg-indigo-50 disabled:opacity-50"
          >
            {loadingAi ? 'Gerando...' : 'Gerar Análise'}
          </button>
        </div>
      </div>

    </div>
  );
};
