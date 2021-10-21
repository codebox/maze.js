import {algorithms} from './algorithms.js';
import {buildEventTarget} from './utils.js';

const eventTarget = buildEventTarget();

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
        },
        on(eventName, handler) {
            eventTarget.on(eventName, handler);
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
        drawingSurface.on(EVENT_CLICK, event => {
            eventTarget.trigger(EVENT_CLICK, {
                x: Math.floor(event.x),
                y: Math.floor(event.y),
                shift: event.shift
            });
        });
        drawingSurface.setSpaceRequirements(grid.metadata.width, grid.metadata.height);

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
    };

    return grid;
}

function buildTriangularMaze(config) {
    "use strict";
    const grid = buildBaseGrid(config);

    function hasBaseOnSouthSide(x,y) {
        return (x+y) % 2;
    }
    grid.isSquare = false;
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
                    southNeighbour = hasBaseOnSouthSide(x, y) && grid.getCellByCoordinates(x, y+1);
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
        const verticalAltitude = Math.sin(Math.PI/3);

        drawingSurface.on(EVENT_CLICK, event => {
            function getXCoord(event) {
                const xDivision = 2 * event.x,
                    y = getYCoord(event);

                if ((Math.floor(xDivision) + y) % 2) {
                    const tx = 1 - (xDivision % 1),
                        ty = (event.y / verticalAltitude) % 1;
                    if (tx > ty) {
                        return Math.floor(xDivision) - 1;
                    } else {
                        return Math.floor(xDivision);
                    }
                } else {
                    const tx = xDivision % 1,
                        ty = (event.y / verticalAltitude) % 1;
                    if (tx > ty) {
                        return Math.floor(xDivision);
                    } else {
                        return Math.floor(xDivision) - 1;
                    }
                }
            }
            function getYCoord(event) {
                return Math.floor(event.y / verticalAltitude);
            }
            const x = getXCoord(event),
                y = getYCoord(event);

            if (x >= 0 && x < config.width && y >= 0 && y < config.height) {
                eventTarget.trigger(EVENT_CLICK, {
                    x, y, shift: event.shift
                });
            }
        });

        drawingSurface.setSpaceRequirements(0.5 + grid.metadata.width/2, grid.metadata.height * verticalAltitude);

        grid.forEachCell(cell => {
            "use strict";
            const [x,y] = cell.coords,
                northNeighbour = cell.neighbours[DIRECTION_NORTH],
                southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                eastNeighbour = cell.neighbours[DIRECTION_EAST],
                westNeighbour = cell.neighbours[DIRECTION_WEST];

            if (hasBaseOnSouthSide(x, y)) {
                const p1x = x/2,
                    p1y = (y+1) * verticalAltitude,
                    p2x = (x+1)/2,
                    p2y = p1y - verticalAltitude,
                    p3x = p1x + 1,
                    p3y = p1y;
                if (!southNeighbour || !cell.isLinkedTo(southNeighbour)) {
                    drawingSurface.line(p1x, p1y, p3x, p3y);
                }
                if (!eastNeighbour || !cell.isLinkedTo(eastNeighbour)) {
                    drawingSurface.line(p2x, p2y, p3x, p3y);
                }
                if (!westNeighbour || !cell.isLinkedTo(westNeighbour)) {
                    drawingSurface.line(p1x, p1y, p2x, p2y);
                }

            } else {
                const p1x = x/2,
                    p1y = y * verticalAltitude,
                    p2x = (x+1)/2,
                    p2y = p1y + verticalAltitude,
                    p3x = p1x + 1,
                    p3y = p1y;
                if (!northNeighbour || !cell.isLinkedTo(northNeighbour)) {
                    drawingSurface.line(p1x, p1y, p3x, p3y);
                }
                if (!eastNeighbour || !cell.isLinkedTo(eastNeighbour)) {
                    drawingSurface.line(p2x, p2y, p3x, p3y);
                }
                if (!westNeighbour || !cell.isLinkedTo(westNeighbour)) {
                    drawingSurface.line(p1x, p1y, p2x, p2y);
                }
            }
        });
    };

    return grid;
}

