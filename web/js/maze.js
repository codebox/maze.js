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
    const cellsById = {};

    // function getLinkId(id1, id2) {
    //     const [lowerId,higherId] = [id1,id2].sort();
    //     return {id: `${lowerId}-${higherId}`, lowerId, higherId};
    // }
    // function pairCells(cellId1, cellId2, map) {
    //     console.assert(cellId1 !== cellId2);
    //     console.assert(cells[cellId1]);
    //     console.assert(cells[cellId2]);
    //     const {id,lowerId,higherId} = getLinkId(cellId1, cellId2);
    //     console.assert(!map[id]);
    //     map[id] = [lowerId, higherId];
    // }

    function makeIdFromCoords(coords) {
        return coords.join(',');
    }
    return {
        addCell(...coords) {
            const id = makeIdFromCoords(coords);
            console.assert(!cellsById[id]);
            cellsById[id] = {id, coords, metadata: {}, links: [], neighbours: []};
            return id;
        },
        addLink(id1, id2) {
            console.assert(id1 !== id2);
            console.assert(cellsById[id1]);
            console.assert(cellsById[id2]);
            console.assert(!cellsById[id1].links.includes(id2));
            console.assert(!cellsById[id2].links.includes(id1));
            cellsById[id1].links.push(id2);
            cellsById[id2].links.push(id1);
        },
        addNeighbours(id1, id2) {
            console.assert(id1 !== id2);
            console.assert(cellsById[id1]);
            console.assert(cellsById[id2]);
            console.assert(!cellsById[id1].neighbours.includes(id2));
            console.assert(!cellsById[id2].neighbours.includes(id1));
            cellsById[id1].neighbours.push(id2);
            cellsById[id2].neighbours.push(id1);
        },
        getCells() {
            return Object.values(cellsById);
        },
        getCellByCoords(...coords) {
            const id = makeIdFromCoords(coords);
            return cellsById[id];
        },
        hasLink(id1, id2) {
            console.assert(cellsById[id1].links.includes(id2) === cellsById[id2].links.includes(id1));
            return cellsById[id1].links.includes(id2);
        },
        hasNeighbour(id1, id2) {
            console.assert(cellsById[id1].neighbours.includes(id2) === cellsById[id2].neighbours.includes(id1));
            return cellsById[id1].neighbours.includes(id2);
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

const renderers = {
    square(grid, drawingSurface, config) {
        grid.forEachCell(cell => {
            "use strict";
            const [x,y] = cell.coords,
                neighbours = grid.getNeighbours(cell),
                northNeighbour = neighbours.getByDirection(DIRECTION_NORTH),
                southNeighbour = neighbours.getByDirection(DIRECTION_SOUTH),
                eastNeighbour = neighbours.getByDirection(DIRECTION_EAST),
                westNeighbour = neighbours.getByDirection(DIRECTION_WEST);

            if (!northNeighbour || !grid.hasLink(cell, northNeighbour)) {
                drawingSurface.line(x,y,x+1,y);
            }
            if (!southNeighbour || ! grid.hasLink(cell, southNeighbour)) {
                drawingSurface.line(x,y+1,x+1,y+1);
            }
            if (!eastNeighbour || ! grid.hasLink(cell, eastNeighbour)) {
                drawingSurface.line(x+1,y,x+1,y+1);
            }
            if (!westNeighbour || ! grid.hasLink(cell, westNeighbour)) {
                drawingSurface.line(x,y,x,y+1);
            }
        });
    }
}
function buildGrid(config) {
    "use strict";
    const metadata = {},
        cells = buildCellCollection(),
        initialiseCells = cellInitialisers[config.style],
        neighbourBuilder = neighbourBuilders[config.style],
        renderer = renderers[config.style];

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
            return cells.getCellByCoords(...targetCoords);
        },
        getNeighbours(cell){
            return neighbourBuilder(this, cell);
        },
        link(cell1, cell2) {
            cells.addLink(cell1.id, cell2.id);
        },
        hasLink(cell1, cell2) {
            return cells.hasLink(cell1.id, cell2.id);
        },
        metadata: {
            shape: {
                pattern: config.style
            },
            height: config.height,
            width: config.width
        },
        render(drawingSurface) {
            renderer(this, drawingSurface, config);
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