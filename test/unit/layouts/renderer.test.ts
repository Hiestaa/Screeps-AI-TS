import * as chai from "chai";
import { IBuildUnit, render } from "utils/layouts/renderer";

const { expect } = chai;

const TESTS: Array<{
    layout: string;
    anchor: string;
    anchorPosition: { x: number; y: number };
    rendered: IBuildUnit[];
}> = [
    {
        layout: "S",
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [{ structureType: "spawn", x: 0, y: 0 }],
    },
    {
        layout: "C|S|C",
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { x: 0, y: 0, structureType: "spawn" },
            { x: -1, y: 0, structureType: "container" },
            { x: 1, y: 0, structureType: "container" },
        ],
    },
    {
        layout: "C|X|C",
        anchor: "X",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { x: -1, y: 0, structureType: "container" },
            { x: 1, y: 0, structureType: "container" },
        ],
    },
    {
        layout: "C:1|S:3|C:2",
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { structureType: "container", x: -1, y: 0 },
            { structureType: "container", x: 1, y: 0 },
            { structureType: "spawn", x: 0, y: 0 },
        ],
    },
    {
        layout: `
     C
     S
     C`,
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { x: 0, y: 0, structureType: "spawn" },
            { x: 0, y: -1, structureType: "container" },
            { x: 0, y: 1, structureType: "container" },
        ],
    },
    {
        layout: `
     SCC
     CCC`,
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { x: 0, y: 0, structureType: "spawn" },
            { x: 1, y: 0, structureType: "container" },
            { x: 0, y: 1, structureType: "container" },
            { x: 2, y: 0, structureType: "container" },
            { x: 1, y: 1, structureType: "container" },
            { x: 2, y: 1, structureType: "container" },
        ],
    },
    {
        layout: `
          C
         S
        C`,
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { x: 0, y: 0, structureType: "spawn" },
            { x: 1, y: -1, structureType: "container" },
            { x: -1, y: 1, structureType: "container" },
        ],
    },
    {
        layout: `
        C|E|C
        E:1|S:1|E:1
        C|E|C
        `,
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { x: 0, y: 0, structureType: "spawn" },
            { x: -1, y: 0, structureType: "extension" },
            { x: 1, y: 0, structureType: "extension" },
            { x: 0, y: -1, structureType: "extension" },
            { x: 0, y: 1, structureType: "extension" },
            { x: -1, y: -1, structureType: "container" },
            { x: 1, y: -1, structureType: "container" },
            { x: -1, y: 1, structureType: "container" },
            { x: 1, y: 1, structureType: "container" },
        ],
    },
    {
        layout: `
        C|E|C
        E:1|S:1|E:1
        C|E|C
        `,
        anchor: "S",
        anchorPosition: { x: 10, y: 15 },
        rendered: [
            { x: 10, y: 15, structureType: "spawn" },
            { x: 9, y: 15, structureType: "extension" },
            { x: 11, y: 15, structureType: "extension" },
            { x: 10, y: 14, structureType: "extension" },
            { x: 10, y: 16, structureType: "extension" },
            { x: 9, y: 14, structureType: "container" },
            { x: 11, y: 14, structureType: "container" },
            { x: 9, y: 16, structureType: "container" },
            { x: 11, y: 16, structureType: "container" },
        ],
    },
    {
        layout: `
   CC     C|E|C|C
           |S:1|
    T   T C|E|C
        `,
        anchor: "S",
        anchorPosition: { x: 0, y: 0 },
        rendered: [
            { x: 0, y: 0, structureType: "spawn" },
            { x: 0, y: -1, structureType: "extension" },
            { x: 0, y: 1, structureType: "extension" },
            { x: 1, y: 1, structureType: "container" },
            { x: 1, y: -1, structureType: "container" },
            { x: -1, y: -1, structureType: "container" },
            { x: -1, y: 1, structureType: "container" },
            { x: 2, y: -1, structureType: "container" },
            { x: -3, y: 1, structureType: "tower" },
            { x: -7, y: 1, structureType: "tower" },
            { x: -7, y: -1, structureType: "container" },
            { x: -8, y: -1, structureType: "container" },
        ],
    },
    {
        layout: `
        C  |  E|C
        E:1|S:1|E:1
        | C|E  |C
        `,
        anchor: "S",
        anchorPosition: { x: 10, y: 15 },
        rendered: [
            { x: 10, y: 15, structureType: "spawn" },
            { x: 9, y: 15, structureType: "extension" },
            { x: 11, y: 15, structureType: "extension" },
            { x: 10, y: 14, structureType: "extension" },
            { x: 10, y: 16, structureType: "extension" },
            { x: 9, y: 14, structureType: "container" },
            { x: 11, y: 14, structureType: "container" },
            { x: 9, y: 16, structureType: "container" },
            { x: 11, y: 16, structureType: "container" },
        ],
    },
    {
        layout: `
        R:3
          C  |  E|C
          E:1|S:1|E:1
          | C|E  |C
        R:3
          `,
        anchor: "S",
        anchorPosition: { x: 10, y: 15 },
        rendered: [
            { x: 10, y: 15, structureType: "spawn" },
            { x: 11, y: 15, structureType: "extension" },
            { x: 9, y: 15, structureType: "extension" },
            { x: 7, y: 13, structureType: "rampart" },
            { x: 7, y: 17, structureType: "rampart" },
            { x: 10, y: 14, structureType: "extension" },
            { x: 10, y: 16, structureType: "extension" },
            { x: 11, y: 14, structureType: "container" },
            { x: 9, y: 14, structureType: "container" },
            { x: 9, y: 16, structureType: "container" },
            { x: 11, y: 16, structureType: "container" },
        ],
    },
    {
        layout: `
    RRRRRRRRRRR
    RE.E E E ER
    RE E E E ER
    RETETXTETER
    RE E E E ER
    RE E E E ER
    RRRRRRRRRRR`,
        anchor: "X",
        anchorPosition: { x: 5, y: 10 },
        rendered: [
            { x: 6, y: 10, structureType: "tower" },
            { x: 5, y: 9, structureType: "extension" },
            { x: 4, y: 10, structureType: "tower" },
            { x: 5, y: 11, structureType: "extension" },
            { x: 3, y: 10, structureType: "extension" },
            { x: 5, y: 8, structureType: "extension" },
            { x: 7, y: 10, structureType: "extension" },
            { x: 5, y: 12, structureType: "extension" },
            { x: 7, y: 9, structureType: "extension" },
            { x: 2, y: 10, structureType: "tower" },
            { x: 8, y: 10, structureType: "tower" },
            { x: 3, y: 11, structureType: "extension" },
            { x: 3, y: 9, structureType: "extension" },
            { x: 7, y: 11, structureType: "extension" },
            { x: 5, y: 13, structureType: "rampart" },
            { x: 5, y: 7, structureType: "rampart" },
            { x: 9, y: 10, structureType: "extension" },
            { x: 6, y: 7, structureType: "rampart" },
            { x: 3, y: 8, structureType: "extension" },
            { x: 6, y: 13, structureType: "rampart" },
            { x: 3, y: 12, structureType: "extension" },
            { x: 1, y: 10, structureType: "extension" },
            { x: 7, y: 12, structureType: "extension" },
            { x: 4, y: 13, structureType: "rampart" },
            { x: 7, y: 8, structureType: "extension" },
            { x: 4, y: 7, structureType: "rampart" },
            { x: 7, y: 7, structureType: "rampart" },
            { x: 9, y: 11, structureType: "extension" },
            { x: 7, y: 13, structureType: "rampart" },
            { x: 1, y: 9, structureType: "extension" },
            { x: 10, y: 10, structureType: "rampart" },
            { x: 3, y: 13, structureType: "rampart" },
            { x: 1, y: 11, structureType: "extension" },
            { x: 9, y: 9, structureType: "extension" },
            { x: 0, y: 10, structureType: "rampart" },
            { x: 3, y: 7, structureType: "rampart" },
            { x: 1, y: 12, structureType: "extension" },
            { x: 9, y: 8, structureType: "extension" },
            { x: 0, y: 11, structureType: "rampart" },
            { x: 0, y: 9, structureType: "rampart" },
            { x: 9, y: 12, structureType: "extension" },
            { x: 2, y: 13, structureType: "rampart" },
            { x: 10, y: 9, structureType: "rampart" },
            { x: 8, y: 13, structureType: "rampart" },
            { x: 8, y: 7, structureType: "rampart" },
            { x: 1, y: 8, structureType: "extension" },
            { x: 10, y: 11, structureType: "rampart" },
            { x: 2, y: 7, structureType: "rampart" },
            { x: 0, y: 8, structureType: "rampart" },
            { x: 9, y: 13, structureType: "rampart" },
            { x: 9, y: 7, structureType: "rampart" },
            { x: 10, y: 8, structureType: "rampart" },
            { x: 0, y: 12, structureType: "rampart" },
            { x: 10, y: 12, structureType: "rampart" },
            { x: 1, y: 13, structureType: "rampart" },
            { x: 1, y: 7, structureType: "rampart" },
            { x: 0, y: 7, structureType: "rampart" },
            { x: 10, y: 7, structureType: "rampart" },
            { x: 0, y: 13, structureType: "rampart" },
            { x: 10, y: 13, structureType: "rampart" },
        ],
    },
    {
        layout: `
RRRRRRRRRRR
RE.E E E ER
RE E E E ER
RETETXTETER
RE E E E ER
RE E E E ER
RRRRRRRRRRR`,
        anchor: "X",
        anchorPosition: { x: 5, y: 10 },
        rendered: [
            { x: 6, y: 10, structureType: "tower" },
            { x: 5, y: 9, structureType: "extension" },
            { x: 4, y: 10, structureType: "tower" },
            { x: 5, y: 11, structureType: "extension" },
            { x: 3, y: 10, structureType: "extension" },
            { x: 5, y: 8, structureType: "extension" },
            { x: 7, y: 10, structureType: "extension" },
            { x: 5, y: 12, structureType: "extension" },
            { x: 7, y: 9, structureType: "extension" },
            { x: 2, y: 10, structureType: "tower" },
            { x: 8, y: 10, structureType: "tower" },
            { x: 3, y: 11, structureType: "extension" },
            { x: 3, y: 9, structureType: "extension" },
            { x: 7, y: 11, structureType: "extension" },
            { x: 5, y: 13, structureType: "rampart" },
            { x: 5, y: 7, structureType: "rampart" },
            { x: 9, y: 10, structureType: "extension" },
            { x: 6, y: 7, structureType: "rampart" },
            { x: 3, y: 8, structureType: "extension" },
            { x: 6, y: 13, structureType: "rampart" },
            { x: 3, y: 12, structureType: "extension" },
            { x: 1, y: 10, structureType: "extension" },
            { x: 7, y: 12, structureType: "extension" },
            { x: 4, y: 13, structureType: "rampart" },
            { x: 7, y: 8, structureType: "extension" },
            { x: 4, y: 7, structureType: "rampart" },
            { x: 7, y: 7, structureType: "rampart" },
            { x: 9, y: 11, structureType: "extension" },
            { x: 7, y: 13, structureType: "rampart" },
            { x: 1, y: 9, structureType: "extension" },
            { x: 10, y: 10, structureType: "rampart" },
            { x: 3, y: 13, structureType: "rampart" },
            { x: 1, y: 11, structureType: "extension" },
            { x: 9, y: 9, structureType: "extension" },
            { x: 0, y: 10, structureType: "rampart" },
            { x: 3, y: 7, structureType: "rampart" },
            { x: 1, y: 12, structureType: "extension" },
            { x: 9, y: 8, structureType: "extension" },
            { x: 0, y: 11, structureType: "rampart" },
            { x: 0, y: 9, structureType: "rampart" },
            { x: 9, y: 12, structureType: "extension" },
            { x: 2, y: 13, structureType: "rampart" },
            { x: 10, y: 9, structureType: "rampart" },
            { x: 8, y: 13, structureType: "rampart" },
            { x: 8, y: 7, structureType: "rampart" },
            { x: 1, y: 8, structureType: "extension" },
            { x: 10, y: 11, structureType: "rampart" },
            { x: 2, y: 7, structureType: "rampart" },
            { x: 0, y: 8, structureType: "rampart" },
            { x: 9, y: 13, structureType: "rampart" },
            { x: 9, y: 7, structureType: "rampart" },
            { x: 10, y: 8, structureType: "rampart" },
            { x: 0, y: 12, structureType: "rampart" },
            { x: 10, y: 12, structureType: "rampart" },
            { x: 1, y: 13, structureType: "rampart" },
            { x: 1, y: 7, structureType: "rampart" },
            { x: 0, y: 7, structureType: "rampart" },
            { x: 10, y: 7, structureType: "rampart" },
            { x: 0, y: 13, structureType: "rampart" },
            { x: 10, y: 13, structureType: "rampart" },
        ],
    },
];

describe("id", () => {
    TESTS.forEach(({ layout, anchor, anchorPosition, rendered }) => {
        it(`should render layout: ${layout}`, () => {
            const _rendered = render(layout, anchor, anchorPosition);
            console.log(JSON.stringify(_rendered));
            expect(_rendered).to.deep.equal(rendered);
        });
    });
});
