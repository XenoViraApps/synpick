import React from 'react';
import { Box, Text } from 'ink';
import {
  PERCENTAGE_MIN,
  PERCENTAGE_MAX,
  DEFAULT_PROGRESS_BAR_WIDTH,
  UI_MARGIN_BOTTOM,
} from '../../utils/constants';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  width?: number;
  character?: string;
  backgroundColor?: string;
  fillColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  width = DEFAULT_PROGRESS_BAR_WIDTH,
  character = '█',
  backgroundColor = 'gray',
  fillColor = 'green',
}) => {
  const percentage = Math.min(
    PERCENTAGE_MAX,
    Math.max(PERCENTAGE_MIN, (current / total) * PERCENTAGE_MAX)
  );
  const filledChars = Math.round((percentage / PERCENTAGE_MAX) * width);
  const emptyChars = width - filledChars;

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={UI_MARGIN_BOTTOM}>
          <Text>{label}</Text>
        </Box>
      )}
      <Box>
        <Text color={fillColor}>{character.repeat(filledChars)}</Text>
        <Text color={backgroundColor}>{character.repeat(emptyChars)}</Text>
        <Text> {percentage.toFixed(1)}%</Text>
      </Box>
      {total > 0 && (
        <Text color="gray">
          {current} / {total}
        </Text>
      )}
    </Box>
  );
};
