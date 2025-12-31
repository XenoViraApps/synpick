import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
const statusConfig = {
    info: { color: 'blue', icon: 'ℹ' },
    success: { color: 'green', icon: '✓' },
    warning: { color: 'yellow', icon: '⚠' },
    error: { color: 'red', icon: '✗' },
};
export const StatusMessage = ({ type, message, icon }) => {
    const config = statusConfig[type];
    const displayIcon = icon || config.icon;
    return (_jsx(Box, { children: _jsxs(Text, { color: config.color, bold: true, children: [displayIcon, " ", message] }) }));
};
//# sourceMappingURL=StatusMessage.js.map