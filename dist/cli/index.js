#!/usr/bin/env node
import { createProgram } from './commands.js';
async function main() {
    try {
        const program = createProgram();
        // Parse command line arguments
        program.parse(process.argv);
    }
    catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Run main function when this file is the entry point
main();
export { main };
//# sourceMappingURL=index.js.map