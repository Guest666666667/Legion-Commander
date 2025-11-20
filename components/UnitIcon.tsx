
import React from 'react';
import { UnitType } from '../types';
import { UNIT_COLORS } from '../constants';
import { Sword, Shield, Target, Hexagon, User, Triangle, CircleOff, Swords, Crosshair, ShieldCheck, Tent } from 'lucide-react';

interface UnitIconProps {
  type: UnitType;
  size?: number;
  className?: string;
  isUpgraded?: boolean;
}

export const UnitIcon: React.FC<UnitIconProps> = ({ type, size = 20, className = "", isUpgraded = false }) => {
  const colorClass = UNIT_COLORS[type] || 'bg-gray-500';
  
  let Icon = User;
  switch (type) {
    case UnitType.INFANTRY: Icon = isUpgraded ? Swords : Sword; break;
    case UnitType.ARCHER: Icon = isUpgraded ? Crosshair : Target; break;
    case UnitType.SHIELD: Icon = isUpgraded ? ShieldCheck : Shield; break;
    case UnitType.SPEAR: Icon = isUpgraded ? Tent : Triangle; break; 
    case UnitType.COMMANDER: Icon = Hexagon; break;
    case UnitType.OBSTACLE: Icon = CircleOff; break;
  }

  return (
    <div className={`flex items-center justify-center rounded-md shadow-sm text-white ${colorClass} ${className}`} style={{ width: '100%', height: '100%' }}>
      <Icon size={size} strokeWidth={isUpgraded ? 3 : 2.5} />
    </div>
  );
};
