import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { BYTES_PER_KB, UI_MARGIN_BOTTOM } from '../../utils/constants.js';
export const ModelList = ({ models, selectedIndex, showCategories: _showCategories = false, }) => {
    if (models.length === 0) {
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "gray", children: "No models available." }), '\n', _jsx(Text, { color: "gray", children: "Try running 'synclaude models --refresh' to update the model list." })] }));
    }
    return (_jsx(Box, { flexDirection: "column", children: models.map((model, index) => (_jsxs(Box, { marginBottom: UI_MARGIN_BOTTOM, children: [_jsxs(Text, { color: selectedIndex === index ? 'blue' : 'white', children: [selectedIndex === index ? '➤ ' : '  ', index + 1, ". ", model.getDisplayName()] }), '\n', _jsxs(Text, { color: "gray", children: ['    ', "Provider: ", model.getProvider()] }), model.context_length && (_jsxs(_Fragment, { children: ['\n', _jsxs(Text, { color: "gray", children: ['    ', "Context: ", Math.round(model.context_length / BYTES_PER_KB), "K tokens"] })] })), model.quantization && (_jsxs(_Fragment, { children: ['\n', _jsxs(Text, { color: "gray", children: ['    ', "Quantization: ", model.quantization] })] })), model.owned_by && (_jsxs(_Fragment, { children: ['\n', _jsxs(Text, { color: "gray", children: ['    ', "Owner: ", model.owned_by] })] }))] }, model.id))) }));
};
//# sourceMappingURL=ModelList.js.map