function buildHexagonalMaze(config) {
    "use strict";
    const grid = buildBaseGrid(config);

    grid.isSquare = false;
    grid.initialise = function() {
        for (let x=0; x < config.width; x++) {
            for (let y=0; y < config.height; y++) {
                grid.addCell(x, y);
            }
        }
        for (let x=0; x < config.width; x++) {
            for (let y=0; y < config.height; y++) {
                const cell = grid.getCellByCoordinates(x, y),
                    rowBasedXOffset = ((y + 1) % 2),
                    eastNeighbour = grid.getCellByCoordinates(x+1, y),
                    southWestNeighbour = grid.getCellByCoordinates(x - rowBasedXOffset, y+1),
                    southEastNeighbour = grid.getCellByCoordinates(x + 1 - rowBasedXOffset, y+1);

                if (eastNeighbour) {
                    grid.makeNeighbours({cell, direction: DIRECTION_WEST}, {cell: eastNeighbour, direction: DIRECTION_EAST});
                }
                if (southWestNeighbour) {
                    grid.makeNeighbours({cell, direction: DIRECTION_NORTH_EAST}, {cell: southWestNeighbour, direction: DIRECTION_SOUTH_WEST});
                }
                if (southEastNeighbour) {
                    grid.makeNeighbours({cell, direction: DIRECTION_NORTH_WEST}, {cell: southEastNeighbour, direction: DIRECTION_SOUTH_EAST});
                }
            }
        }
    };

    grid.render = function(drawingSurface) {
        const yOffset1 = Math.cos(Math.PI / 3),
            yOffset2 = 2 - yOffset1,
            yOffset3 = 2,
            xOffset = Math.sin(Math.PI / 3);

        drawingSurface.on(EVENT_CLICK, event => {
            const ty = (event.y / (2 - yOffset1)) % 1;
            let x,y;
            const row = Math.floor(event.y / (2 - yOffset1)),
                xRowBasedAdjustment = (row % 2) * xOffset;

            if (ty <= yOffset1) {
                // in zig-zag region
                const tx = Math.abs(xOffset - ((event.x - xRowBasedAdjustment) % (2 * xOffset))),
                    tty = ty * (2 - yOffset1),
                    isAboveLine = tx/tty > Math.tan(Math.PI/3);
                let xYBasedAdjustment, yAdjustment;
                if (isAboveLine) {
                    if (xRowBasedAdjustment) {
                        xYBasedAdjustment = (event.x - xRowBasedAdjustment) % (2 * xOffset) > xOffset ? 1 : 0;
                    } else {
                        xYBasedAdjustment = event.x % (2 * xOffset) > xOffset ? 0 : -1;
                    }
                    yAdjustment = -1;
                } else {
                    xYBasedAdjustment = 0;
                    yAdjustment = 0;
                }
                x = Math.floor((event.x - xRowBasedAdjustment) / (2 * xOffset)) + xYBasedAdjustment;
                y = row + yAdjustment;
            } else {
                // in rectangular region
                x = Math.floor((event.x - xRowBasedAdjustment) / (2 * xOffset));
                y = row;
            }
            if (x >= 0 && x < config.width && y >= 0 && y < config.height) {
                eventTarget.trigger(EVENT_CLICK, {
                    x, y,
                    shift: event.shift
                });
            }
        });
        drawingSurface.setSpaceRequirements(grid.metadata.width * 2 * xOffset + Math.min(1, grid.metadata.height - 1) * xOffset, grid.metadata.height * yOffset2 + yOffset1);

        grid.forEachCell(cell => {
            "use strict";
            const [x,y] = cell.coords,
                eastNeighbour = cell.neighbours[DIRECTION_EAST],
                westNeighbour = cell.neighbours[DIRECTION_WEST],
                northEastNeighbour = cell.neighbours[DIRECTION_NORTH_EAST],
                northWestNeighbour = cell.neighbours[DIRECTION_NORTH_WEST],
                southEastNeighbour = cell.neighbours[DIRECTION_SOUTH_EAST],
                southWestNeighbour = cell.neighbours[DIRECTION_SOUTH_WEST],

                rowXOffset = (y % 2) * xOffset,
                p1x = rowXOffset + x * xOffset * 2,
                p1y = yOffset1 + y * yOffset2,
                p2x = p1x,
                p2y = (y + 1) * yOffset2,
                p3x = rowXOffset + (2 * x + 1) * xOffset,
                p3y = y * yOffset2 + yOffset3,
                p4x = p2x + 2 * xOffset,
                p4y = p2y,
                p5x = p4x,
                p5y = p1y,
                p6x = p3x,
                p6y = y * yOffset2;

            if (!eastNeighbour || !cell.isLinkedTo(eastNeighbour)) {
                drawingSurface.line(p4x, p4y, p5x, p5y);
            }
            if (!westNeighbour || !cell.isLinkedTo(westNeighbour)) {
                drawingSurface.line(p1x, p1y, p2x, p2y);
            }
            if (!northEastNeighbour || !cell.isLinkedTo(northEastNeighbour)) {
                drawingSurface.line(p5x, p5y, p6x, p6y);
            }
            if (!northWestNeighbour || !cell.isLinkedTo(northWestNeighbour)) {
                drawingSurface.line(p1x, p1y, p6x, p6y);
            }
            if (!southEastNeighbour || !cell.isLinkedTo(southEastNeighbour)) {
                drawingSurface.line(p3x, p3y, p4x, p4y);
            }
            if (!southWestNeighbour || !cell.isLinkedTo(southWestNeighbour)) {
                drawingSurface.line(p2x, p2y, p3x, p3y);
            }
        });
    };

    return grid;
}

