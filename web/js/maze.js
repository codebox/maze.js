/*
 config:
    shape:
        pattern: square, triangle, hexagon, circle
        size: (height,width|layers,segments)
    algorithm

 */

function buildCellCollection() {
    "use strict";
    const cells = {},
        links = {};

    return {
        addCell(...coords) {
            const id = coords.join(',');
            console.assert(!cells[id]);
            cells[id] = {id, coords};
        },
        addLink(cellId1, cellId2) {
            console.assert(cellId1 !== cellId2);
            console.assert(cells[cellId1]);
            console.assert(cells[cellId2]);
            const [lowerId,higherId] = [cellId1,cellId2].sort(),
                linkId = `${lowerId}-${higherId}`;
            console.assert(!links[linkId]);
            links[linkId] = [lowerId, higherId];
        }
    };
}

export function buildMaze(config) {
    "use strict";

}