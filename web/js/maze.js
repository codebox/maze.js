import {algorithms} from './algorithms.js';

function buildBaseGrid(config) {
    "use strict";
    const cells = {}, {random} = config;

    function makeIdFromCoords(coords) {
        return coords.join(',');
    }
    function buildCell(...coords) {
        const id = makeIdFromCoords(coords);
        return { //TODO move methods outside so we only have 1 copy of each function
            id,
            coords,
            metadata: {},
            neighbours: {
                random(fnCriteria = () => true) {
                    return random.choice(Object.values(this).filter(value => typeof value !== 'function').filter(fnCriteria));
                }
            },
            isLinkedTo(otherCell) {
                return this.links.includes(otherCell);
            },
            links: []
        };
    }

    return {
        forEachCell(fn) {
            Object.values(cells).forEach(fn);
        },
        link(cell1, cell2) {
            console.assert(cell1 !== cell2);
            console.assert(Object.values(cell1.neighbours).includes(cell2));
            console.assert(!cell1.links.includes(cell2));
            console.assert(Object.values(cell2.neighbours).includes(cell1));
            console.assert(!cell2.links.includes(cell1));

            cell1.links.push(cell2);
            cell2.links.push(cell1);
        },
        metadata: config,
        randomCell(fnCriteria = () => true) {
            return random.choice(Object.values(cells).filter(fnCriteria));
        },
        addCell(...coords) {
            const cell = buildCell(...coords),
                id = cell.id;
            console.assert(!cells[id]);
            cells[id] = cell;
            return id;
        },
        makeNeighbours(cell1WithDirection, cell2WithDirection) {
            const
                cell1 = cell1WithDirection.cell,
                cell1Direction = cell1WithDirection.direction,
                cell2 = cell2WithDirection.cell,
                cell2Direction = cell2WithDirection.direction;

            console.assert(cell1 !== cell2);
            console.assert(cell1Direction !== cell2Direction);
            console.assert(!cell1.neighbours[cell2Direction]);
            console.assert(!cell2.neighbours[cell1Direction]);
            cell1.neighbours[cell2Direction] = cell2;
            cell2.neighbours[cell1Direction] = cell1;
        },
        getCellByCoordinates(...coords) {
            const id = makeIdFromCoords(coords);
            return cells[id];
        },
        get cellCount() {
            return Object.values(cells).length;
        }
    };
}

function buildSquareMaze(config) {
    "use strict";
    const grid = buildBaseGrid(config);

    grid.isSquare = true;
    grid.initialise = function() {
        for (let x=0; x < config.width; x++) {
            for (let y=0; y < config.height; y++) {
                grid.addCell(x, y);
            }
        }
        for (let x=0; x < config.width; x++) {
            for (let y=0; y < config.height; y++) {
                const cell = grid.getCellByCoordinates(x, y),
                    eastNeighbour = grid.getCellByCoordinates(x+1, y),
                    southNeighbour = grid.getCellByCoordinates(x, y+1);
                if (eastNeighbour) {
                    grid.makeNeighbours({cell, direction: DIRECTION_WEST}, {cell: eastNeighbour, direction: DIRECTION_EAST});
                }
                if (southNeighbour) {
                    grid.makeNeighbours({cell, direction: DIRECTION_NORTH}, {cell: southNeighbour, direction: DIRECTION_SOUTH});
                }
            }
        }
    };

    grid.render = function(drawingSurface) {
        grid.forEachCell(cell => {
            "use strict";
            const [x,y] = cell.coords,
                northNeighbour = cell.neighbours[DIRECTION_NORTH],
                southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                eastNeighbour = cell.neighbours[DIRECTION_EAST],
                westNeighbour = cell.neighbours[DIRECTION_WEST];

            if (!northNeighbour || !cell.isLinkedTo(northNeighbour)) {
                drawingSurface.line(x,y,x+1,y);
            }
            if (!southNeighbour || !cell.isLinkedTo(southNeighbour)) {
                drawingSurface.line(x,y+1,x+1,y+1);
            }
            if (!eastNeighbour || !cell.isLinkedTo(eastNeighbour)) {
                drawingSurface.line(x+1,y,x+1,y+1);
            }
            if (!westNeighbour || !cell.isLinkedTo(westNeighbour)) {
                drawingSurface.line(x,y,x,y+1);
            }
        });
    }
    return grid;
}

export function buildMaze(config) {
    "use strict";
    const
        algorithm = algorithms[config.algorithm],
        grid = buildSquareMaze(config);
    grid.initialise();
    algorithm.fn(grid, config);

    return grid;
}