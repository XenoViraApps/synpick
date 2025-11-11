"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelSelector = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ink_1 = require("ink");
const ModelSelector = ({ models, onSelect, onCancel, searchPlaceholder = 'Search models...', initialRegularModel = null, initialThinkingModel = null }) => {
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    const [filteredModels, setFilteredModels] = (0, react_1.useState)(models);
    const [selectedRegularModel, setSelectedRegularModel] = (0, react_1.useState)(initialRegularModel);
    const [selectedThinkingModel, setSelectedThinkingModel] = (0, react_1.useState)(initialThinkingModel);
    const { exit } = (0, ink_1.useApp)();
    const { write } = (0, ink_1.useStdout)();
    // Filter models based on search query
    (0, react_1.useEffect)(() => {
        if (!searchQuery) {
            setFilteredModels(models);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = models.filter(model => {
            const searchText = [
                model.id.toLowerCase(),
                model.getProvider().toLowerCase(),
                model.getModelName().toLowerCase()
            ].join(' ');
            return searchText.includes(query);
        });
        setFilteredModels(filtered);
        setSelectedIndex(0); // Reset selection when filter changes
    }, [searchQuery, models]);
    // Calculate visible range for better scrolling
    const visibleStartIndex = Math.max(0, selectedIndex - 5);
    const visibleEndIndex = Math.min(filteredModels.length, selectedIndex + 6);
    const visibleModels = filteredModels.slice(visibleStartIndex, visibleEndIndex);
    // Handle keyboard input
    (0, ink_1.useInput)((input, key) => {
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
        if (input && !key.ctrl && !key.meta && !key.return && !key.escape && !key.tab &&
            !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow &&
            !key.delete && !key.backspace && input !== 'q' && !(input === 't' && !searchQuery)) {
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
        return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "red", children: "Error: No models available" }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "gray", children: "Press 'q' to quit or Escape to cancel" })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "cyan", children: "Select Models:" }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "gray", children: ["Regular: ", selectedRegularModel ? selectedRegularModel.getDisplayName() : "none", " | Thinking: ", selectedThinkingModel ? selectedThinkingModel.getDisplayName() : "none"] }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "gray", children: ["Search: ", searchQuery || "(type to search)", " "] }) }), filteredModels.length > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "gray", children: ["Found ", filteredModels.length, " model", filteredModels.length !== 1 ? 's' : ''] }) }), visibleStartIndex > 0 && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "gray", children: ["\u25B2 ", visibleStartIndex, " more above"] }) })), visibleModels.map((model, index) => {
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
                        return ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: actualIndex === selectedIndex ? 'green' :
                                                isRegularSelected ? 'cyan' :
                                                    isThinkingSelected ? 'yellow' : 'white', bold: actualIndex === selectedIndex || isRegularSelected || isThinkingSelected, children: [actualIndex === selectedIndex ? '▸ ' : '  ', getSelectionIndicator(), actualIndex + 1, ". ", model.getDisplayName()] }) }), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginLeft: 4, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "gray", dimColor: true, children: ["Provider: ", model.getProvider(), model.context_length && ` | Context: ${Math.round(model.context_length / 1024)}K`, model.quantization && ` | ${model.quantization}`, model.id.toLowerCase().includes('thinking') && ' | 🤔 Thinking'] }) })] }) }, model.id));
                    }), visibleEndIndex < filteredModels.length && ((0, jsx_runtime_1.jsx)(ink_1.Box, { marginBottom: 1, children: (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: "gray", children: ["\u25BC ", filteredModels.length - visibleEndIndex, " more below"] }) })), (0, jsx_runtime_1.jsx)(ink_1.Box, { marginTop: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "gray", children: "\u2191\u2193 Navigate | Enter: Regular Model + Launch | t: Toggle Thinking Model | Space: Launch | q: Quit" }) })] })) : ((0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: "yellow", children: "No models match your search." }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: "gray", children: "Try different search terms." })] }))] }));
};
exports.ModelSelector = ModelSelector;
//# sourceMappingURL=ModelSelector.js.map