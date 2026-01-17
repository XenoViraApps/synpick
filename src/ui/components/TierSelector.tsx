import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { ModelInfoImpl } from '../../models/info';
import { isThinkingModel } from '../../utils/model-utils';

export type TierType = 'default' | 'opus' | 'sonnet' | 'haiku' | 'subagent' | 'thinking';

export interface TierInfo {
  key: TierType;
  label: string;
  modelId?: string;
}

export interface TierSelection {
  default?: string;
  opus?: string;
  sonnet?: string;
  haiku?: string;
  subagent?: string;
  thinking?: string;
}

export interface TierSelectorProps {
  models: ModelInfoImpl[];
  initialSelection?: TierSelection;
  defaultModelId?: string;
  onSelect: (selection: TierSelection) => void;
  onCancel: () => void;
}

const TIER_ORDER: TierType[] = ['default', 'opus', 'sonnet', 'haiku', 'subagent', 'thinking'];

const TIER_LABELS: Record<TierType, string> = {
  default: 'DEFAULT MODEL',
  opus: 'OPUS MODEL',
  sonnet: 'SONNET MODEL',
  haiku: 'HAIKU MODEL',
  subagent: 'SUBAGENT MODEL',
  thinking: 'THINKING MODEL',
};

// Find default model (prefer zai-org GLM, otherwise first model)
const findDefaultModel = (models: ModelInfoImpl[], fallback: string = ''): string => {
  if (models.length === 0) return fallback;
  const zaiModel = models.find(m => m.id.includes('zai-org') && m.id.includes('GLM'));
  if (zaiModel) return zaiModel.id;
  return models[0]?.id || fallback;
};

