import {forEachContiguousPair} from './utils.js';
import {
    ALGORITHM_NONE, ALGORITHM_BINARY_TREE, ALGORITHM_SIDEWINDER, ALGORITHM_ALDOUS_BRODER, ALGORITHM_WILSON, ALGORITHM_HUNT_AND_KILL, ALGORITHM_RECURSIVE_BACKTRACK, ALGORITHM_KRUSKAL,
    METADATA_VISITED, METADATA_SET_ID,
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
        fn(grid, config) {}
    },
    [ALGORITHM_BINARY_TREE]: {
        metadata: {
            'description': 'Binary Tree',
            'maskable': false,
            'shapes': [SHAPE_SQUARE]
        },
        fn(grid, config) {
            "use strict";
            const {random} = config;

            grid.forEachCell(cell => {
                 const
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
            });
        }
    },
    [ALGORITHM_SIDEWINDER]: {
        metadata: {
            'description': 'Sidewinder',
            'maskable': false,
            'shapes': [SHAPE_SQUARE]
        },
        fn(grid, config) {
            "use strict";
            const {random} = config;

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
                }
            }
        }
    },
    [ALGORITHM_ALDOUS_BRODER]: {
        metadata: {
            'description': 'Aldous Broder',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn(grid, config) {
            "use strict";
            const {random} = config;
            let unvisitedCount = grid.cellCount, currentCell;

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

            const startCell = grid.randomCell();
            moveTo(startCell);

            while (unvisitedCount) {
                const nextCell = currentCell.neighbours.random();
                moveTo(nextCell);
            }

        }
    },
    [ALGORITHM_WILSON]: {
        metadata: {
            'description': 'Wilson',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn(grid, config) {
            "use strict";
            const {random} = config;

            function removeLoops(cells) {
                const latestCell = cells[cells.length - 1],
                    indexOfPreviousVisit = cells.findIndex(cell => cell === latestCell);
                if (indexOfPreviousVisit >= 0) {
                    cells.splice(indexOfPreviousVisit + 1);
                }
            }

            markAsVisited(grid.randomCell(isUnvisited));

            let currentCell;
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
                        currentPath.forEach(markAsVisited);
                        break;
                    }
                }
            }
        }
    },
    [ALGORITHM_HUNT_AND_KILL]: {
        metadata: {
            'description': 'Hunt and Kill',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn(grid, config) {
            "use strict";
            const {random} = config;

            let currentCell = grid.randomCell();
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
            }
        }
    },
    [ALGORITHM_RECURSIVE_BACKTRACK]: {
        metadata: {
            'description': 'Recursive Backtrack',
            'maskable': true,
            'shapes': [SHAPE_SQUARE, SHAPE_TRIANGLE, SHAPE_HEXAGON, SHAPE_CIRCLE]
        },
        fn(grid) {
            "use strict";
            const stack = [];
            let currentCell;

            function visitCell(nextCell) {
                const previousCell = currentCell;
                currentCell = nextCell;
                markAsVisited(currentCell);
                if (previousCell) {
                    grid.link(currentCell, previousCell);
                }
                stack.push(currentCell);
            }

            visitCell(grid.randomCell());

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
            }
        }
    },
    [ALGORITHM_KRUSKAL]: {
        metadata: {
            'description': 'Kruskal',
            'maskable': true,
            'shapes': [SHAPE_SQUARE]
        },
        fn(grid, config) {
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

            while (links.length) {
                const [cell1, cell2] = links.pop(),
                    id1 = cell1.metadata[METADATA_SET_ID],
                    id2 = cell2.metadata[METADATA_SET_ID];
                if (id1 !== id2) {
                    grid.link(cell1, cell2);
                    mergeSets(id1, id2);
                }
            }
        }
    }
};



