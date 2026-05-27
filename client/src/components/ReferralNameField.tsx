import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { CartManager } from '@/lib/cart';
import { REFERRAL_NAMES } from '@shared/referrals';

interface ReferralNameFieldProps {
  error?: string;
  onErrorChange?: (error: string) => void;
}

export function ReferralNameField({ error, onErrorChange }: ReferralNameFieldProps) {
  const [value, setValue] = useState(CartManager.getReferralName());

  useEffect(() => {
    const sync = () => setValue(CartManager.getReferralName());
    window.addEventListener('cartUpdated', sync);
    return () => window.removeEventListener('cartUpdated', sync);
  }, []);

  const handleChange = (next: string) => {
    setValue(next);
    CartManager.setReferralName(next);
    onErrorChange?.('');
  };

  return (
    <div>
      <Label className="text-white text-sm mb-2 block">Referral (Optional)</Label>
      <p className="text-white/50 text-xs mb-2">Which teacher or TA referred you?</p>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 [&>option]:bg-gray-900"
      >
        <option value="">Select a name (optional)</option>
        {REFERRAL_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {value && !error && (
        <p className="text-green-400 text-xs mt-1">Referral: {value}</p>
      )}
    </div>
  );
}
