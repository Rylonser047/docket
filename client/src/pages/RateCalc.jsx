import { useState } from 'react';
import { formatZAR } from '../lib/utils.js';

export default function RateCalc() {
  const [form, setForm] = useState({
    rent: '8000', food: '3000', transport: '2000', phone: '500', subscriptions: '500',
    desiredProfit: '15000', billableHours: '120', taxRate: '27', currentRate: '',
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const totalExpenses = ['rent', 'food', 'transport', 'phone', 'subscriptions'].reduce((s, k) => s + (Number(form[k]) || 0), 0);
  const grossNeeded = (totalExpenses + (Number(form.desiredProfit) || 0)) / (1 - (Number(form.taxRate) || 0) / 100);
  const hours = Number(form.billableHours) || 1;
  const minHourlyRate = grossNeeded / hours;
  const minDayRate = minHourlyRate * 8;
  const minProjectRate = minDayRate * 20;

  const currentRate = Number(form.currentRate) || 0;
  const currentMonthly = currentRate * hours;
  const diff = currentMonthly - grossNeeded;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Rate Calculator</h1>
      <p className="text-gray-500 text-sm mb-8">Find out what you need to charge to cover expenses and hit your profit goals.</p>

      <div className="grid grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Monthly Expenses</h2>
            <div className="space-y-3">
              {[['Rent / Bond', 'rent'], ['Food & Groceries', 'food'], ['Transport', 'transport'], ['Phone / Internet', 'phone'], ['Subscriptions', 'subscriptions']].map(([l, k]) => (
                <div key={k} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 flex-1">{l}</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-400">R</span>
                    <input className="input w-28 text-right" type="number" value={form[k]} onChange={set(k)} />
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Expenses</span>
                <span className="font-semibold text-gray-900">{formatZAR(totalExpenses)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Goals</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-1">Desired Profit</label>
                <div className="flex items-center gap-1"><span className="text-sm text-gray-400">R</span>
                  <input className="input w-28 text-right" type="number" value={form.desiredProfit} onChange={set('desiredProfit')} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-1">Billable Hours / Month</label>
                <input className="input w-28 text-right" type="number" value={form.billableHours} onChange={set('billableHours')} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 flex-1">Tax Rate (%)</label>
                <input className="input w-28 text-right" type="number" value={form.taxRate} onChange={set('taxRate')} />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="card p-5 bg-teal-50 border-teal-100">
            <h2 className="font-semibold text-teal-800 mb-4">Minimum Rates</h2>
            <div className="space-y-4">
              <RateResult label="Hourly Rate" value={formatZAR(minHourlyRate)} sub="/hour" />
              <RateResult label="Day Rate" value={formatZAR(minDayRate)} sub="/day (8hr)" />
              <RateResult label="Project Rate" value={formatZAR(minProjectRate)} sub="/month (20 days)" />
            </div>
            <div className="mt-4 pt-4 border-t border-teal-200">
              <p className="text-xs text-teal-700">Based on {formatZAR(grossNeeded)}/month gross needed after {form.taxRate}% tax</p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Your Current Rate</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">R</span>
              <input className="input flex-1" type="number" value={form.currentRate} onChange={set('currentRate')} placeholder="Enter your hourly rate" />
              <span className="text-sm text-gray-500">/hr</span>
            </div>
            {currentRate > 0 && (
              <div className={`rounded-lg p-4 ${diff >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <p className={`font-semibold ${diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  At R{currentRate}/hr you are {diff >= 0 ? 'earning' : 'losing'} {formatZAR(Math.abs(diff))}/month
                </p>
                <p className={`text-sm mt-1 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {diff >= 0
                    ? `${formatZAR(diff)} above your minimum — great position!`
                    : `You need to raise rates by at least ${formatZAR(Math.abs(diff) / hours)}/hr`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RateResult({ label, value, sub }) {
  return (
    <div className="flex items-end justify-between">
      <span className="text-sm text-teal-700">{label}</span>
      <div className="text-right">
        <span className="text-xl font-bold text-teal-800">{value}</span>
        <span className="text-xs text-teal-600 ml-1">{sub}</span>
      </div>
    </div>
  );
}
