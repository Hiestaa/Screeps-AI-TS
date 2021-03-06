import * as chai from "chai";
import * as sinon from "sinon";
import { Memory } from "./mock";

import sinonChai from "sinon-chai";
import { disableLevel, disableLogger, enableLevel, enableLogger, getLogger, Logger } from "utils/Logger";
const { expect } = chai;

chai.use(sinonChai);

describe("Logger", () => {
    let consoleLogMock: sinon.SinonSpy;
    before(() => {
        consoleLogMock = sinon.spy(console, "log");
    });

    beforeEach(() => {
        // runs before each test in this block
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(Memory);
        consoleLogMock.resetHistory();
    });

    describe("Logger", () => {
        describe("basic usage", () => {
            let logger: Logger;
            before(() => {
                logger = getLogger("test", "#000");
            });

            it("should not log with debug by default", () => {
                logger.debug("test message");
                expect(consoleLogMock.notCalled).to.eq(true);
            });

            it("should log with info level", () => {
                logger.info("test message");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][test] test message</font>',
                );
            });

            it("should log with warning level", () => {
                logger.warning("test message");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 16px; style: italic; color: #000" color="#000" severity="3">[WARNING][test] test message</font>',
                );
            });

            it("should log with error level", () => {
                logger.error("test message");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 18px; font-weight: bold; color: #000" color="#000" severity="4">[ERROR][test] test message</font>',
                );
            });

            it("should log with fatal level", () => {
                logger.fatal("test message");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 20px; font-weight: bold; style: italic; color: #000" color="#000" severity="5">[FATAL][test] test message</font>',
                );
            });

            it("should log failures", () => {
                logger.failure(-1, "oops");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 16px; style: italic; color: #000" color="#000" severity="3">[FAILURE][test] [Failure: ERR_NOT_OWNER] oops</font>',
                );
            });

            it("should log with highlight", () => {
                logger.info("highlighted message", true);
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 14px; color: #000" type="highlight" color="#000" severity="2">[INFO][test] highlighted message</font>',
                );
            });
        });

        describe("hierarchical usage", () => {
            ["a", "a.b", "a.b.c.d", "a.b.x.y"].forEach(k => {
                it(`should be able to get logger ${k}`, () => {
                    const logger = getLogger(k, "#000");
                    logger.info("test message");
                    expect(consoleLogMock.called).to.eq(true);
                    expect(consoleLogMock).to.be.calledOnceWithExactly(
                        `<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][${k}] test message</font>`,
                    );
                });
            });
        });
    });

    describe("enableLogger/disableLogger", () => {
        describe("basic usage", () => {
            let logger: Logger;
            beforeEach(() => {
                logger = getLogger("test", "#000");
            });

            it("should only log when enabled", () => {
                logger.info("test message");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][test] test message</font>',
                );

                disableLogger("test");
                consoleLogMock.resetHistory();
                logger.info("test message 2");
                expect(consoleLogMock.notCalled).to.eq(true);

                enableLogger("test", "#ccc");
                consoleLogMock.resetHistory();
                logger.info("test message 3");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 14px; color: #ccc" color="#ccc" severity="2">[INFO][test] test message 3</font>',
                );
            });
        });

        describe("hierarchical usage", () => {
            let loggerA: Logger;
            let loggerAB: Logger;
            let loggerABCD: Logger;
            let loggerABXY: Logger;
            beforeEach(() => {
                loggerA = getLogger("a", "#000");
                loggerAB = getLogger("a.b", "#000");
                loggerABCD = getLogger("a.b.c.d", "#000");
                loggerABXY = getLogger("a.b.x.y", "#000");
            });

            it("disabling/enabling a should affect all descendant of a", () => {
                disableLogger("a");
                consoleLogMock.resetHistory();

                loggerA.info("test message a");
                loggerAB.info("test message a.b");
                loggerABCD.info("test message a.b.c.d");
                loggerABXY.info("test message a.b.x.y");
                expect(consoleLogMock.notCalled).to.eq(true);

                enableLogger("a", "#000");
                consoleLogMock.resetHistory();
                loggerA.info("test message a");
                loggerAB.info("test message a.b");
                loggerABCD.info("test message a.b.c.d");
                loggerABXY.info("test message a.b.x.y");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a] test message a</font>',
                );
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b] test message a.b</font>',
                );
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b.c.d] test message a.b.c.d</font>',
                );
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b.x.y] test message a.b.x.y</font>',
                );
            });

            it("disabling/enabling a.b should only affect descendants of a.b", () => {
                disableLogger("a.b");
                consoleLogMock.resetHistory();

                loggerA.info("test message a");
                loggerAB.info("test message a.b");
                loggerABCD.info("test message a.b.c.d");
                loggerABXY.info("test message a.b.x.y");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledOnceWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a] test message a</font>',
                );

                enableLogger("a.b", "#000");
                consoleLogMock.resetHistory();
                loggerA.info("test message a");
                loggerAB.info("test message a.b");
                loggerABCD.info("test message a.b.c.d");
                loggerABXY.info("test message a.b.x.y");
                expect(consoleLogMock.called).to.eq(true);
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a] test message a</font>',
                );
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b] test message a.b</font>',
                );
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b.c.d] test message a.b.c.d</font>',
                );
                expect(consoleLogMock).to.be.calledWithExactly(
                    '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b.x.y] test message a.b.x.y</font>',
                );
            });
        });
    });

    describe("enableLevel/disableLevel", () => {
        let loggerA: Logger;
        let loggerAB: Logger;
        let loggerABCD: Logger;
        let loggerABXY: Logger;
        beforeEach(() => {
            loggerA = getLogger("a", "#000");
            loggerAB = getLogger("a.b", "#000");
            loggerABCD = getLogger("a.b.c.d", "#000");
            loggerABXY = getLogger("a.b.x.y", "#000");
        });

        it("should affect all loggers across the hierarchy", () => {
            disableLevel("info");
            consoleLogMock.resetHistory();
            loggerA.info("test message a");
            loggerAB.info("test message a.b");
            loggerABCD.info("test message a.b.c.d");
            loggerABXY.info("test message a.b.x.y");

            expect(consoleLogMock.notCalled).to.eq(true);

            enableLevel("info");
            consoleLogMock.resetHistory();
            loggerA.info("test message a");
            loggerAB.info("test message a.b");
            loggerABCD.info("test message a.b.c.d");
            loggerABXY.info("test message a.b.x.y");

            expect(consoleLogMock.called).to.eq(true);
            expect(consoleLogMock).to.be.calledWithExactly(
                '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a] test message a</font>',
            );
            expect(consoleLogMock).to.be.calledWithExactly(
                '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b] test message a.b</font>',
            );
            expect(consoleLogMock).to.be.calledWithExactly(
                '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b.c.d] test message a.b.c.d</font>',
            );
            expect(consoleLogMock).to.be.calledWithExactly(
                '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b.x.y] test message a.b.x.y</font>',
            );
        });

        it("should not affect any other level", () => {
            enableLevel("debug");
            disableLevel("info");
            consoleLogMock.resetHistory();

            loggerABXY.info("test message a.b.x.y");
            loggerABCD.warning("test message a.b.c.d");
            loggerAB.error("test message a.b");
            loggerA.debug("test message a");

            expect(consoleLogMock.called).to.eq(true);
            expect(consoleLogMock.callCount).to.eq(3);
            // expect(consoleLogMock).to.be.calledWithExactly(
            //     '<font style="font-size: 14px; color: #000" color="#000" severity="2">[INFO][a.b.x.y] test message a.b.x.y</font>',
            // );
            expect(consoleLogMock).to.be.calledWithExactly(
                '<font style="font-size: 16px; style: italic; color: #000" color="#000" severity="3">[WARNING][a.b.c.d] test message a.b.c.d</font>',
            );
            expect(consoleLogMock).to.be.calledWithExactly(
                '<font style="font-size: 18px; font-weight: bold; color: #000" color="#000" severity="4">[ERROR][a.b] test message a.b</font>',
            );
            expect(consoleLogMock).to.be.calledWithExactly(
                '<font style="font-size: 11px; color: #000" color="#000" severity="1">[DEBUG][a] test message a</font>',
            );
        });
    });
});
