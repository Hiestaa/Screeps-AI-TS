import { COLORS, getLogger } from "utils/Logger";

const logger = getLogger("utils.layouts.renderer", COLORS.utils);

const MAX_PRIORITY = 1000;

interface IUnitInternal {
    structureType: BuildableStructureConstant | undefined;
    symbol: string;
    priority: number;
    x: number;
    y: number;
    distFromAnchor: { x: number; y: number };
}

export interface IBuildUnit {
    structureType: BuildableStructureConstant;
    x: number;
    y: number;
}

/**
 * Convert the given layout into an ordered list of structures
 * Layout will have the following form (organized on a 2D grid separated by newlines)
 *
 *        | |   |C:1|
 *         R|E:1|S:0|E:1|R|
 *        | |   |C:1|
 *
 * Where | separates units, and within each unit:
 *  * vX determines the version
 *  * R represent a rampart
 *  * E represent an extension
 *  * C represents a container
 *  * S represents a spawn
 *  * X:N syntax allows to define a build order (leave empty for build last)
 *  * EACH EXTERNAL SPACE COUNT as one empty case, unless enclosed within a unit in which case the whole unit counts as one
 *
 * Some more details about the | and : syntax:
 * * The priority can only be specified between within a | unit
 * * The trailing | is optional
 *
 * @param layout
 * @param anchor
 */
export function render(layout: string, anchor: string, anchorPosition: { x: number; y: number }): IBuildUnit[] {
    // console.log(`layout:>>${layout}<<`);
    const structureTypeMapper = (unitChar: string): BuildableStructureConstant | undefined => {
        const mapping: { [key: string]: BuildableStructureConstant } = {
            C: "container",
            E: "extension",
            R: "rampart",
            S: "spawn",
            T: "tower",
        };
        return mapping[unitChar];
    };
    const tokenToUnit = (token: string, lineIndex: number, colIndex: number): IUnitInternal => {
        // console.log(` after split: token:'${token}', line:${lineIndex}, col:${colIndex}`);
        const parts = token.split(":");
        let priority = MAX_PRIORITY;
        if (parts.length === 0) {
            throw new Error("Invalid token: " + token);
        } else if (parts.length === 2) {
            priority = parseInt(parts[1], 10) || MAX_PRIORITY;
        }
        return {
            structureType: structureTypeMapper(parts[0]),
            priority,
            x: colIndex,
            y: lineIndex,
            symbol: parts[0],
            distFromAnchor: { x: 0, y: 0 },
        };
    };

    const splitTokenIfNecessary = (token: string): string[] => {
        const _token = token.trim();
        if (_token.includes(":")) {
            const split = _token.split(":");
            if (split[0].length === 1) {
                return [_token];
            }
            return split[0]
                .slice(0, -1)
                .split("")
                .concat([`${split[0].slice(-1)}:${split[1]}`]);
        }
        return _token.split("");
    };

    const tokenizeLine = (line: string, lineIndex: number) => {
        // console.log(`line:'${line}'`);
        const tokens = line.split("|");
        return ([] as string[]).concat
            .apply(
                [],
                tokens.map((token, colIndex) => {
                    // console.log(`before split: token:'${token}', col:${colIndex}`);
                    if (token.length === 0) {
                        return [];
                    }
                    if (colIndex === 0 || colIndex === tokens.length - 1) {
                        const spaces = /^(\s*).*$/.exec(token);
                        // console.log("spaces", spaces);
                        if (spaces && spaces[1]) {
                            // console.log("spaces", spaces[1].split(""));
                            return spaces[1].split("").concat(splitTokenIfNecessary(token));
                        }
                        return splitTokenIfNecessary(token);
                    }
                    return [token.trim()];
                }),
            )
            .map((token, colIndex) => tokenToUnit(token, lineIndex, colIndex));
    };

    const applyAnchorOffset = (units: IUnitInternal[]): IUnitInternal[] => {
        // console.log(`Units before filter: ${JSON.stringify(units)}`);
        const anchorUnit = units.find(u => u.symbol === anchor);
        // console.log("anchorUnit", anchorUnit);
        if (!anchorUnit) {
            throw new Error("Anchor could not be found in layout");
        }
        const { x: anchorX, y: anchorY } = anchorUnit;

        return units
            .map(unit => {
                unit.distFromAnchor = { x: unit.x - anchorX, y: unit.y - anchorY };
                unit.x = anchorPosition.x + unit.distFromAnchor.x;
                unit.y = anchorPosition.y + unit.distFromAnchor.y;
                return unit;
            })
            .filter(unit => !!unit.structureType);
    };

    const sortAndConvert = (units: IUnitInternal[]): IBuildUnit[] => {
        const newUnits = units.map(u =>
            Object.assign({ computed: Math.abs(u.distFromAnchor.x) + Math.abs(u.distFromAnchor.y) }, u),
        );
        return newUnits
            .sort((u1, u2) => (u1.priority - u2.priority === 0 ? u1.computed - u2.computed : u1.priority - u2.priority))
            .map(unit => ({
                x: unit.x,
                y: unit.y,
                structureType: unit.structureType!, // cannot be undefined because of the filter above
            }));
    };

    const lines = layout.split("\n");
    return sortAndConvert(applyAnchorOffset(([] as IUnitInternal[]).concat.apply([], lines.map(tokenizeLine))));
}
