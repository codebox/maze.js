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
        },
        findPathBetween(fromCoords, toCoords) {
            this.findDistancesFrom(...toCoords);
            let currentCell = this.getCellByCoordinates(...fromCoords),
                endCell = this.getCellByCoordinates(...toCoords);

            const path = [];

            path.push(currentCell.coords);
            while(currentCell !== endCell) {
                const currentDistance = currentCell.metadata[METADATA_DISTANCE],
                    nextCell = Object.values(currentCell.neighbours)
                        .filter(neighbour => currentCell.isLinkedTo(neighbour))
                        .find(neighbour => (neighbour.metadata || {})[METADATA_DISTANCE] === currentDistance - 1);
                path.push(nextCell.coords);
                currentCell = nextCell;
            }
            this.metadata[METADATA_PATH] = path;
            this.clearDistances();
        },
        findDistancesFrom(...coords) {
            this.clearDistances();
            const startCell = this.getCellByCoordinates(...coords);
            startCell.metadata[METADATA_DISTANCE] = 0;
            const frontier = [startCell];
            let maxDistance = 0, maxDistancePoint;
            while(frontier.length) {
                const next = frontier.shift(),
                    frontierDistance = next.metadata[METADATA_DISTANCE];
                const linkedUndistancedNeighbours = Object.values(next.neighbours)
                    .filter(neighbour => next.isLinkedTo(neighbour))
                    .filter(neighbour => neighbour.metadata[METADATA_DISTANCE] === undefined);

                linkedUndistancedNeighbours.forEach(neighbour => {
                    neighbour.metadata[METADATA_DISTANCE] = frontierDistance + 1;
                });
                frontier.push(...linkedUndistancedNeighbours);
                if (linkedUndistancedNeighbours.length) {
                    if (frontierDistance >= maxDistance) {
                        maxDistancePoint = linkedUndistancedNeighbours[0];
                    }
                    maxDistance = Math.max(frontierDistance+1, maxDistance);
                }
            }
            this.metadata[METADATA_MAX_DISTANCE] = maxDistance;
        },
        clearDistances() {
            this.forEachCell(cell => delete cell.metadata[METADATA_DISTANCE]);
            delete this.metadata[METADATA_MAX_DISTANCE];
        }
    };
}

function getDistanceColour(distance, maxDistance) {
    return `hsl(${Math.floor(100 - 100 * distance/maxDistance)}, 100%, 50%)`;
}

