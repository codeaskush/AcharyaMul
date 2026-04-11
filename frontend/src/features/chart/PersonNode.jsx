import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Eye, Heart, Baby } from 'lucide-react';

const genderColors = {
  male: { bg: 'bg-blue-50', border: 'border-[var(--color-male)]', text: 'text-[var(--color-male)]' },
  female: { bg: 'bg-pink-50', border: 'border-[var(--color-female)]', text: 'text-[var(--color-female)]' },
  other: { bg: 'bg-purple-50', border: 'border-[var(--color-other)]', text: 'text-[var(--color-other)]' },
};

function PersonNode({ data, selected }) {
  const { person, isPending, onViewDetails, onAddSpouse, onAddChild } = data;
  const colors = genderColors[person.gender] || genderColors.other;
  const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase();
  const romanName = [person.first_name, person.last_name].filter(Boolean).join(' ');
  const devanagariName = [person.first_name_devanagari, person.last_name_devanagari].filter(Boolean).join(' ');

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle id="left" type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle id="right" type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`
              flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 cursor-pointer
              transition-all duration-200 w-[180px]
              ${colors.bg} ${colors.border}
              ${isPending ? 'opacity-50 border-dashed' : ''}
              ${selected ? 'shadow-lg brightness-110 saturate-150' : 'hover:shadow-md'}
            `}
          >
            <div className={`w-9 h-9 rounded-full border ${colors.border} flex items-center justify-center shrink-0 bg-white overflow-hidden`}>
              {person.photo_url ? (
                <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className={`text-xs font-bold ${colors.text}`}>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-800 truncate leading-tight">{romanName}</div>
              {devanagariName && (
                <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">{devanagariName}</div>
              )}
              {!person.is_alive && (
                <div className="text-[9px] text-gray-400 mt-0.5">
                  {person.dob?.ad?.slice(0, 4) || '?'} – {person.dod?.ad?.slice(0, 4) || '?'}
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onViewDetails?.(person)}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onAddSpouse?.(person)}>
            <Heart className="h-4 w-4 mr-2" />
            Add Spouse
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onAddChild?.(person)}>
            <Baby className="h-4 w-4 mr-2" />
            Add Child
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}

export default memo(PersonNode);
