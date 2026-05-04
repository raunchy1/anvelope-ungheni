'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, User, Car, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { ClientWithCars } from './types';

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectClient: (client: ClientWithCars, carIndex?: number) => void;
  error?: string;
}

export function ClientAutocomplete({ 
  value, 
  onChange, 
  onSelectClient,
  error 
}: ClientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<ClientWithCars[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const searchClients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search by client name or car number using JOIN
      const { data, error } = await supabase
        .from('clienti')
        .select(`
          id,
          nume,
          telefon,
          masini (
            id,
            numar_masina,
            marca_model,
            dimensiune_anvelope,
            last_km
          )
        `)
        .or(`nume.ilike.%${query}%,telefon.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Also search by car number
      const { data: carsData, error: carsError } = await supabase
        .from('masini')
        .select(`
          id,
          numar_masina,
          marca_model,
          dimensiune_anvelope,
          last_km,
          clienti!inner (
            id,
            nume,
            telefon
          )
        `)
        .ilike('numar_masina', `%${query}%`)
        .limit(10);

      if (carsError) throw carsError;

      // Merge results - clients from name search
      const clientsFromName = (data || []).map(c => ({
        id: c.id,
        nume: c.nume,
        telefon: c.telefon,
        masini: c.masini || [],
      }));

      // Clients from car search - clienti is returned as array due to Supabase types
      const clientsFromCars = (carsData || []).map((car: any) => {
        const client = Array.isArray(car.clienti) ? car.clienti[0] : car.clienti;
        return {
          id: client?.id,
          nume: client?.nume,
          telefon: client?.telefon,
          masini: [{
            id: car.id,
            numar_masina: car.numar_masina,
            marca_model: car.marca_model,
            dimensiune_anvelope: car.dimensiune_anvelope,
            last_km: car.last_km,
          }],
        };
      }).filter(c => c.id); // Remove nulls

      // Merge and deduplicate by client id
      const allClients = [...clientsFromName, ...clientsFromCars];
      const uniqueClients = allClients.reduce((acc, curr) => {
        const existing = acc.find(c => c.id === curr.id);
        if (existing) {
          // Merge cars
          curr.masini?.forEach(m => {
            if (!existing.masini?.find(em => em.id === m.id)) {
              existing.masini?.push(m);
            }
          });
        } else {
          acc.push(curr);
        }
        return acc;
      }, [] as ClientWithCars[]);

      setSuggestions(uniqueClients);
    } catch (err) {
      console.error('Error searching clients:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(value);
    }, 200);
    return () => clearTimeout(timer);
  }, [value, searchClients]);

  const handleSelectClient = (client: ClientWithCars, carIndex: number = 0) => {
    onChange(client.nume);
    onSelectClient(client, carIndex);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Nume Client <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Caută după nume sau număr mașină..."
          className={`
            w-full pl-10 pr-4 py-2.5 rounded-lg border
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200
            ${error 
              ? 'border-red-300 bg-red-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
          `}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((client) => (
              <div key={client.id} className="border-b border-gray-100 last:border-0">
                {/* Client Header */}
                <button
                  type="button"
                  onClick={() => handleSelectClient(client, 0)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {client.nume}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      {client.telefon && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.telefon}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Cars List */}
                {client.masini && client.masini.length > 0 && (
                  <div className="bg-gray-50/50">
                    {client.masini.map((car, idx) => (
                      <button
                        key={car.id}
                        type="button"
                        onClick={() => handleSelectClient(client, idx)}
                        className="w-full pl-12 pr-4 py-2 flex items-center gap-2 hover:bg-blue-50/70 transition-colors text-left"
                      >
                        <Car className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700">
                            {car.numar_masina}
                            {car.marca_model && (
                              <span className="text-gray-500 ml-2">
                                — {car.marca_model}
                              </span>
                            )}
                          </div>
                          {(car.dimensiune_anvelope || car.last_km) && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {car.dimensiune_anvelope}
                              {car.dimensiune_anvelope && car.last_km && ' • '}
                              {car.last_km && `${car.last_km.toLocaleString()} km`}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
