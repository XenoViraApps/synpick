import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { PERCENTAGE_MIN, PERCENTAGE_MAX, DEFAULT_PROGRESS_BAR_WIDTH, UI_MARGIN_BOTTOM, } from '../../utils/constants.js';
export const ProgressBar = ({ current, total, label, width = DEFAULT_PROGRESS_BAR_WIDTH, character = '█', backgroundColor = 'gray', fillColor = 'green', }) => {
    const percentage = Math.min(PERCENTAGE_MAX, Math.max(PERCENTAGE_MIN, (current / total) * PERCENTAGE_MAX));
    const filledChars = Math.round((percentage / PERCENTAGE_MAX) * width);
    const emptyChars = width - filledChars;
    return (_jsxs(Box, { flexDirection: "column", children: [label && (_jsx(Box, { marginBottom: UI_MARGIN_BOTTOM, children: _jsx(Text, { children: label }) })), _jsxs(Box, { children: [_jsx(Text, { color: fillColor, children: character.repeat(filledChars) }), _jsx(Text, { color: backgroundColor, children: character.repeat(emptyChars) }), _jsxs(Text, { children: [" ", percentage.toFixed(1), "%"] })] }), total > 0 && (_jsxs(Text, { color: "gray", children: [current, " / ", total] }))] }));
};
//# sourceMappingURL=ProgressBar.js.map