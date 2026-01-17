/**
 * Password Input Component
 *
 * A simple password input that masks characters
 */

import { Box, Text, useInput, useApp } from 'ink';
import { useCallback, useState, useEffect } from 'react';

interface PasswordInputProps {
  prompt?: string;
  minLength?: number;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export function PasswordInput({
  prompt = 'Password: ',
  minLength = 0,
  onSubmit,
  onCancel,
}: PasswordInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { exit } = useApp();

  const handleSubmit = useCallback(() => {
    if (value.length < minLength) {
      setError(`Password must be at least ${minLength} characters`);
      return;
    }
    onSubmit(value);
  }, [value, minLength, onSubmit]);

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }

      if (key.return) {
        handleSubmit();
        return;
      }

      if (key.backspace || key.delete) {
        setValue(v => v.slice(0, -1));
        setError(null);
        return;
      }

      // Only accept single characters (ignore control keys)
      if (input && input.length === 1) {
        setValue(v => v + input);
        setError(null);
      }
    },
    { isActive: true }
  );

  useEffect(() => {
    // Focus management - ensure we capture input
  }, []);

  // Determine masked display (show asterisks for each character)
  const maskedValue = '*'.repeat(value.length);

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{prompt}</Text>
        <Text color="yellow">{maskedValue}</Text>
        <Text>&nbsp;</Text>
        {error && <Text color="red">{error}</Text>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Enter to submit, Escape to cancel</Text>
      </Box>
    </Box>
  );
}
