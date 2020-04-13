import * as chai from "chai";
import { guid, gun } from "utils/id";
import { Memory } from "./mock";

const { expect } = chai;

describe("id", () => {
    beforeEach(() => {
        // runs before each test in this block
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(Memory);
    });

    it("guid() should generate globally unique identifiers", () => {
        const seen: any = {};
        for (let i = 0; i < 10000; i++) {
            const id = guid();
            expect(seen[id]).to.eq(undefined);
            seen[id] = true;
            expect(seen[id]).to.eq(true);
        }
    });

    it("gun() should generate globally unique names", () => {
        const seen: any = {};
        for (let i = 0; i < 10000; i++) {
            const name = gun("H");
            expect(seen[name]).to.eq(undefined);
            seen[name] = true;
            expect(seen[name]).to.eq(true);
        }
    });
});