function buildCircularMaze(config) {
    "use strict";

    function cellCountsForLayers(layers) {
        const counts = [1], rowRadius = 1 / layers;
        while (counts.length < layers) {
            const layer = counts.length,
                previousCount = counts[layer-1],
                circumference = Math.PI * 2 * layer * rowRadius / previousCount;
            counts.push(previousCount * Math.round(circumference / rowRadius));
        }
        return counts;
    }

    const grid = buildBaseGrid(config),
        cellCounts = cellCountsForLayers(config.layers);

    grid.isSquare = false;
    grid.initialise = function() {
        for (let l=0; l < config.layers; l++) {
            const cellsInLayer = cellCounts[l];
            for (let c=0; c < cellsInLayer; c++) {
                grid.addCell(l, c);
            }
        }

        for (let l=0; l < config.layers; l++) {
            const cellsInLayer = cellCounts[l];
            for (let c=0; c < cellsInLayer; c++) {
                const cell = grid.getCellByCoordinates(l, c);
                if (cellsInLayer > 1) {
                    const clockwiseNeighbour = grid.getCellByCoordinates(l, (c + 1) % cellsInLayer),
                        anticlockwiseNeighbour = grid.getCellByCoordinates(l, (c + cellsInLayer - 1) % cellsInLayer);
                    grid.makeNeighbours({cell, direction: DIRECTION_CLOCKWISE}, {cell: anticlockwiseNeighbour, direction: DIRECTION_ANTICLOCKWISE});
                }

                if (l < config.layers - 1) {
                    const cellsInNextLayer = cellCounts[l+1],
                        outerNeighbourCount = cellsInNextLayer / cellsInLayer;
                    for (let o = 0; o < outerNeighbourCount; o++) {
                        const outerNeighbour = grid.getCellByCoordinates(l+1, c * outerNeighbourCount + o);
                        grid.makeNeighbours({cell, direction: DIRECTION_INWARDS}, {cell: outerNeighbour, direction: `DIRECTION_OUTWARDS_${o}`});
                    }
                }
            }
        }
    };

    grid.render = function(drawingSurface) {
        drawingSurface.setSpaceRequirements(grid.metadata.layers * 2, grid.metadata.layers * 2,);

        const cx = grid.metadata.layers,
            cy = grid.metadata.layers;

        function polarToXy(angle, distance) {
            return [cx + distance * Math.sin(angle), cy - distance * Math.cos(angle)];
        }

        grid.forEachCell(cell => {
            "use strict";
            const [l,c] = cell.coords,
                cellsInLayer = cellCounts[l],
                anglePerCell = Math.PI * 2 / cellsInLayer,
                startAngle = anglePerCell * c,
                endAngle = startAngle + anglePerCell,
                innerDistance = l,
                outerDistance = l + 1,
                outermostLayer = l === grid.metadata.layers - 1,
                clockwiseNeighbour = cell.neighbours[DIRECTION_CLOCKWISE],
                anticlockwiseNeighbour = cell.neighbours[DIRECTION_ANTICLOCKWISE],
                inwardsNeighbour = cell.neighbours[DIRECTION_INWARDS];

            if (l > 0) {
                if (!cell.isLinkedTo(anticlockwiseNeighbour)) {
                    drawingSurface.line(...polarToXy(startAngle, innerDistance), ...polarToXy(startAngle, outerDistance));
                }
                if (!cell.isLinkedTo(clockwiseNeighbour)) {
                    drawingSurface.line(...polarToXy(endAngle, innerDistance), ...polarToXy(endAngle, outerDistance));
                }
                if (!cell.isLinkedTo(inwardsNeighbour)) {
                    drawingSurface.arc(cx, cy, innerDistance, startAngle, endAngle);
                }
                if (outermostLayer) {
                    drawingSurface.arc(cx, cy, outerDistance, startAngle, endAngle);
                }
            }

        });
    };

    return grid;
}

const shapeLookup = {
    [SHAPE_SQUARE]: buildSquareMaze,
    [SHAPE_TRIANGLE]: buildTriangularMaze,
    [SHAPE_HEXAGON]: buildHexagonalMaze,
    [SHAPE_CIRCLE]: buildCircularMaze
};

export function buildMaze(config) {
    "use strict";
    const
        algorithm = algorithms[config.algorithm],
        grid = shapeLookup[config.style](config);
    grid.initialise();
    algorithm.fn(grid, config);

    return grid;
}