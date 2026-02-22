import { useState, useCallback, useMemo } from 'react';
import { Lock, Unlock, ChevronRight } from 'lucide-react';
import type { StructureElement, StructureChoices } from '../types';

interface StructureAssessmentProps {
  /** Detected structural elements */
  elements: StructureElement[];
  /** Callback when user clicks continue */
  onContinue: (choices: StructureChoices) => void;
  /** Whether the user can interact with the component */
  disabled?: boolean;
}

/** Category labels for grouping */
const CATEGORY_LABELS = {
  structural: 'Structural Elements',
  fixture: 'Fixtures & Built-ins', 
  moveable: 'Moveable Elements'
} as const;

/** Category descriptions */
const CATEGORY_DESCRIPTIONS = {
  structural: 'Permanent architectural features',
  fixture: 'Semi-permanent installations you can choose to keep or change',
  moveable: 'Items that can be easily rearranged or replaced'
} as const;

/**
 * Structure assessment component for choosing which elements to keep vs change
 */
export const StructureAssessment: React.FC<StructureAssessmentProps> = ({
  elements,
  onContinue,
  disabled = false
}) => {
  // Initialize choices based on keepByDefault values
  const [keepChoices, setKeepChoices] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    elements.forEach(element => {
      initial[element.id] = element.keepByDefault;
    });
    return initial;
  });

  // Group elements by category
  const groupedElements = useMemo(() => {
    const groups: Record<string, StructureElement[]> = {
      structural: [],
      fixture: [],
      moveable: []
    };
    
    elements.forEach(element => {
      const cat = element.category;
      if (groups[cat]) groups[cat].push(element);
      else groups[cat] = [element];
    });

    return groups;
  }, [elements]);

  // Toggle whether to keep an element
  const toggleElement = useCallback((elementId: string) => {
    if (disabled) return;
    
    setKeepChoices(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  }, [disabled]);

  // Create structure choices object for parent
  const createStructureChoices = useCallback((): StructureChoices => {
    const elementsToKeep = elements.filter(el => keepChoices[el.id]);
    const elementsToChange = elements.filter(el => !keepChoices[el.id]);
    
    return {
      keepChoices,
      elementsToKeep,
      elementsToChange
    };
  }, [elements, keepChoices]);

  // Handle continue button click
  const handleContinue = useCallback(() => {
    if (disabled) return;
    onContinue(createStructureChoices());
  }, [disabled, onContinue, createStructureChoices]);

  // Count elements to keep vs change for summary
  const summary = useMemo(() => {
    const toKeep = elements.filter(el => keepChoices[el.id]).length;
    const toChange = elements.length - toKeep;
    return { toKeep, toChange };
  }, [elements, keepChoices]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
          Structure Assessment
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Before generating designs, choose which elements to keep as-is versus open to changes. 
          This helps create more targeted recommendations for your space.
        </p>
      </div>

      {/* Category sections */}
      <div className="space-y-8 mb-8">
        {(['structural', 'fixture', 'moveable'] as const).map(category => {
          const categoryElements = groupedElements[category] || [];
          if (categoryElements.length === 0) return null;

          return (
            <div key={category} className="bg-white dark:bg-neutral-800  border border-neutral-200 dark:border-neutral-700">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  {CATEGORY_LABELS[category]}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>
              
              <div className="p-6 space-y-3">
                {categoryElements.map(element => {
                  const isKeep = keepChoices[element.id];
                  const canToggle = true; // All elements can be toggled — user decides what stays
                  
                  return (
                    <div
                      key={element.id}
                      className={`flex items-center justify-between p-4  transition-all duration-200 ${
                        canToggle 
                          ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50' 
                          : 'cursor-not-allowed opacity-75'
                      } ${
                        isKeep 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                      }`}
                      onClick={() => canToggle && toggleElement(element.id)}
                      role={canToggle ? "button" : undefined}
                      tabIndex={canToggle && !disabled ? 0 : -1}
                      onKeyDown={(e) => {
                        if (canToggle && !disabled && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          toggleElement(element.id);
                        }
                      }}
                      aria-label={canToggle ? `Toggle ${element.name}: currently ${isKeep ? 'keeping' : 'changing'}` : `${element.name}: keeping (cannot change)`}
                    >
                      <div className="flex items-center gap-3">
                        {isKeep ? (
                          <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Unlock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        )}
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">
                            {element.name}
                          </div>
                          <div className={`text-sm ${
                            isKeep 
                              ? 'text-emerald-700 dark:text-emerald-300' 
                              : 'text-amber-700 dark:text-amber-300'
                          }`}>
                            {isKeep ? 'Keep unchanged' : 'Open to changes'}
                          </div>
                        </div>
                      </div>
                      
                      {canToggle && (
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isKeep 
                            ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' 
                            : 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                        }`}>
                          {isKeep ? 'Keep' : 'Change'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-neutral-100 dark:bg-neutral-800  p-6 mb-8">
        <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Summary</h4>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-300">
              {summary.toKeep} elements to keep
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300">
              {summary.toChange} elements open to change
            </span>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <div className="text-center">
        <button
          onClick={handleContinue}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900  font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          aria-label={`Continue to designs with ${summary.toKeep} elements kept and ${summary.toChange} elements open to change`}
        >
          Continue to Designs
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};