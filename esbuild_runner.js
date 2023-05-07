const esbuild = require('esbuild');
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
                    return {errors: result.errors};
                };
               
                fs.writeFile(directory, JSON.stringify(cache),() => {});
            });
        },
    };
};

module.exports = (options, callback) => {
    const config = require(options.configPath);

    config.absWorkingDir = options.resourcePath;

    if(!config.plugins) {
        config.plugins = [];
    };

    config.plugins.push(cache({directory: options.cachePath}));

    esbuild.build(config)
    .then(() => {
        callback(null, {});
    })
    .catch((error) => {
        callback(null, error);
        return;
    });
};