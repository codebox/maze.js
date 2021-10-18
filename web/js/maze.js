import {algorithms} from './algorithms.js';
/*
 config:
    shape:
        pattern: square, triangle, hexagon, circle
        size: (height,width|layers,segments)
    algorithm,
    random

 */

function buildCellCollection() {
    "use strict";
    const cells = {},
        links = {};

    return {
        addCell(...coords) {
            const id = coords.join(',');
            console.assert(!cells[id]);
            cells[id] = {id, coords, metadata: {}};
        },
        addLink(cellId1, cellId2) {
            console.assert(cellId1 !== cellId2);
            console.assert(cells[cellId1]);
            console.assert(cells[cellId2]);
            const [lowerId,higherId] = [cellId1,cellId2].sort(),
                linkId = `${lowerId}-${higherId}`;
            console.assert(!links[linkId]);
            links[linkId] = [lowerId, higherId];
        },
        getCells() {
            return Object.values(cells);
        }
    };
}

const cellInitialisers = {
    square(cells, config) {
        "use strict";
        for (let y=0; y<config.height; y++) {
            for (let x=0; x<config.width; x++) {
                cells.addCell(x, y);
            }
        }
    }
};

const neighbourBuilders = {
    square(grid, cell) {
        "use strict";
        return {
            getByDirection(direction) {
                const [x,y] = cell.coords;
                switch (direction) {
                    case DIRECTION_NORTH:
                        return grid.getCellByCoordinates(x, y-1);
                    case DIRECTION_SOUTH:
                        return grid.getCellByCoordinates(x, y+1);
                    case DIRECTION_EAST:
                        return grid.getCellByCoordinates(x+1, y);
                    case DIRECTION_WEST:
                        return grid.getCellByCoordinates(x-1, y);
                    default:
                        console.assert(direction);
                }
            }
        }
    }
};


function buildGrid(config) {
    "use strict";
    const metadata = {},
        cells = buildCellCollection(),
        initialiseCells = cellInitialisers[config.style],
        neighbourBuilder = neighbourBuilders[config.style];

    initialiseCells(cells, config);

    return {
        forEachCell(fn) {
            cells.getCells().forEach(cell => {
                fn(cell);
            });
        },
        getCells(){
            return cells.getCells();
        },
        getCellByCoordinates(...targetCoords){
            const match = this.getCells().filter(cell => cell.coords.every((cellCoord, i) => cellCoord === targetCoords[i])); // TODO speed this up
            if (match.length === 1) {
                return match[0];
            }
            console.assert(match.length === 0, match.length, targetCoords);
        },
        getNeighbours(cell){
            return neighbourBuilder(this, cell);
        },
        link(){},
        metadata: {
            shape: {
                pattern: config.style
            },
            height: config.height,
            width: config.width
        }
    }
}


export function buildMaze(config) {
    "use strict";
    const algorithm = algorithms[config.algorithm],
        grid = buildGrid(config);

    algorithm.fn(grid, {random: config.random});

    return grid;
}