export function TierSelector({
  models,
  initialSelection = {},
  defaultModelId,
  onSelect,
  onCancel,
}: TierSelectorProps) {
  const [activeTier, setActiveTier] = useState<TierType>('default');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selections, setSelections] = useState<TierSelection>({
    ...initialSelection,
    default: initialSelection.default || defaultModelId || '',
    opus: initialSelection.opus || '',
    sonnet: initialSelection.sonnet || '',
    haiku: initialSelection.haiku || '',
    subagent: initialSelection.subagent || '',
    thinking: initialSelection.thinking || '',
  });
  const [confirmMode, setConfirmMode] = useState(false);

  // Initialize selectedIndex to point to the first selected model or 0
  useEffect(() => {
    const activeTierModelId = selections[activeTier];
    if (activeTierModelId) {
      const idx = models.findIndex(m => m.id === activeTierModelId);
      if (idx >= 0) setSelectedIndex(idx);
    }
  }, [activeTier, models]);

  const activeTierIndex = TIER_ORDER.indexOf(activeTier);

  const handleTab = useCallback(() => {
    const nextIndex = (activeTierIndex + 1) % TIER_ORDER.length;
    setActiveTier(TIER_ORDER[nextIndex]!);
  }, [activeTierIndex]);

  const handleShiftTab = useCallback(() => {
    const prevIndex = (activeTierIndex - 1 + TIER_ORDER.length) % TIER_ORDER.length;
    setActiveTier(TIER_ORDER[prevIndex]!);
  }, [activeTierIndex]);

  const handleArrowUp = useCallback(() => {
    setSelectedIndex(idx => (idx > 0 ? idx - 1 : 0));
  }, []);

  const handleArrowDown = useCallback(() => {
    setSelectedIndex(idx => (idx < models.length - 1 ? idx + 1 : idx));
  }, [models.length]);

  const handleSpace = useCallback(() => {
    const selectedModel = models[selectedIndex];
    if (selectedModel) {
      setSelections(prev => ({
        ...prev,
        [activeTier]: selectedModel.id,
      }));
    }
  }, [selectedIndex, activeTier, models]);

  const handleEnter = useCallback(() => {
    setConfirmMode(true);
  }, []);

  const handleConfirm = useCallback(() => {
    const defaultModel = selections.default || findDefaultModel(models);
    const finalSelection: TierSelection = {
      default: selections.default || defaultModel,
      opus: selections.opus || defaultModel,
      sonnet: selections.sonnet || defaultModel,
      haiku: selections.haiku || defaultModel,
      subagent: selections.subagent || defaultModel,
      thinking: selections.thinking || defaultModel,
    };
    onSelect(finalSelection);
  }, [selections, models, onSelect]);

  const handleBack = useCallback(() => {
    if (confirmMode) {
      setConfirmMode(false);
    } else {
      onCancel();
    }
  }, [confirmMode, onCancel]);

  useInput((input, key) => {
    if (key.tab) {
      if (key.shift) {
        handleShiftTab();
      } else {
        handleTab();
      }
    } else if (key.upArrow) {
      handleArrowUp();
    } else if (key.downArrow) {
      handleArrowDown();
    } else if (key.return) {
      if (confirmMode) {
        handleConfirm();
      } else {
        handleEnter();
      }
    } else if (key.escape) {
      handleBack();
    } else if (input === ' ') {
      handleSpace();
    }
  });

  const getModelDisplayName = (model: ModelInfoImpl): string => {
    const name = model.getDisplayName();
    if (name.length > 35) {
      return name.substring(0, 32) + '...';
    }
    return name;
  };

  const getContextDisplay = (model: ModelInfoImpl): string => {
    if (model.context_length) {
      const k = Math.round(model.context_length / 1024);
      return `${k}K`;
    }
    return '';
  };

  const getSelectedModelDisplay = (tierKey: TierType): string => {
    const modelId = selections[tierKey];
    if (!modelId) return '───────────────';
    const model = models.find(m => m.id === modelId);
    if (model) {
      const name = getModelDisplayName(model);
      return name.padEnd(15);
    }
    return modelId.substring(0, 15);
  };

  const isThinking = (model: ModelInfoImpl): boolean => isThinkingModel(model.id);

  const renderTierRow = (tierKey: TierType) => {
    const isActive = activeTier === tierKey;
    const label = TIER_LABELS[tierKey];
    const modelDisplay = getSelectedModelDisplay(tierKey);

    return (
      <Box key={tierKey}>
        <Text bold={isActive} color={isActive ? 'cyan' : 'white'}>
          {isActive ? '> ' : '  '}
          {label.padEnd(22)}
        </Text>
        <Text color={isActive ? 'cyan' : 'white'}>[{modelDisplay}]</Text>
        {selections[tierKey] && <Text color="green"> ✓</Text>}
      </Box>
    );
  };

  const renderModelRow = (model: ModelInfoImpl, index: number) => {
    const isSelected = selectedIndex === index;
    const isTierSelected = selections[activeTier] === model.id;
    const thinking = isThinking(model);

    return (
      <Box key={model.id}>
        <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'}>
          {isSelected ? '> ' : '  '}
        </Text>
        <Text color={isSelected ? 'cyan' : 'white'}>{getModelDisplayName(model).padEnd(36)}</Text>
        {getContextDisplay(model) && <Text dimColor>({getContextDisplay(model)} tokens)</Text>}
        {thinking && <Text color="magenta"> 🤔</Text>}
        {isTierSelected && <Text color="green"> ✓</Text>}
      </Box>
    );
  };

  // Confirmation screen
  if (confirmMode) {
    const defaultModel = selections.default || findDefaultModel(models);
    const finalPreview: TierSelection = {
      default: selections.default || defaultModel,
      opus: selections.opus || defaultModel,
      sonnet: selections.sonnet || defaultModel,
      haiku: selections.haiku || defaultModel,
      subagent: selections.subagent || defaultModel,
      thinking: selections.thinking || defaultModel,
    };

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="yellow">
            ══════════════════════════════════════════════════════
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text bold color="yellow" inverse>
            {' '.repeat(12)} CONFIRM YOUR SELECTIONS {' '.repeat(12)}
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text bold color="yellow">
            ══════════════════════════════════════════════════════
          </Text>
        </Box>
        <Box flexDirection="column" marginBottom={1}>
          {TIER_ORDER.map(tierKey => {
            const modelId = finalPreview[tierKey];
            const model = models.find(m => m.id === modelId);
            const displayName = model ? getModelDisplayName(model) : 'Not available';
            return (
              <Box key={tierKey}>
                <Text color="white">{TIER_LABELS[tierKey].padEnd(18)}</Text>
                <Text color="cyan">{displayName}</Text>
              </Box>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text bold color="yellow">
            ══════════════════════════════════════════════════════
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="green">Press [Enter]</Text> to confirm or <Text color="white">[Esc]</Text> to
          go back
        </Box>
      </Box>
    );
  }

  // Main selection screen
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ══════════════════════════════════════════════════════
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan" inverse>
          {' '.repeat(10)} SELECT MODELS FOR EACH TIER {' '.repeat(10)}
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ══════════════════════════════════════════════════════
        </Text>
      </Box>

      <Box flexDirection="column">
        <Box marginBottom={1}>{TIER_ORDER.map(renderTierRow)}</Box>
      </Box>

      <Box marginBottom={1}>
        <Text color="white">─</Text>
        <Text color="white" dimColor>
          {'─'.repeat(50)}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {models
          .slice(selectedIndex, selectedIndex + 12)
          .map((model, idx) => renderModelRow(model, selectedIndex + idx))}
      </Box>

      <Box marginTop={1}>
        <Text bold color="cyan">
          ══════════════════════════════════════════════════════
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="white">[Tab] </Text>
        <Text color="cyan" bold>
          Next Tier
        </Text>
        <Text color="white"> | </Text>
        <Text color="white">[Shift+Tab] </Text>
        <Text color="cyan" bold>
          Previous Tier
        </Text>
        <Text color="white"> | </Text>
        <Text color="white">[↑/↓] </Text>
        <Text color="cyan" bold>
          Navigate
        </Text>
        <Text color="white"> | </Text>
        <Text color="white">[Space] </Text>
        <Text color="cyan" bold>
          Select
        </Text>
      </Box>

      <Box>
        <Text color="white">[Enter] </Text>
        <Text color="green" bold>
          Confirm
        </Text>
        <Text color="white"> | </Text>
        <Text color="white">[Esc] </Text>
        <Text color="red" bold>
          Cancel
        </Text>
      </Box>
    </Box>
  );
}
