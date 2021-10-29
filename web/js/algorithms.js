import {forEachContiguousPair} from './utils.js';
import {
    ALGORITHM_NONE, ALGORITHM_BINARY_TREE, ALGORITHM_SIDEWINDER, ALGORITHM_ALDOUS_BRODER, ALGORITHM_WILSON, ALGORITHM_HUNT_AND_KILL, ALGORITHM_RECURSIVE_BACKTRACK, ALGORITHM_KRUSKAL,
    METADATA_VISITED, METADATA_SET_ID, METADATA_CURRENT_CELL, METADATA_UNPROCESSED_CELL,
    DIRECTION_EAST, DIRECTION_SOUTH,
    SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE

} from './constants.js';


function markAsVisited(cell) {
    cell.metadata[METADATA_VISITED] = true;
}

function isVisited(cell) {
    return cell.metadata[METADATA_VISITED];
}

function isUnvisited(cell) {
    return !isVisited(cell);
}

export const algorithms = {
    [ALGORITHM_NONE]: {
        metadata: {
            'description': 'Grid',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn: function*(grid, config) {}
    },
    [ALGORITHM_BINARY_TREE]: {
        metadata: {
            'description': 'Binary Tree',
            'maskable': false,
            'shapes': [SHAPE_SQUARE]
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config;

            let previousCell;
            grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
            const allCoords = grid.getAllCellCoords();
            for (let i = 0; i < allCoords.length; i++) {
                const
                    cell = grid.getCellByCoordinates(allCoords[i]),
                    eastNeighbour = cell.neighbours[DIRECTION_EAST],
                    southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                    goEast = random.int(2) === 0,
                    goSouth = !goEast,
                    linkEast = eastNeighbour && (goEast || !southNeighbour),
                    linkSouth = southNeighbour && (goSouth || !eastNeighbour);

                if (linkEast) {
                    grid.link(cell, eastNeighbour);

                } else if (linkSouth) {
                    grid.link(cell, southNeighbour);
                }

                if (previousCell) {
                    delete previousCell.metadata[METADATA_CURRENT_CELL]
                }
                delete cell.metadata[METADATA_UNPROCESSED_CELL];
                cell.metadata[METADATA_CURRENT_CELL] = true;
                previousCell = cell;
                yield;
            }
            delete previousCell.metadata[METADATA_CURRENT_CELL];
        }
    },
    [ALGORITHM_SIDEWINDER]: {
        metadata: {
            'description': 'Sidewinder',
            'maskable': false,
            'shapes': [SHAPE_SQUARE]
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config;
            grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
            let previousCell;
            for (let y = 0; y < grid.metadata.height; y++) {
                let currentRun = [];
                for (let x = 0; x < grid.metadata.width; x++) {
                    const cell = grid.getCellByCoordinates(x, y),
                        eastNeighbour = cell.neighbours[DIRECTION_EAST],
                        southNeighbour = cell.neighbours[DIRECTION_SOUTH],
                        goEast = eastNeighbour && (random.int(2) === 0 || !southNeighbour);

                    currentRun.push(cell);
                    if (goEast) {
                        grid.link(cell, eastNeighbour);

                    } else if (southNeighbour) {
                        const randomCellFromRun = random.choice(currentRun),
                            southNeighbourOfRandomCell = randomCellFromRun.neighbours[DIRECTION_SOUTH];

                        grid.link(randomCellFromRun, southNeighbourOfRandomCell);

                        currentRun = [];
                    }

                    if (previousCell) {
                        delete previousCell.metadata[METADATA_CURRENT_CELL]
                    }
                    delete cell.metadata[METADATA_UNPROCESSED_CELL];
                    cell.metadata[METADATA_CURRENT_CELL] = true;
                    previousCell = cell;
                    yield;
                }
            }
            delete previousCell.metadata[METADATA_CURRENT_CELL];
        }
    },
    [ALGORITHM_ALDOUS_BRODER]: {
        metadata: {
            'description': 'Aldous Broder',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config;
            let unvisitedCount = grid.cellCount, currentCell, previousCell;

            function moveTo(nextCell) {
                if (isUnvisited(nextCell)) {
                    unvisitedCount--;
                    markAsVisited(nextCell);
                    if (currentCell) {
                        grid.link(currentCell, nextCell);
                    }
                }
                currentCell = nextCell;
            }

            grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
            const startCell = grid.randomCell();
            moveTo(startCell);

            while (unvisitedCount) {
                const nextCell = currentCell.neighbours.random();
                if (previousCell) {
                    delete previousCell.metadata[METADATA_CURRENT_CELL]
                }
                delete nextCell.metadata[METADATA_UNPROCESSED_CELL];
                nextCell.metadata[METADATA_CURRENT_CELL] = true;
                previousCell = nextCell;
                yield;

                moveTo(nextCell);
            }
            delete previousCell.metadata[METADATA_CURRENT_CELL];
        }
    },
    [ALGORITHM_WILSON]: {
        metadata: {
            'description': 'Wilson',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config;

            function markVisited(cell) {
                cell.metadata[METADATA_VISITED] = true;
                delete cell.metadata[METADATA_UNPROCESSED_CELL];
            }
            function removeLoops(cells) {
                const latestCell = cells[cells.length - 1],
                    indexOfPreviousVisit = cells.findIndex(cell => cell === latestCell);
                if (indexOfPreviousVisit >= 0) {
                    cells.splice(indexOfPreviousVisit + 1);
                }
            }

            grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
            markVisited(grid.randomCell(isUnvisited));

            let currentCell, previousCell
            while (currentCell = grid.randomCell(isUnvisited)) {
                let currentPath = [currentCell];

                while (true) {
                    const nextCell = currentCell.neighbours.random();
                    currentPath.push(nextCell);

                    if (isUnvisited(nextCell)) {
                        removeLoops(currentPath);
                        currentCell = nextCell;
                    } else {
                        forEachContiguousPair(currentPath, grid.link);
                        currentPath.forEach(markVisited);
                        break;
                    }
                    if (previousCell) {
                        delete previousCell.metadata[METADATA_CURRENT_CELL]
                    }
                    nextCell.metadata[METADATA_CURRENT_CELL] = true;
                    previousCell = nextCell;
                    yield;
                }
            }
            delete previousCell.metadata[METADATA_CURRENT_CELL];
        }
    },
    [ALGORITHM_HUNT_AND_KILL]: {
        metadata: {
            'description': 'Hunt and Kill',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config;

            let currentCell = grid.randomCell(), previousCell;

            grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
            delete currentCell.metadata[METADATA_UNPROCESSED_CELL];
            markAsVisited(currentCell);

            while (true) {
                const nextCell = currentCell.neighbours.random(isUnvisited);
                if (nextCell) {
                    markAsVisited(nextCell);
                    grid.link(currentCell, nextCell);
                    currentCell = nextCell;
                } else {
                    const unvisitedCellWithVisitedNeighbours = grid.randomCell(cell => isUnvisited(cell) && cell.neighbours.random(isVisited));
                    if (unvisitedCellWithVisitedNeighbours) {
                        const visitedNeighbour = unvisitedCellWithVisitedNeighbours.neighbours.random(isVisited);
                        markAsVisited(unvisitedCellWithVisitedNeighbours);
                        grid.link(unvisitedCellWithVisitedNeighbours, visitedNeighbour);
                        currentCell = unvisitedCellWithVisitedNeighbours;
                    } else {
                        break;
                    }
                }
                if (previousCell) {
                    delete previousCell.metadata[METADATA_CURRENT_CELL]
                }
                delete currentCell.metadata[METADATA_UNPROCESSED_CELL];
                currentCell.metadata[METADATA_CURRENT_CELL] = true;
                previousCell = currentCell;
                yield;
            }
            delete previousCell.metadata[METADATA_CURRENT_CELL];
        }
    },
    [ALGORITHM_RECURSIVE_BACKTRACK]: {
        metadata: {
            'description': 'Recursive Backtrack',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn: function*(grid) {
            "use strict";
            const stack = [];
            let currentCell, previousCell;

            function visitCell(nextCell) {
                const previousCell = currentCell;
                currentCell = nextCell;
                markAsVisited(currentCell);
                if (previousCell) {
                    grid.link(currentCell, previousCell);
                }
                stack.push(currentCell);
            }

            grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
            const startCell = grid.randomCell();
            visitCell(startCell);
            delete startCell.metadata[METADATA_UNPROCESSED_CELL];

            while (stack.length) {
                const nextCell = currentCell.neighbours.random(isUnvisited);
                if (nextCell) {
                    visitCell(nextCell);

                } else {
                    while (!currentCell.neighbours.random(isUnvisited)) {
                        stack.pop();
                        if (!stack.length) {
                            break;
                        }
                        currentCell = stack[stack.length - 1];
                    }
                }
                if (previousCell) {
                    delete previousCell.metadata[METADATA_CURRENT_CELL]
                }
                delete currentCell.metadata[METADATA_UNPROCESSED_CELL];
                currentCell.metadata[METADATA_CURRENT_CELL] = true;
                previousCell = currentCell;
                yield;
            }
            delete previousCell.metadata[METADATA_CURRENT_CELL];
        }
    },
    [ALGORITHM_KRUSKAL]: {
        metadata: {
            'description': 'Kruskal',
            'maskable': true,
            'shapes': [SHAPE_SQUARE]
        },
        fn: function*(grid, config) {
            "use strict";
            const {random} = config;

            const links = [],
                connectedSets = {};
            grid.forEachCell(cell => {
                const
                    eastNeighbour = cell.neighbours[DIRECTION_EAST],
                    southNeighbour = cell.neighbours[DIRECTION_SOUTH];

                if (eastNeighbour) {
                    links.push([cell, eastNeighbour]);
                }
                if (southNeighbour) {
                    links.push([cell, southNeighbour]);
                }
                cell.metadata[METADATA_SET_ID] = cell.id;
                connectedSets[cell.id] = [cell];
            });

            random.shuffle(links);

            function mergeSets(id1, id2) {
                connectedSets[id2].forEach(cell => {
                    cell.metadata[METADATA_SET_ID] = id1;
                    connectedSets[id1].push(cell);
                });
                delete connectedSets[id2];
            }

            let previousCell1, previousCell2;
            grid.forEachCell(cell => cell.metadata[METADATA_UNPROCESSED_CELL] = true);
            while (links.length) {
                const [cell1, cell2] = links.pop(),
                    id1 = cell1.metadata[METADATA_SET_ID],
                    id2 = cell2.metadata[METADATA_SET_ID];
                if (id1 !== id2) {
                    grid.link(cell1, cell2);
                    mergeSets(id1, id2);
                    if (previousCell1) {
                        delete previousCell1.metadata[METADATA_CURRENT_CELL]
                        delete previousCell2.metadata[METADATA_CURRENT_CELL]
                    }
                    delete cell1.metadata[METADATA_UNPROCESSED_CELL];
                    delete cell2.metadata[METADATA_UNPROCESSED_CELL];
                    cell1.metadata[METADATA_CURRENT_CELL] = true;
                    cell2.metadata[METADATA_CURRENT_CELL] = true;
                    [previousCell1, previousCell2] = [cell1, cell2];
                    yield;

                }
            }
            delete previousCell1.metadata[METADATA_CURRENT_CELL];
            delete previousCell2.metadata[METADATA_CURRENT_CELL];
        }
    }
};



