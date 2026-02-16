const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const binDir = path.resolve(__dirname, '..');

// Create wrapper scripts for direct execution
const cmdContent = `@echo off\r\nnode "%~dp0\\dist\\index.js" %*`;
fs.writeFileSync(path.join(binDir, 'agentctl.cmd'), cmdContent);

if (process.platform === 'win32') {
    try {
        const currentPath = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"').toString().trim();
        if (!currentPath.includes(binDir)) {
            const newPath = currentPath + (currentPath.endsWith(';') ? '' : ';') + binDir;
            // Use setx for persistence but beware truncation. Powershell is safer for full string.
            // But setx /M needs admin. User path doesn't.
            // Powershell approach:
            const psCommand = `[Environment]::SetEnvironmentVariable('Path', '${newPath}', 'User')`;
            execSync(`powershell -Command "${psCommand}"`);
            console.log(`Successfully added ${binDir} to User PATH.`);
            console.log('You may need to restart your terminal/shell for changes to take effect.');
        } else {
            console.log(`${binDir} is already in User PATH.`);
        }
    } catch (error) {
        console.error('Failed to register path:', error.message);
        process.exit(1);
    }
} else {
    console.log('Path registration script currently supports Windows only.');
}
