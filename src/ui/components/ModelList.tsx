import React from 'react';
import { Box, Text } from 'ink';
import { ModelInfoImpl } from '../../models';
import { BYTES_PER_KB, UI_MARGIN_BOTTOM } from '../../utils/constants';

interface ModelListProps {
  models: ModelInfoImpl[];
  selectedIndex?: number;
  showCategories?: boolean;
}

export const ModelList: React.FC<ModelListProps> = ({
  models,
  selectedIndex,
  showCategories: _showCategories = false,
}) => {
  if (models.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray">No models available.</Text>
        {'\n'}
        <Text color="gray">Try running 'synclaude models --refresh' to update the model list.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {models.map((model, index) => (
        <Box key={model.id} marginBottom={UI_MARGIN_BOTTOM}>
          <Text color={selectedIndex === index ? 'blue' : 'white'}>
            {selectedIndex === index ? '➤ ' : '  '}
            {index + 1}. {model.getDisplayName()}
          </Text>
          {'\n'}
          <Text color="gray">
            {'    '}Provider: {model.getProvider()}
          </Text>
          {(model as any).context_length && (
            <>
              {'\n'}
              <Text color="gray">
                {'    '}Context: {Math.round((model as any).context_length / BYTES_PER_KB)}K tokens
              </Text>
            </>
          )}
          {(model as any).quantization && (
            <>
              {'\n'}
              <Text color="gray">
                {'    '}Quantization: {(model as any).quantization}
              </Text>
            </>
          )}
          {model.owned_by && (
            <>
              {'\n'}
              <Text color="gray">
                {'    '}Owner: {model.owned_by}
              </Text>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};
