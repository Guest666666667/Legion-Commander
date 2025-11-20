
import React from 'react';
import { UnitType, CommanderType } from '../types';
import { UNIT_COLORS } from '../constants';
import { Sword, Shield, Target, Hexagon, User, Triangle, CircleOff, Swords, Crosshair, ShieldCheck, Tent, Zap } from 'lucide-react';

interface UnitIconProps {
  type: UnitType;
  subtype?: CommanderType; // Added subtype for Commanders
  size?: number;
  className?: string;
  isUpgraded?: boolean;
}

export const UnitIcon: React.FC<UnitIconProps> = ({ type, subtype, size = 20, className = "", isUpgraded = false }) => {
  let colorClass = UNIT_COLORS[type] || 'bg-gray-500';
  
  // Override color for specific Commander types with deeper shades
  if (type === UnitType.COMMANDER && subtype) {
      switch (subtype) {
          case CommanderType.CENTURION: colorClass = 'bg-orange-700'; break; // Standard commander color
          case CommanderType.ELF: colorClass = 'bg-emerald-950'; break;
          case CommanderType.WARLORD: colorClass = 'bg-red-950'; break;
          case CommanderType.GUARDIAN: colorClass = 'bg-blue-950'; break;
          case CommanderType.VANGUARD: colorClass = 'bg-purple-950'; break;
      }
  }

  let Icon = User;
  switch (type) {
    case UnitType.INFANTRY: Icon = isUpgraded ? Swords : Sword; break;
    case UnitType.ARCHER: Icon = isUpgraded ? Crosshair : Target; break;
    case UnitType.SHIELD: Icon = isUpgraded ? ShieldCheck : Shield; break;
    case UnitType.SPEAR: Icon = isUpgraded ? Tent : Triangle; break; 
    case UnitType.COMMANDER: 
      // Commander Subtype Icons
      if (subtype === CommanderType.ELF) Icon = Crosshair;
      else if (subtype === CommanderType.WARLORD) Icon = Swords;
      else if (subtype === CommanderType.GUARDIAN) Icon = ShieldCheck;
      else if (subtype === CommanderType.VANGUARD) Icon = Zap;
      else Icon = Hexagon; // Default/Centurion
      break;
    case UnitType.OBSTACLE: Icon = CircleOff; break;
  }

  return (
    <div className={`flex items-center justify-center rounded-md shadow-sm text-white ${colorClass} ${className}`} style={{ width: '100%', height: '100%' }}>
      <Icon size={size} strokeWidth={isUpgraded ? 3 : 2.5} />
    </div>
  );
};
