'use client';

import React, { useState } from 'react';
import { Bell, Plus, X, Trash2, Edit2, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { alertsClient } from '../data/alertsClient';
import type { Alert, AlertCategory, AlertFormData, ThreatLevel } from '../domain/types';

const COUNTRIES = [
  'United States', 'Russia', 'China', 'Ukraine', 'Israel', 'Iran', 'Taiwan', 
  'North Korea', 'South Korea', 'Japan', 'India', 'Pakistan', 'Saudi Arabia',
  'Turkey', 'Syria', 'Yemen', 'Afghanistan', 'Venezuela', 'Brazil', 'Mexico',
  'United Kingdom', 'France', 'Germany', 'Poland', 'Belarus', 'Moldova'
];

const CATEGORIES: AlertCategory[] = ['conflict', 'diplomacy', 'economy', 'nuclear', 'cyber', 'political'];
const THREAT_LEVELS: ThreatLevel[] = ['critical', 'high', 'moderate', 'low'];

type AlertsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

type AlertArrayField = 'countries' | 'categories' | 'threat_levels';

export default function AlertsPanel({ isOpen, onClose }: AlertsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [formData, setFormData] = useState<AlertFormData>({
    name: '',
    countries: [],
    categories: [],
    threat_levels: [],
    keywords: [],
    is_active: true,
    email_notifications: false
  });
  const [keywordInput, setKeywordInput] = useState('');

  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: () => alertsClient.list()
  });

  const createMutation = useMutation<Alert, Error, AlertFormData>({
    mutationFn: (data) => alertsClient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      resetForm();
    }
  });

  const updateMutation = useMutation<Alert, Error, { id: string; data: Partial<AlertFormData> }>({
    mutationFn: ({ id, data }) => alertsClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => alertsClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      countries: [],
      categories: [],
      threat_levels: [],
      keywords: [],
      is_active: true,
      email_notifications: false
    });
    setKeywordInput('');
    setIsCreating(false);
    setEditingAlert(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingAlert) {
      updateMutation.mutate({ id: editingAlert.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setFormData({
      name: alert.name || '',
      countries: alert.countries || [],
      categories: alert.categories || [],
      threat_levels: alert.threat_levels || [],
      keywords: alert.keywords || [],
      is_active: alert.is_active !== false,
      email_notifications: alert.email_notifications || false
    });
    setIsCreating(true);
  };

  const toggleActive = (alert: Alert) => {
    updateMutation.mutate({
      id: alert.id,
      data: { is_active: !alert.is_active }
    });
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const toggleArrayItem = (field: AlertArrayField, item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0a0a0a] border-cyan-900/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <Bell className="w-5 h-5" />
            <span className="tracking-wider">CUSTOM ALERTS</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create/Edit Form */}
          {isCreating ? (
            <div className="p-4 bg-[#111] border border-cyan-900/30 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-cyan-400">
                  {editingAlert ? 'EDIT ALERT' : 'CREATE NEW ALERT'}
                </span>
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Alert Name */}
              <div>
                <label className="text-[10px] text-gray-500 tracking-wider block mb-1">ALERT NAME</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Middle East Conflict Watch"
                  className="bg-[#0a0a0a] border-cyan-900/30 text-white"
                />
              </div>

              {/* Countries */}
              <div>
                <label className="text-[10px] text-gray-500 tracking-wider block mb-2">COUNTRIES TO MONITOR</label>
                <div className="flex flex-wrap gap-1.5">
                  {COUNTRIES.map(country => (
                    <button
                      key={country}
                      onClick={() => toggleArrayItem('countries', country)}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        formData.countries.includes(country)
                          ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400'
                          : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="text-[10px] text-gray-500 tracking-wider block mb-2">EVENT CATEGORIES</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleArrayItem('categories', cat)}
                      className={`text-[10px] px-2 py-1 rounded border capitalize transition-colors ${
                        formData.categories.includes(cat)
                          ? 'bg-amber-900/30 border-amber-500 text-amber-400'
                          : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Threat Levels */}
              <div>
                <label className="text-[10px] text-gray-500 tracking-wider block mb-2">MINIMUM THREAT LEVEL</label>
                <div className="flex flex-wrap gap-1.5">
                  {THREAT_LEVELS.map(level => {
                    const colors = {
                      critical: 'bg-red-900/30 border-red-500 text-red-400',
                      high: 'bg-orange-900/30 border-orange-500 text-orange-400',
                      moderate: 'bg-yellow-900/30 border-yellow-500 text-yellow-400',
                      low: 'bg-green-900/30 border-green-500 text-green-400'
                    };
                    return (
                      <button
                        key={level}
                        onClick={() => toggleArrayItem('threat_levels', level)}
                        className={`text-[10px] px-2 py-1 rounded border capitalize transition-colors ${
                          formData.threat_levels.includes(level)
                            ? colors[level]
                            : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="text-[10px] text-gray-500 tracking-wider block mb-2">KEYWORDS</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword..."
                    className="bg-[#0a0a0a] border-cyan-900/30 text-white text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword} size="sm" className="bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.keywords.map(keyword => (
                    <span key={keyword} className="text-[10px] px-2 py-1 bg-purple-900/30 border border-purple-500/50 text-purple-400 rounded flex items-center gap-1">
                      {keyword}
                      <button onClick={() => removeKeyword(keyword)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={resetForm} variant="ghost" className="text-gray-400">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700">
                  <Check className="w-4 h-4 mr-2" />
                  {editingAlert ? 'Update Alert' : 'Create Alert'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsCreating(true)}
              className="w-full bg-cyan-900/20 border border-cyan-900/30 text-cyan-400 hover:bg-cyan-900/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Alert
            </Button>
          )}

          {/* Existing Alerts */}
          <div className="space-y-2">
            <span className="text-[10px] text-gray-500 tracking-wider block">YOUR ALERTS</span>
            
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">
                No alerts configured. Create one to get started.
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 bg-[#111] border rounded-lg ${
                    alert.is_active ? 'border-cyan-900/30' : 'border-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-white">{alert.name}</h3>
                        {!alert.is_active && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">PAUSED</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {alert.countries?.slice(0, 3).map(country => (
                          <span key={country} className="text-[9px] px-1.5 py-0.5 bg-cyan-900/20 text-cyan-400 rounded">
                            {country}
                          </span>
                        ))}
                        {alert.countries?.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                            +{alert.countries.length - 3} more
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {alert.categories?.map(cat => (
                          <span key={cat} className="text-[9px] px-1.5 py-0.5 bg-amber-900/20 text-amber-400 rounded capitalize">
                            {cat}
                          </span>
                        ))}
                        {alert.threat_levels?.map(level => (
                          <span key={level} className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                            level === 'critical' ? 'bg-red-900/20 text-red-400' :
                            level === 'high' ? 'bg-orange-900/20 text-orange-400' :
                            level === 'moderate' ? 'bg-yellow-900/20 text-yellow-400' :
                            'bg-green-900/20 text-green-400'
                          }`}>
                            {level}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(alert)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                      >
                        {alert.is_active ? (
                          <ToggleRight className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(alert)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(alert.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
