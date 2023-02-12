const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const cache = require('./esbuild_cache');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

let buildingInProgress = false;

const esbuildBuildTask = {
    shouldBuild(resourceName) {
        const numMetaData = GetNumResourceMetadata(resourceName, 'esbuild_config');

        for (let i = 0; i < numMetaData; i++) {
            const config = GetResourceMetadata(resourceName, 'esbuild_config');
            if(shouldBuild(config)) {
                return true;
            };
        };

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

        return false;
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
                
                if(config) {
                    while (buildingInProgress) {
                        console.log(`esbuild is busy: we are waiting to compile ${resourceName} (${configName})`);
                        await sleep(3000);
                    };

                    buildingInProgress = true;
                    console.log(`${resourceName}: started building ${configName}`);

                    promises.push(new Promise((resolve, reject) => {
                        console.log(`${resourceName}: built ${configName}`);
                        esbuild.build({
                            ...config,
                            absWorkingDir: resourcePath,
                            plugins: [cache({directory: cachePath})],
                        })
                        .then(() => {
                            buildingInProgress = false;
                            resolve();
                        })
                        .catch(reject)
                    }));
                };
            };

            try {
                await Promise.all(promises);
            } catch (e) {
                console.log(e);
                cb(false, e);
            };

            buildingInProgress = false;

            cb(true);
        })().then();
    },
};

RegisterResourceBuildTaskFactory('z_esbuild', () => esbuildBuildTask);
