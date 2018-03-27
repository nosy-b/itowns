export default {
    preprocessDataLayer(layer) {
        // eslint-disable-next-line no-console
        console.log('FileProvider.preprocessDataLayer', layer);
        return layer;
    },

    executeCommand(command) {
        // eslint-disable-next-line no-console
        console.log('FileProvider.executeCommand', command);
    },
};
