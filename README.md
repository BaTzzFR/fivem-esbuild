# FiveM - esbuild

Builds resources with esbuild. It does not replace resources using Webpack (example: [chat](https://github.com/citizenfx/cfx-server-data/tree/master/resources/%5Bgameplay%5D/chat)). needs [yarn](https://github.com/citizenfx/cfx-server-data/tree/master/resources/%5Bsystem%5D/%5Bbuilders%5D/yarn) to install the necessary dependencies. Esbuild can work in perfect harmony with webpack. To learn more: https://esbuild.github.io/

## How to use

* Create an `server.config.js`, `client.config.js` or the name you prefer and change the values.

```js
module.exports = {
    entryPoints: ['main.ts'],
    bundle: true,
    outfile: 'dist/client.js',
};
```

* And on your `fxmanifest.lua` file, add this line of code.

```lua
esbuild_config 'server.config.js'
```