function buildSquareMaze(config) {
    "use strict";
    const {drawingSurface} = config,
        grid = buildBaseGrid(config);

    drawingSurface.on(EVENT_CLICK, event => {
        eventTarget.trigger(EVENT_CLICK, {
            coords: [Math.floor(event.x), Math.floor(event.y)],
            shift: event.shift
        });
    });
    drawingSurface.setSpaceRequirements(grid.metadata.width, grid.metadata.height);

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

    grid.render = function() {
        function drawFilledSquare(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, distance) {
            if (distance === undefined) {
                drawingSurface.setColour(CELL_BACKGROUND_COLOUR);
            } else {
                drawingSurface.setColour(getDistanceColour(distance, grid.metadata[METADATA_MAX_DISTANCE]));
            }
            drawingSurface.fillPolygon({x: p1x, y:p1y}, {x: p2x, y:p2y}, {x: p3x, y:p3y}, {x: p4x, y:p4y});
            drawingSurface.setColour(WALL_COLOUR);
        }

        grid.forEachCell(cell => {
            "use strict";
            const [x,y] = cell.coords,
                northNeighbour = cell.neighbours[DIRECTION_NORTH],
                southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                eastNeighbour = cell.neighbours[DIRECTION_EAST],
                westNeighbour = cell.neighbours[DIRECTION_WEST];

            drawFilledSquare(x, y, x+1, y, x+1, y+1, x, y+1, cell.metadata[METADATA_DISTANCE]);

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

        const path = grid.metadata[METADATA_PATH];
        if (path) {
            const LINE_OFFSET = 0.5;
            let previousCoords;
            drawingSurface.setColour(PATH_COLOUR);
            path.forEach((currentCoords, i) => {
                if (i) {
                    const x1 = previousCoords[0] + LINE_OFFSET,
                        y1 = previousCoords[1] + LINE_OFFSET,
                        x2 = currentCoords[0] + LINE_OFFSET,
                        y2 = currentCoords[1] + LINE_OFFSET;
                    drawingSurface.line(x1, y1, x2, y2);
                }
                previousCoords = currentCoords;
            });
            drawingSurface.setColour(WALL_COLOUR);
        }
    };

    return grid;
}

function buildTriangularMaze(config) {
    "use strict";
    const {drawingSurface} = config,
        grid = buildBaseGrid(config),
        verticalAltitude = Math.sin(Math.PI/3);

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
                coords: [x, y],
                shift: event.shift
            });
        }
    });
    drawingSurface.setSpaceRequirements(0.5 + grid.metadata.width/2, grid.metadata.height * verticalAltitude);

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

    grid.render = function() {
        function drawFilledTriangle(p1x, p1y, p2x, p2y, p3x, p3y, colour) {
            drawingSurface.setColour(colour);
            drawingSurface.fillPolygon({x: p1x, y:p1y}, {x: p2x, y:p2y}, {x: p3x, y:p3y});
            drawingSurface.setColour(WALL_COLOUR);
        }

        function getCornerCoords(x, y) {
            let p1x, p1y, p2x, p2y, p3x, p3y;

            if (hasBaseOnSouthSide(x, y)) {
                p1x = x/2;
                p1y = (y+1) * verticalAltitude;
                p2x = (x+1)/2;
                p2y = p1y - verticalAltitude;
                p3x = p1x + 1;
                p3y = p1y;

            } else {
                p1x = x/2;
                p1y = y * verticalAltitude;
                p2x = (x+1)/2;
                p2y = p1y + verticalAltitude;
                p3x = p1x + 1;
                p3y = p1y
            }
            return [p1x, p1y, p2x, p2y, p3x, p3y];
        }

        const path = grid.metadata[METADATA_PATH];
        if (path) {
            let previousX, previousY;
            drawingSurface.setColour(PATH_COLOUR);
            path.forEach((currentCoords, i) => {
                const [p1x, p1y, p2x, p2y, p3x, p3y] = getCornerCoords(currentCoords[0], currentCoords[1]),
                    centerX = (p1x + p2x + p3x) / 3,
                    centerY = (p1y + p2y + p3y) / 3;
                if (i) {
                    drawingSurface.line(previousX, previousY, centerX, centerY);
                }
                [previousX, previousY] = [centerX, centerY];
            });
            drawingSurface.setColour(WALL_COLOUR);
        }

        grid.forEachCell(cell => {
            "use strict";
            const [x,y] = cell.coords,
                northNeighbour = cell.neighbours[DIRECTION_NORTH],
                southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                eastNeighbour = cell.neighbours[DIRECTION_EAST],
                westNeighbour = cell.neighbours[DIRECTION_WEST];

            const [p1x, p1y, p2x, p2y, p3x, p3y] = getCornerCoords(x, y),
                northOrSouthNeighbour = hasBaseOnSouthSide(x, y) ? southNeighbour : northNeighbour;

            if (!path) {
                const distance = cell.metadata[METADATA_DISTANCE],
                    colour = (distance === undefined) ? 'white' : getDistanceColour(distance, grid.metadata[METADATA_MAX_DISTANCE]);
                drawFilledTriangle(p1x, p1y, p2x, p2y, p3x, p3y, colour);

            }

            if (!northOrSouthNeighbour || !cell.isLinkedTo(northOrSouthNeighbour)) {
                drawingSurface.line(p1x, p1y, p3x, p3y);
            }
            if (!eastNeighbour || !cell.isLinkedTo(eastNeighbour)) {
                drawingSurface.line(p2x, p2y, p3x, p3y);
            }
            if (!westNeighbour || !cell.isLinkedTo(westNeighbour)) {
                drawingSurface.line(p1x, p1y, p2x, p2y);
            }
        });

    };

    return grid;
}

