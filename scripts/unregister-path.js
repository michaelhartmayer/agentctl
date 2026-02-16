const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const binDir = path.resolve(__dirname, '..');

if (process.platform === 'win32') {
    try {
        const currentPath = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"').toString().trim();
        if (currentPath.includes(binDir)) {
            // split by ; to safely remove exactly our path
            const paths = currentPath.split(';').filter(p => p && path.resolve(p) !== binDir);
            const newPath = paths.join(';');

            const psCommand = `[Environment]::SetEnvironmentVariable('Path', '${newPath}', 'User')`;
            execSync(`powershell -Command "${psCommand}"`);
            console.log(`Successfully removed ${binDir} from User PATH.`);
        } else {
            console.log(`${binDir} is not in User PATH.`);
        }
    } catch (error) {
        console.error('Failed to unregister path:', error.message);
        process.exit(1);
    }
}

// Clean up wrapper
if (fs.existsSync(path.join(binDir, 'agentctl.cmd'))) {
    fs.unlinkSync(path.join(binDir, 'agentctl.cmd'));
}
