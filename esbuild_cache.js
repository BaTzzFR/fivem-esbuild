const path = require('path');
const fs = require('fs');

function getStat(path) {
	try {
		const stat = fs.statSync(path);

		return stat ? {
			mtime: stat.mtimeMs,
			size: stat.size,
			inode: stat.ino,
		} : null;
	} catch {
		return null;
	};
};

function cache({directory}) {
    return {
        name: 'esbuild-cache',
        setup(build) {
            const cache = [];

            build.onLoad({filter: /.*/}, (args) => {
                const file = args.path;
                cache.push({
                    name: file,
                    stats: getStat(file),
                });
            });

            build.onEnd((result) => {
                if(result.errors.length) {
                    return;
                };
                
                fs.writeFile(directory, JSON.stringify(cache), () => {
                    
                });
            });
        },
    };
};

module.exports = cache;
