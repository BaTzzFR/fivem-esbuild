const workerFarm = require('worker-farm');
const path = require('path');
const fs = require('fs');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

let buildingInProgress = false;

const esbuildBuildTask = {
    shouldBuild(resourceName) {
        const numMetaData = GetNumResourceMetadata(resourceName, 'esbuild_config');

        if(numMetaData > 0) {
            for (let i = 0; i < numMetaData; i++) {
                const config = GetResourceMetadata(resourceName, 'esbuild_config');
                if(shouldBuild(config)) {
                    return true;
                };
            };
        };

        return false;

        function loadCache(config) {
            const cachePath = `cache/${resourceName}/${config.replace(/\//g, '_')}.json`;

            try {
                return JSON.parse(fs.readFileSync(cachePath, {encoding: 'utf8'}));
            } catch {
                return null;
            };
        };

        function shouldBuild(config) {
            const cache = loadCache(config);

            if (!cache) {
                return true;
            }

            for (const file of cache) {
                const stats = getStat(file.name);

                if (!stats ||
                    stats.mtime !== file.stats.mtime ||
                    stats.size !== file.stats.size ||
                    stats.inode !== file.stats.inode) {
                    return true;
                };
            };

            return false;
        };

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
    },

    build(resourceName, cb) {
        (async () => {
            const promises = [];
            const configs = [];
            const numMetaData = GetNumResourceMetadata(resourceName, 'esbuild_config');

            for (let i = 0; i < numMetaData; i++) {
                configs.push(GetResourceMetadata(resourceName, 'esbuild_config', i));
            };

            for (const configName of configs) {
                const resourcePath = path.resolve(GetResourcePath(resourceName));
                const configPath = path.join(resourcePath, configName);
                const cachePath = `cache/${resourceName}/${configName.replace(/\//g, '_')}.json`;

                try {
                    fs.mkdirSync(path.dirname(cachePath));
                } catch {};

                const config = require(configPath);
                const workers = workerFarm(require.resolve('./esbuild_runner.js'))
                
                if(config) {
                    while (buildingInProgress) {
                        console.log(`esbuild is busy: we are waiting to compile ${resourceName} (${configName})`);
                        await sleep(3000);
                    };

                    console.log(`${resourceName}: started building ${configName}`);
                    buildingInProgress = true;

                    promises.push(new Promise((resolve, reject) => {
                        workers({
                            configPath,
                            cachePath,
                            resourcePath
                        }, (error, out) => {
                            workerFarm.end(workers);

                            if(error) {
                                console.error(error);
                                buildingInProgress = false;
                                reject('Worker farm esbuild errored out');
                                return;
                            };

                            console.log(`${resourceName}: built ${configName}`);
                            buildingInProgress = false;
                            resolve();
                        });
                    }));
                };
            };

            try {
                await Promise.all(promises);
            } catch (error) {
                console.log(error);
                cb(false, error);
            };

            buildingInProgress = false;

            cb(true);
        })().then();
    },
};

RegisterResourceBuildTaskFactory('z_esbuild', () => esbuildBuildTask);
