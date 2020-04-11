import { disableLevel, disableLogger, enableLevel, enableLogger, listLoggers } from "./Logger";

global.cli = global.cli || {};

global.cli.log = global.cli.log || {};
global.cli.log.enableLogger = (scope, color) => {
    enableLogger(scope, color);
};

global.cli.log.disableLogger = scope => {
    disableLogger(scope);
};

global.cli.log.enableLevel = level => {
    enableLevel(level);
};

global.cli.log.disableLevel = level => {
    disableLevel(level);
};

global.cli.log.list = () => {
    listLoggers();
};
