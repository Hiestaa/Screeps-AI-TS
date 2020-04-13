//inject mocha globally to allow custom interface refer without direct import - bypass bundle issue
global._ = require("lodash");
global.mocha = require("mocha");
global.chai = require("chai");
global.sinon = require("sinon");
global.chai.use(require("sinon-chai"));

global.Memory = {};
global.RoomPosition =
    global.RoomPosition ||
    function() {
        return;
    };
global.Creep =
    global.Creep ||
    function() {
        return;
    };
global.Structure =
    global.Structure ||
    function() {
        return;
    };
global.StructureSpawn =
    global.StructureSpawn ||
    function() {
        return;
    };
global.Flag =
    global.Flag ||
    function() {
        return;
    };
