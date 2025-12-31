import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { BYTES_PER_KB, LIST_VISIBLE_BEFORE, LIST_VISIBLE_AFTER, UI_INDENT_SPACES, UI_MARGIN_BOTTOM, } from '../../utils/constants.js';
// Helper function to identify thinking-capable models
function isThinkingModel(modelId) {
    const id = modelId.toLowerCase();
    // Direct "thinking" keyword
    if (id.includes('thinking'))
        return true;
    // Known thinking model patterns
    if (id.includes('minimax') && (id.includes('2') || id.includes('3')))
        return true;
    if (id.includes('deepseek-r1') || id.includes('deepseek-r2') || id.includes('deepseek-r3'))
        return true;
    if (id.includes('deepseek') && (id.includes('3.2') || id.includes('3-2')))
        return true;
    if (id.includes('qwq'))
        return true;
    if (id.includes('o1'))
        return true; // OpenAI o1 series
    if (id.includes('o3'))
        return true; // OpenAI o3 series
    if (id.includes('qwen3'))
        return true; // Qwen 3 thinking variants
    return false;
}
export const ModelSelector = ({ models, onSelect, onCancel, searchPlaceholder: _searchPlaceholder = 'Search models...', initialRegularModel = null, initialThinkingModel = null, }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredModels, setFilteredModels] = useState(models);
    const [selectedRegularModel] = useState(initialRegularModel);
    const [selectedThinkingModel, setSelectedThinkingModel] = useState(initialThinkingModel);
    const { exit } = useApp();
    useStdout();
    // Filter models based on search query
    useEffect(() => {
        if (!searchQuery) {
            setFilteredModels(models);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = models.filter(model => {
            const searchText = [
                model.id.toLowerCase(),
                model.getProvider().toLowerCase(),
                model.getModelName().toLowerCase(),
            ].join(' ');
            return searchText.includes(query);
        });
        setFilteredModels(filtered);
        setSelectedIndex(0); // Reset selection when filter changes
    }, [searchQuery, models]);
    // Calculate visible range for better scrolling
    const visibleStartIndex = Math.max(0, selectedIndex - LIST_VISIBLE_BEFORE);
    const visibleEndIndex = Math.min(filteredModels.length, selectedIndex + LIST_VISIBLE_AFTER);
    const visibleModels = filteredModels.slice(visibleStartIndex, visibleEndIndex);
    // Handle keyboard input
    useInput((input, key) => {
        // Handle special 't' key for thinking model selection when no search query exists
        if (input === 't' && !searchQuery && !key.ctrl && !key.meta) {
            if (filteredModels.length > 0 && selectedIndex < filteredModels.length) {
                const selectedModel = filteredModels[selectedIndex];
                if (selectedModel) {
                    // Toggle thinking model selection
                    if (selectedThinkingModel?.id === selectedModel.id) {
                        setSelectedThinkingModel(null);
                    }
                    else {
                        setSelectedThinkingModel(selectedModel);
                    }
                }
            }
            return;
        }
        // Handle text input for search
        if (input &&
            !key.ctrl &&
            !key.meta &&
            !key.return &&
            !key.escape &&
            !key.tab &&
            !key.upArrow &&
            !key.downArrow &&
            !key.leftArrow &&
            !key.rightArrow &&
            !key.delete &&
            !key.backspace &&
            input !== 'q' &&
            !(input === 't' && !searchQuery)) {
            setSearchQuery(prev => prev + input);
            return;
        }
        // Handle backspace
        if (key.backspace || key.delete) {
            setSearchQuery(prev => prev.slice(0, -1));
            return;
        }
        if (key.escape) {
            onCancel();
            exit();
            return;
        }
        // Space to launch with selections
        if (input === ' ') {
            if (selectedRegularModel || selectedThinkingModel) {
                onSelect(selectedRegularModel, selectedThinkingModel);
                exit();
            }
            return;
        }
        // Enter to select as regular model and launch
        if (key.return) {
            if (filteredModels.length > 0 && selectedIndex < filteredModels.length) {
                const selectedModel = filteredModels[selectedIndex];
                if (selectedModel) {
                    onSelect(selectedModel, selectedThinkingModel);
                    exit();
                }
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex(prev => Math.min(filteredModels.length - 1, prev + 1));
            return;
        }
        // 'q' to quit
        if (input === 'q') {
            onCancel();
            exit();
        }
    });
    if (models.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "red", children: "Error: No models available" }), _jsx(Text, { color: "gray", children: "Press 'q' to quit or Escape to cancel" })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsx(Text, { color: "cyan", children: "Select Models:" }) }), _jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsxs(Text, { color: "gray", children: ["Regular: ", selectedRegularModel ? selectedRegularModel.getDisplayName() : 'none', " | Thinking: ", selectedThinkingModel ? selectedThinkingModel.getDisplayName() : 'none'] }) }), _jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsxs(Text, { color: "gray", children: ["Search: ", searchQuery || '(type to search)', " "] }) }), filteredModels.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsxs(Text, { color: "gray", children: ["Found ", filteredModels.length, " model", filteredModels.length !== 1 ? 's' : ''] }) }), visibleStartIndex > 0 && (_jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsxs(Text, { color: "gray", children: ["\u25B2 ", visibleStartIndex, " more above"] }) })), visibleModels.map((model, index) => {
                        const actualIndex = visibleStartIndex + index;
                        const isRegularSelected = selectedRegularModel?.id === model.id;
                        const isThinkingSelected = selectedThinkingModel?.id === model.id;
                        // Selection indicators
                        const getSelectionIndicator = () => {
                            if (isRegularSelected && isThinkingSelected)
                                return '[R,T] ';
                            if (isRegularSelected)
                                return '[R] ';
                            if (isThinkingSelected)
                                return '[T] ';
                            return '    ';
                        };
                        return (_jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsxs(Box, { flexDirection: "column", children: [_jsx(Box, { children: _jsxs(Text, { color: actualIndex === selectedIndex
                                                ? 'green'
                                                : isRegularSelected
                                                    ? 'cyan'
                                                    : isThinkingSelected
                                                        ? 'yellow'
                                                        : 'white', bold: actualIndex === selectedIndex || isRegularSelected || isThinkingSelected, children: [actualIndex === selectedIndex ? '▸ ' : '  ', getSelectionIndicator(), actualIndex + 1, ". ", model.getDisplayName()] }) }), _jsx(Box, { marginLeft: UI_INDENT_SPACES, children: _jsxs(Text, { color: "gray", children: ["Provider: ", model.getProvider(), model.context_length &&
                                                    ` | Context: ${Math.round(model.context_length / BYTES_PER_KB)}K`, model.quantization && ` | ${model.quantization}`, isThinkingModel(model.id) && ' | 🤔 Thinking'] }) })] }) }, model.id));
                    }), visibleEndIndex < filteredModels.length && (_jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsxs(Text, { color: "gray", children: ["\u25BC ", filteredModels.length - visibleEndIndex, " more below"] }) })), _jsx(Box, { marginTop: 1, children: _jsx(Text, { color: "gray", children: "\u2191\u2193 Navigate | Enter: Regular Model + Launch | t: Toggle Thinking Model | Space: Launch | q: Quit" }) })] })) : (_jsxs(Box, { children: [_jsx(Text, { color: "yellow", children: "No models match your search." }), _jsx(Text, { color: "gray", children: "Try different search terms." })] }))] }));
};
//# sourceMappingURL=ModelSelector.js.map