function buildHexagonalMaze(config) {
    "use strict";
    const {drawingSurface} = config,
        grid = buildBaseGrid(config);

    const yOffset1 = Math.cos(Math.PI / 3),
        yOffset2 = 2 - yOffset1,
        yOffset3 = 2,
        xOffset = Math.sin(Math.PI / 3);

    drawingSurface.setSpaceRequirements(grid.metadata.width * 2 * xOffset + Math.min(1, grid.metadata.height - 1) * xOffset, grid.metadata.height * yOffset2 + yOffset1);

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
                coords: [x, y],
                shift: event.shift
            });
        }
    });

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

    grid.render = function() {
        function drawFilledHexagon(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, p5x, p5y, p6x, p6y, distance) {
            if (distance === undefined) {
                drawingSurface.setColour(CELL_BACKGROUND_COLOUR);
            } else {
                drawingSurface.setColour(getDistanceColour(distance, grid.metadata[METADATA_MAX_DISTANCE]));
            }
            drawingSurface.fillPolygon({x: p1x, y:p1y}, {x: p2x, y:p2y}, {x: p3x, y:p3y}, {x: p4x, y:p4y}, {x: p5x, y:p5y}, {x: p6x, y:p6y});
            drawingSurface.setColour(WALL_COLOUR);
        }
        function getCornerCoords(x, y) {
            const rowXOffset = (y % 2) * xOffset,
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

            return [p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, p5x, p5y, p6x, p6y];
        }

        grid.forEachCell(cell => {
            "use strict";
            const [x,y] = cell.coords,
                eastNeighbour = cell.neighbours[DIRECTION_EAST],
                westNeighbour = cell.neighbours[DIRECTION_WEST],
                northEastNeighbour = cell.neighbours[DIRECTION_NORTH_EAST],
                northWestNeighbour = cell.neighbours[DIRECTION_NORTH_WEST],
                southEastNeighbour = cell.neighbours[DIRECTION_SOUTH_EAST],
                southWestNeighbour = cell.neighbours[DIRECTION_SOUTH_WEST],

                [p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, p5x, p5y, p6x, p6y] = getCornerCoords(x, y);

            drawFilledHexagon(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, p5x, p5y, p6x, p6y, cell.metadata[METADATA_DISTANCE]);
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

        const path = grid.metadata[METADATA_PATH];
        if (path) {
            let previousX, previousY;
            drawingSurface.setColour(PATH_COLOUR);
            path.forEach((currentCoords, i) => {
                const
                    [p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, p5x, p5y, p6x, p6y] = getCornerCoords(currentCoords[0], currentCoords[1]),
                    centerX = p3x,
                    centerY = (p3y + p6y) / 2;
                if (i) {
                    drawingSurface.line(previousX, previousY, centerX, centerY);
                }
                [previousX, previousY] = [centerX, centerY];
            });
            drawingSurface.setColour(WALL_COLOUR);
        }

    };

    return grid;
}

function buildCircularMaze(config) {
    "use strict";
    const grid = buildBaseGrid(config),
        cellCounts = cellCountsForLayers(config.layers),
        {drawingSurface} = config;

    drawingSurface.setSpaceRequirements(grid.metadata.layers * 2, grid.metadata.layers * 2,);

    const cx = grid.metadata.layers,
        cy = grid.metadata.layers;

    drawingSurface.on(EVENT_CLICK, event => {
        const xDistance = event.x - cx,
            yDistance = event.y - cy,
            distanceFromCenter = Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2)),
            layer = Math.floor(distanceFromCenter),
            cellsInThisLayer = cellCounts[layer],
            anglePerCell = Math.PI * 2 / cellsInThisLayer,
            angle = (Math.atan2(yDistance, xDistance) + 2.5 * Math.PI) % (Math.PI * 2),
            cell = Math.floor(angle / anglePerCell);

        if (cell >= 0 && cell < cellsInThisLayer && layer >= 0 && layer < grid.metadata.layers) {
            eventTarget.trigger(EVENT_CLICK, {
                coords: [layer, cell],
                shift: event.shift
            });
        }
    });
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

    grid.render = function() {
        function polarToXy(angle, distance) {
            return [cx + distance * Math.sin(angle), cy - distance * Math.cos(angle)];
        }
        function drawFilledSegment(smallR, bigR, startAngle, endAngle, distance) {
            if (distance === undefined) {
                drawingSurface.setColour(CELL_BACKGROUND_COLOUR);
            } else {
                drawingSurface.setColour(getDistanceColour(distance, grid.metadata[METADATA_MAX_DISTANCE]));
            }
            drawingSurface.fillSegment(cx, cy, smallR, bigR, startAngle, endAngle);
            drawingSurface.setColour(WALL_COLOUR);
        }

        function getCellCoords(l, c) {
            const cellsInLayer = cellCounts[l],
                anglePerCell = Math.PI * 2 / cellsInLayer,
                startAngle = anglePerCell * c,
                endAngle = startAngle + anglePerCell,
                innerDistance = l,
                outerDistance = l + 1;

            return [startAngle, endAngle, innerDistance, outerDistance];
        }

        grid.forEachCell(cell => {
            "use strict";
            const [l,c] = cell.coords,
                [startAngle, endAngle, innerDistance, outerDistance] = getCellCoords(l, c),
                outermostLayer = l === grid.metadata.layers - 1,
                clockwiseNeighbour = cell.neighbours[DIRECTION_CLOCKWISE],
                anticlockwiseNeighbour = cell.neighbours[DIRECTION_ANTICLOCKWISE],
                inwardsNeighbour = cell.neighbours[DIRECTION_INWARDS];

            drawFilledSegment(l, l + 1, startAngle, endAngle, cell.metadata[METADATA_DISTANCE]);

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

        const path = grid.metadata[METADATA_PATH];


        function thisCell(thisCoords) {
            const LAYER = 0, INDEX = 1,
                [thisLayer, thisIndex] = thisCoords;
            return {
                isOnInnermostLayer() {
                    return thisLayer === 0;
                },
                isOnOutermostLayer() {
                    return thisLayer === grid.metadata.layers - 1;
                },
                hasFiveExits() {
                    return ! this.isOnInnermostLayer() && ! this.isOnOutermostLayer() && (cellCounts[thisLayer] < cellCounts[thisLayer + 1]);
                },
                hasAntiClockwiseOutsideBorderWith(otherCoords) {
                    return this.hasFiveExits() && thisLayer + 1 === otherCoords[LAYER] && thisIndex * 2 === otherCoords[INDEX];
                },
                hasClockwiseOutsideBorderWith(otherCoords) {
                    return this.hasFiveExits() && thisLayer + 1 === otherCoords[LAYER] && thisIndex * 2 + 1=== otherCoords[INDEX];
                },
                isInSameLayerAs(otherCoords) {
                    return thisLayer === otherCoords[LAYER];
                },
                isInside(otherCoords) {
                    return thisLayer < otherCoords[LAYER];
                },
                isOutside(otherCoords) {
                    return thisLayer > otherCoords[LAYER];
                },
                isAntiClockwiseFrom(otherCoords) {
                    return this.isInSameLayerAs(otherCoords) && ((otherCoords[INDEX] === thisIndex + 1) || (thisIndex === cellCounts[thisLayer] - 1 && otherCoords[INDEX] === 0));
                },
                isClockwiseFrom(otherCoords) {
                    return this.isInSameLayerAs(otherCoords) && ((otherCoords[INDEX] === thisIndex - 1) || (otherCoords[INDEX] === cellCounts[thisLayer] - 1 && thisIndex === 0));
                },
                getCoords() {
                    return getCellCoords(thisLayer, thisIndex);
                }
            };
        }

        if (path) {
            drawingSurface.setColour(PATH_COLOUR);
            for (let i = 0; i < path.length; i++) {
                const
                    previousCellCoords = path[i-1],
                    currentCellCoords = path[i],
                    nextCellCoords = path[i+1],
                    cell = thisCell(currentCellCoords),
                    [startAngle, endAngle, innerDistance, outerDistance] = cell.getCoords(),
                    centerDistance = (innerDistance + outerDistance) / 2,
                    centerAngle = (startAngle + endAngle) / 2;

                if (cell.isOnInnermostLayer()) {
                    if (previousCellCoords) {
                        const [previousStartAngle, previousEndAngle, _1, _2] = thisCell(previousCellCoords).getCoords(),
                            previousCenterAngle = (previousStartAngle + previousEndAngle) / 2;
                        drawingSurface.line(...polarToXy(previousCenterAngle, 0), ...polarToXy(previousCenterAngle, outerDistance));
                    }

                    if (nextCellCoords) {
                        const [nextStartAngle, nextEndAngle, _1, _2] = thisCell(nextCellCoords).getCoords(),
                            nextCenterAngle = (nextStartAngle + nextEndAngle) / 2;
                        drawingSurface.line(...polarToXy(nextCenterAngle, 0), ...polarToXy(nextCenterAngle, outerDistance));
                    }

                } else if (cell.hasFiveExits()) {
                    const centerClockwiseAngle = (centerAngle + endAngle) / 2,
                        centerAnticlockwiseAngle = (startAngle + centerAngle) / 2;
                    if (previousCellCoords) {
                        if (cell.isClockwiseFrom(previousCellCoords)) {
                            if (nextCellCoords) {
                                if (cell.isOutside(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, centerAngle);
                                    drawingSurface.line(...polarToXy(centerAngle, centerDistance), ...polarToXy(centerAngle, innerDistance));

                                } else if (cell.isAntiClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, endAngle);

                                } else if (cell.hasClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, centerClockwiseAngle);
                                    drawingSurface.line(...polarToXy(centerClockwiseAngle, centerDistance), ...polarToXy(centerClockwiseAngle, outerDistance));

                                } else if (cell.hasAntiClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, centerAnticlockwiseAngle);
                                    drawingSurface.line(...polarToXy(centerAnticlockwiseAngle, centerDistance), ...polarToXy(centerAnticlockwiseAngle, outerDistance));
                                } else {
                                    console.assert(false);
                                }

                            } else {
                                drawingSurface.arc(cx, cy, centerDistance, startAngle, centerAngle);
                            }

                        } else if (cell.isAntiClockwiseFrom(previousCellCoords)) {
                            if (nextCellCoords) {
                                if (cell.isOutside(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAngle, endAngle);
                                    drawingSurface.line(...polarToXy(centerAngle, centerDistance), ...polarToXy(centerAngle, innerDistance));

                                } else if (cell.isClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, endAngle);

                                } else if (cell.hasClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerClockwiseAngle, endAngle);
                                    drawingSurface.line(...polarToXy(centerClockwiseAngle, centerDistance), ...polarToXy(centerClockwiseAngle, outerDistance));

                                } else if (cell.hasAntiClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAnticlockwiseAngle, endAngle);
                                    drawingSurface.line(...polarToXy(centerAnticlockwiseAngle, centerDistance), ...polarToXy(centerAnticlockwiseAngle, outerDistance));
                                } else {
                                    console.assert(false);
                                }

                            } else {
                                drawingSurface.arc(cx, cy, centerDistance, centerAngle, endAngle);
                            }

                        } else if (cell.isOutside(previousCellCoords)) {
                            drawingSurface.line(...polarToXy(centerAngle, innerDistance), ...polarToXy(centerAngle, centerDistance));
                            if (nextCellCoords) {
                                if (cell.isClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, centerAngle);

                                } else if (cell.isAntiClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAngle, endAngle);

                                } else if (cell.hasClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAngle, centerClockwiseAngle);
                                    drawingSurface.line(...polarToXy(centerClockwiseAngle, centerDistance), ...polarToXy(centerClockwiseAngle, outerDistance));

                                } else if (cell.hasAntiClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAnticlockwiseAngle, centerAngle);
                                    drawingSurface.line(...polarToXy(centerAnticlockwiseAngle, centerDistance), ...polarToXy(centerAnticlockwiseAngle, outerDistance));

                                } else {
                                    console.assert(false);
                                }
                            }

                        } else if (cell.hasClockwiseOutsideBorderWith(previousCellCoords) ) {
                            drawingSurface.line(...polarToXy(centerClockwiseAngle, outerDistance), ...polarToXy(centerClockwiseAngle, centerDistance));
                            if (nextCellCoords) {
                                if (cell.isClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, centerClockwiseAngle);

                                } else if (cell.isAntiClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerClockwiseAngle, endAngle);

                                } else if (cell.hasAntiClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAnticlockwiseAngle, centerClockwiseAngle);
                                    drawingSurface.line(...polarToXy(centerAnticlockwiseAngle, centerDistance), ...polarToXy(centerAnticlockwiseAngle, outerDistance));

                                } else if (cell.isOutside(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAngle, centerClockwiseAngle);
                                    drawingSurface.line(...polarToXy(centerAngle, centerDistance), ...polarToXy(centerAngle, innerDistance));

                                } else {
                                    console.assert(false);
                                }
                            }

                        } else if (cell.hasAntiClockwiseOutsideBorderWith(previousCellCoords) ) {
                            drawingSurface.line(...polarToXy(centerAnticlockwiseAngle, outerDistance), ...polarToXy(centerAnticlockwiseAngle, centerDistance));
                            if (nextCellCoords) {
                                if (cell.isClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, startAngle, centerAnticlockwiseAngle);

                                } else if (cell.isAntiClockwiseFrom(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAnticlockwiseAngle, endAngle);

                                } else if (cell.hasClockwiseOutsideBorderWith(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAnticlockwiseAngle, centerClockwiseAngle);
                                    drawingSurface.line(...polarToXy(centerClockwiseAngle, centerDistance), ...polarToXy(centerClockwiseAngle, outerDistance));

                                } else if (cell.isOutside(nextCellCoords)) {
                                    drawingSurface.arc(cx, cy, centerDistance, centerAnticlockwiseAngle, centerAngle);
                                    drawingSurface.line(...polarToXy(centerAngle, centerDistance), ...polarToXy(centerAngle, innerDistance));

                                } else {
                                    console.assert(false);
                                }
                            }

                        } else {
                            console.assert(false);
                        }

                    }

                } else {
                    if (previousCellCoords) {
                        if (cell.isClockwiseFrom(previousCellCoords)) {
                            drawingSurface.arc(cx, cy, centerDistance, startAngle, centerAngle);
                        } else if (cell.isAntiClockwiseFrom(previousCellCoords)) {
                            drawingSurface.arc(cx, cy, centerDistance, centerAngle, endAngle);
                        } else if (cell.isOutside(previousCellCoords)) {
                            drawingSurface.line(...polarToXy(centerAngle, innerDistance), ...polarToXy(centerAngle, centerDistance));
                        } else if (cell.isInside(previousCellCoords)) {
                            drawingSurface.line(...polarToXy(centerAngle, outerDistance), ...polarToXy(centerAngle, centerDistance));
                        } else {
                            console.assert(false);
                        }
                    }

                    if (nextCellCoords) {
                        if (cell.isAntiClockwiseFrom(nextCellCoords)) {
                            drawingSurface.arc(cx, cy, centerDistance, centerAngle, endAngle);
                        } else if (cell.isClockwiseFrom(nextCellCoords)) {
                            drawingSurface.arc(cx, cy, centerDistance, startAngle, centerAngle);
                        } else if (cell.isOutside(nextCellCoords)) {
                            drawingSurface.line(...polarToXy(centerAngle, centerDistance), ...polarToXy(centerAngle, innerDistance));
                        } else if (cell.isInside(nextCellCoords)) {
                            drawingSurface.line(...polarToXy(centerAngle, centerDistance), ...polarToXy(centerAngle, outerDistance));
                        } else {
                            console.assert(false);
                        }
                    }
                }

            }
            drawingSurface.setColour(WALL_COLOUR);
        }

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