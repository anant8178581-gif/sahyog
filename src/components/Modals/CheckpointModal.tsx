import React, { useState } from 'react';
import { X, Flag, MapPin, Clock } from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import type { Checkpoint } from '../../types';

interface CheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, addCheckpoint } = useTeam();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<Checkpoint['type']>('RALLY_POINT');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      addCheckpoint({
        name: name.trim(),
        description: description.trim() || undefined,
        location: {
          lat: currentUser.location.lat + (Math.random() - 0.5) * 0.005,
          lng: currentUser.location.lng + (Math.random() - 0.5) * 0.005,
        },
        type,
      });
      onClose();
      setName('');
      setDescription('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        <div className="bg-blue-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Flag className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Create Field Checkpoint</h3>
              <p className="text-blue-100 text-xs leading-tight">
                Establish meeting coordinate or rally sector
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-white/80 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">
              Checkpoint Designation
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rally Point Bravo"
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">
              Designated Purpose
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white"
            >
              <option value="RALLY_POINT">Rally Point (Team Assembly)</option>
              <option value="OBSERVATION_POST">Observation Post</option>
              <option value="SUPPLY_DROP">Supply Drop Point</option>
              <option value="EXTRACTION_ZONE">Medical Extraction Zone</option>
              <option value="CUSTOM">Tactical Reference Point</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">
              Operational Instructions
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Assemble on south ridge under dense foliage cover."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 min-h-[70px]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
            >
              Broadcast Point
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
